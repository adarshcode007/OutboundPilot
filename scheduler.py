"""
Background Cron Worker for Autonomous SDR Morning Drip.
Runs daily at a configured time (default 8:00 AM),
automatically pulling top-priority queued leads up to the daily quota limit with rate-limiting
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
    update_lead_status
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
    
    def get_status(self) -> Dict[str, Any]:
        """Returns live status of the scheduler daemon."""
        now = datetime.datetime.now()
        target_hour, target_minute = map(int, self.target_time.split(":"))
        next_run = now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
        if next_run <= now:
            next_run += datetime.timedelta(days=1)
        
        return {
            "scheduler_enabled": self.is_running,
            "target_time": self.target_time,
            "is_processing": self.is_processing,
            "last_run_date": self.last_run_date,
            "next_run_estimated": next_run.isoformat(),
        }
    
    async def execute_drip(self, force: bool = False) -> Dict[str, Any]:
        """
        Executes the morning drip: auto-picks top priority queued leads up to quota.
        """
        if self.is_processing:
            return {"status": "SKIPPED", "reason": "Already processing a batch"}
        
        self.is_processing = True
        today_str = datetime.date.today().isoformat()

        try:
            quota = get_daily_quota_stats()
            remaining = quota["remaining_today"]

            if remaining <= 0:
                print(f">> [Scheduler] Daily quota exhausted ({quota['used_today']}/{quota['daily_limit']}). Skipping.")
                self.last_run_date = today_str
                return {"status": "SKIPPED", "reason": "Daily quota exhausted", "quota": quota}
            
            queued = list_queued_leads(status="QUEUED", limit=remaining)
            if not queued:
                print(">> [Scheduler] no unexecuted leads in queue.")
                self.last_run_date = today_str
                return {"status": "IDLE", "reason": "No queued leads available"}
            
            print(f">> [Scheduler] Starting Morning SDR Drip for {len(queued)} leads (Remaining Quota: {remaining})...")
            
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
            print(f">> [Scheduler] Morning drip finished: {processed_count} leads ready in Morning Briefing.")
            return {"status": "COMPLETED", "processed_count": processed_count}

        finally:
            self.is_processing = False
    
    async def _scheduler_loop(self):
        """Asynchronous background loop checking every 30 seconds."""
        print(f">> [Scheduler] Daemon active. Daily drip scheduled for {self.target_time}.")
        self.is_running = True
        self._stop_event.clear()

        while not self._stop_event.is_set():
            now = datetime.datetime.now()
            current_hm = now.strftime("%H:%M")
            today_str = now.date().isoformat()

            if current_hm == self.target_time and self.last_run_date != today_str:
                print(f">> [Scheduler] Time reached ({current_hm}). Triggering autonomous morning drip...")
                await self.execute_drip()
            
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
