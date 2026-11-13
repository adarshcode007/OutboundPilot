# System Design & Architecture Interview Log

## Question 1: Fault-Tolerant Queue Processing & Zombie Task Recovery

### The Scenario / Question
> **Scenario:** Worker A claims a lead from PostgreSQL, sets `status = 'PROCESSING'`, and starts an autonomous multi-step LLM pipeline (Researcher -> Analyst -> Copywriter -> Evaluator). Mid-way through execution, Worker A's container suffers an Out-Of-Memory (OOM) crash or is killed by the cloud host. 
> 
> The lead record in PostgreSQL is now permanently stuck at `status = 'PROCESSING'` and will never be picked up by any other worker (becoming a **"Zombie Task"**).
> 
> **Question:** What is the industry-standard architectural pattern to detect and recover orphaned tasks without double-processing or data corruption?

---

### The Production Solution: Leases & Visibility Timeouts with Dead-Letter Queues (DLQ)

#### 1. The Core Pattern: Visibility Timeout / Lease Heartbeat
In high-reliability message brokers and task queues (e.g. AWS SQS, Temporal, Celery, BullMQ):
- A task is **never deleted or locked permanently** when a worker picks it up.
- Instead, the worker claims a **time-bounded lease** (e.g. 5 minutes).

#### 2. Implementation in PostgreSQL
1. Add a `lease_expires_at` column to the queue table:
   ```sql
   ALTER TABLE lead_queue ADD COLUMN lease_expires_at TIMESTAMP;
   ALTER TABLE lead_queue ADD COLUMN retry_count INTEGER DEFAULT 0;
   ```

2. When a worker claims a lead, it sets `lease_expires_at` into the future:
   ```sql
   UPDATE lead_queue
   SET status = 'PROCESSING',
       lease_expires_at = NOW() + INTERVAL '5 minutes'
   WHERE id IN (
       SELECT id FROM lead_queue
       WHERE status = 'QUEUED' 
          OR (status = 'PROCESSING' AND lease_expires_at < NOW())
       ORDER BY priority_score DESC, created_at ASC
       LIMIT %s
       FOR UPDATE SKIP LOCKED
   )
   RETURNING *;
   ```

3. **Crash Recovery (Zero Human Intervention):**
   - If Worker A crashes at minute 1, the database lease naturally expires at minute 5.
   - At minute 6, Worker B runs the claim query. It sees `status = 'PROCESSING'` but `lease_expires_at < NOW()`.
   - Worker B claims the orphaned lead and completes the workflow.

#### 3. Edge-Case Guardrail: The "Poison Pill" & Dead-Letter Queue (DLQ)
What if the lead itself has malformed data or a prompt injection that causes **every** worker to crash on it?
- Every time a task's lease expires and is re-claimed, increment `retry_count += 1`.
- If `retry_count >= 3`, do not re-process. Move it to `status = 'FAILED_DLQ'` and send a high-priority Slack/PagerDuty alert to engineering.

---

### Why Alternative Proposals Fail in Interviews
* **Database Triggers on TCP Disconnect:** Web apps use database connection pooling (`psycopg_pool`). An application thread crash or OOM does not close the underlying pooled TCP connection cleanly.
* **In-Memory Tracking Dictionaries:** When a container is killed by OOM or host restart, RAM is completely wiped.
* **Marking as `DRAFTED` upfront:** Risks premature dispatch of empty or incomplete drafts to customers before the AI has finished writing them.

