"""
Background Cron Worker for Autonomous SDR Morning Drip with Self-Healing Catch-Up.

Features:
1. Scheduled 08:00 AM Execution: Automatically processes top-priority queued leads up to quota.
2. Self-Healing Cold-Start Catch-Up: If the backend was offline/sleeping at 08:00 AM (e.g. Render free tier),
   it checks PostgreSQL on startup/wake-up. If current_time >= 08:00 and today's batch == NOT_RUN,
   it runs the morning drip immediately upon startup or wake-up.
3. Durable PostgreSQL Audit: Every run (COMPLETED, SKIPPED, IDLE) is immutably logged in `scheduler_runs`.
"""

import asyncio
import datetime
import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
load_dotenv()

from queue_manager import (
    get_daily_quota_stats,
    list_queued_leads,
    update_lead_status,
    log_scheduler_run,
    has_drip_run_today,
    get_latest_drip_run_today
)
from graph import build_sdr_graph
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage

# Configuration defaults
DEFAULT_DRIP_TIME = os.getenv("CRON_DRIP_TIME", "08:00") # HH:MM format (24h)
DRIP_RATE_LIMIT_DELAY = float(os.getenv("DRIP_RATE_LIMIT_DELAY", "2.0"))

class SDRScheduler:
    def __init__(self, target_time: str = DEFAULT_DRIP_TIME):
        self.target_time = target_time
        self.is_running = False
        self.last_run_date: Optional[str] = None
        self.is_processing = False
        self._task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def should_run_drip(self) -> bool:
        """
        Evaluates whether the morning drip should execute:
        1. Check: current_time >= target_time (default "08:00").
        2. Check PostgreSQL: Has a drip batch been logged for today's date?
        3. Returns True if time >= 08:00 and today's batch == NOT_RUN.
        """
        now = datetime.datetime.now()
        try:
            target_hour, target_minute = map(int, self.target_time.split(":"))
        except Exception:
            target_hour, target_minute = 8, 0

        scheduled_time_today = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)

        # 1. Condition: Has the scheduled time arrived or passed today?
        if now < scheduled_time_today:
            return False

        # 2. Condition: Check PostgreSQL ledger for today's run
        try:
            already_run = has_drip_run_today()
            return not already_run
        except Exception as e:
            print(f">> [Scheduler] Warning: Error checking PostgreSQL for today's run ({e}). Falling back to in-memory check.")
            today_str = now.date().isoformat()
            return self.last_run_date != today_str

    async def check_and_catchup(self) -> Optional[Dict[str, Any]]:
        """
        Self-healing catch-up logic:
        If current_time >= 08:00 and today's batch == NOT_RUN in PostgreSQL,
        runs the morning drip immediately upon startup or wake-up.
        """
        if self.is_processing:
            return None

        if self.should_run_drip():
            now = datetime.datetime.now()
            current_hm = now.strftime("%H:%M")
            print(f">> [Scheduler] ⚡ Self-healing catch-up triggered!")
            print(f">> [Scheduler] Time is {current_hm} (>= {self.target_time}) and today's batch is NOT_RUN in PostgreSQL.")
            print(f">> [Scheduler] Running morning drip immediately upon startup or wake-up...")
            return await self.execute_drip(force=False, is_catchup=True)

        return None

    def get_status(self) -> Dict[str, Any]:
        """Returns live status of the scheduler daemon and PostgreSQL drip ledger."""
        now = datetime.datetime.now()
        try:
            target_hour, target_minute = map(int, self.target_time.split(":"))
        except Exception:
            target_hour, target_minute = 8, 0

        next_run = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
        if next_run <= now:
            next_run += datetime.timedelta(days=1)

        try:
            db_has_run = has_drip_run_today()
            latest_run = get_latest_drip_run_today()
        except Exception:
            db_has_run = self.last_run_date == now.date().isoformat()
            latest_run = None

        return {
            "scheduler_enabled": self.is_running,
            "target_time": self.target_time,
            "is_processing": self.is_processing,
            "has_run_today": db_has_run,
            "latest_run_today": latest_run,
            "should_catchup": self.should_run_drip(),
            "last_run_date": self.last_run_date or (latest_run["run_date"] if latest_run else None),
            "next_run_estimated": next_run.isoformat(),
        }

    async def execute_drip(self, force: bool = False, is_catchup: bool = False) -> Dict[str, Any]:
        """
        Executes the morning drip: pulls top priority queued leads up to quota,
        runs LangGraph pipelines, and commits an audit checkpoint to PostgreSQL.
        """
        if self.is_processing:
            return {"status": "SKIPPED", "reason": "Already processing a batch"}

        # Prevent duplicate execution on normal automated runs
        if not force:
            try:
                if has_drip_run_today():
                    print(">> [Scheduler] Today's drip has already been executed according to PostgreSQL. Skipping.")
                    return {"status": "SKIPPED", "reason": "Already completed in PostgreSQL today"}
            except Exception:
                pass

        self.is_processing = True
        today_date = datetime.date.today()
        today_str = today_date.isoformat()

        try:
            quota = get_daily_quota_stats()
            remaining = quota["remaining_today"]

            if remaining <= 0:
                print(f">> [Scheduler] Daily quota exhausted ({quota['used_today']}/{quota['daily_limit']}). Skipping.")
                self.last_run_date = today_str
                log_scheduler_run(
                    status="SKIPPED",
                    leads_processed=0,
                    details={"reason": "Daily quota exhausted", "quota": quota, "is_catchup": is_catchup}
                )
                return {"status": "SKIPPED", "reason": "Daily quota exhausted", "quota": quota}

            queued = list_queued_leads(status="QUEUED", limit=remaining)
            if not queued:
                print(">> [Scheduler] No unexecuted leads in queue.")
                self.last_run_date = today_str
                log_scheduler_run(
                    status="IDLE",
                    leads_processed=0,
                    details={"reason": "No queued leads available", "is_catchup": is_catchup}
                )
                return {"status": "IDLE", "reason": "No queued leads available"}

            trigger_reason = "Catch-up Drip" if is_catchup else "Scheduled Morning Drip"
            print(f">> [Scheduler] Starting {trigger_reason} for {len(queued)} leads (Remaining Quota: {remaining})...")

            graph = build_sdr_graph(
                checkpointer=MemorySaver(),
                interrupt_before=['dispatcher'],
            )

            processed_count = 0
            for idx, lead in enumerate(queued, 1):
                lead_id = lead['id']
                company = lead.get("company", "Target")
                role = lead.get("role", "Target Role")
                print(f"  [Lead {idx}/{len(queued)}] Processing {company} ({role})...")

                update_lead_status(lead_id, status="PROCESSING")
                thread_id = f"cron_{lead_id[:8]}"
                thread_config = {"configurable": {"thread_id": thread_id}}

                initial_state = {
                    "messages": [HumanMessage(content=f"Launch morning outreach for {lead.get('contact_name', 'Contact')} at {company}")],
                    "target_company": company,
                    "target_role": role,
                    "target_contact_name": lead.get("contact_name", "Target"),
                    "target_contact_email": lead.get("contact_email", "target@company.com"),
                    "research_summary": "",
                    "icp_fit_score": 0,
                    "icp_rationale": "",
                    "email_draft": "",
                    "next_step": "researcher",
                    "approval_status": "PENDING",
                }

                try:
                    graph.invoke(initial_state, config=thread_config)
                    snapshot = graph.get_state(thread_config)
                    values = snapshot.values

                    is_disqualified = values.get("icp_fit_score", 0) < 5
                    final_status = "DISQUALIFIED" if is_disqualified else "DRAFTED"

                    update_lead_status(
                        lead_id=lead_id,
                        status=final_status,
                        thread_id=thread_id,
                        research_summary=values.get("research_summary"),
                        icp_fit_score=values.get("icp_fit_score"),
                        icp_rationale=values.get("icp_rationale"),
                        email_draft=values.get("email_draft"),
                        eval_score=values.get("eval_score"),
                        eval_verdict=values.get("eval_verdict"),
                        eval_critique=values.get("eval_critique"),
                    )
                    processed_count += 1
                    print(f"    --> [{final_status}] | ICP: {values.get('icp_fit_score')}/10 | AI Judge: {values.get('eval_score')}/10")
                except Exception as e:
                    print(f"    --> [Error] Lead {company} failed: {e}")
                    update_lead_status(lead_id, status="FAILED")

                # Rate-limiting throttle buffer to protect Groq TPM
                await asyncio.sleep(DRIP_RATE_LIMIT_DELAY)

            self.last_run_date = today_str
            log_scheduler_run(
                status="COMPLETED",
                leads_processed=processed_count,
                details={"is_catchup": is_catchup, "queued_total": len(queued)}
            )
            print(f">> [Scheduler] Morning drip finished: {processed_count} leads ready in Morning Briefing.")
            return {"status": "COMPLETED", "processed_count": processed_count, "is_catchup": is_catchup}

        finally:
            self.is_processing = False

    async def _scheduler_loop(self):
        """Asynchronous background loop checking every 30 seconds with self-healing catch-up."""
        print(f">> [Scheduler] Daemon active. Daily drip scheduled for >= {self.target_time}.")
        self.is_running = True
        self._stop_event.clear()

        # Immediate self-healing catch-up check on startup or container wake-up
        try:
            await self.check_and_catchup()
        except Exception as e:
            print(f">> [Scheduler] Error during initial catch-up check: {e}")

        while not self._stop_event.is_set():
            try:
                await self.check_and_catchup()
            except Exception as e:
                print(f">> [Scheduler] Error during periodic catch-up check: {e}")

            try:
                await asyncio.wait_for(self._stop_event.wait(), timeout=30.0)
            except asyncio.TimeoutError:
                pass

        self.is_running = False
        print(">> [Scheduler] Daemon stopped.")

    def start(self):
        """Starts the background worker task."""
        if self.is_running:
            return
        self._task = asyncio.create_task(self._scheduler_loop())

    def stop(self):
        """Signals the background worker task to stop."""
        self._stop_event.set()
        if self._task and not self._task.done():
            self._task.cancel()
        self.is_running = False

# Global Singleton instance
scheduler = SDRScheduler()

if __name__ == "__main__":
    async def main():
        print(">> [SDR Scheduler Standalone Runner]")
        status = scheduler.get_status()
        print(f">> Initial Status: {status}")
        scheduler.start()
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n>> Stopping scheduler...")
            scheduler.stop()
    asyncio.run(main())
