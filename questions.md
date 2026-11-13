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

---

## Question 2: Multi-Tab Token Refresh Race Conditions in Single Page Applications (SPAs)

### The Scenario / Question
> **Scenario:** In an SPA with strict Refresh Token Rotation (where each refresh token is single-use and immediately revoked upon exchange), a user opens the web application across **3 different browser tabs** simultaneously.
> 
> When the access token expires, all 3 tabs attempt to make background API calls at the same time. Since each tab runs in an isolated JavaScript runtime, an in-memory Promise mutex in one tab is not shared with the other tabs. Each tab sends the same old refresh token in parallel.
> 
> **Question:** How do you architect a solution—either on the backend or frontend—so that multi-tab requests do not trigger false-positive token replay alarms and log the user out?

---

### The Production Solutions

#### 1. Backend Solution: Refresh Token Rotation Leeway / Grace Period (Auth0 / Okta Standard)
Instead of treating an already-rotated token as an immediate security breach:
* In the database, store `revoked_at TIMESTAMP` and `replaced_by VARCHAR` when a token is rotated.
* When a request arrives with an already-revoked refresh token, check:
  $$\text{NOW}() - \text{revoked\_at} \le 15\text{ seconds}$$
* **If within the 15-second grace period:** It is recognized as a benign multi-tab network race. Return the newly active token without revoking the session.
* **If after 15 seconds:** It is recognized as a genuine token replay / theft attack. Permanently revoke the entire token family and force re-authentication.

#### 2. Frontend Solution: Web Locks API (`navigator.locks`)
Modern browsers provide cross-tab locking via the native Web Locks API:
```javascript
// Coordinates all tabs of the same origin in the browser
await navigator.locks.request('auth_refresh_lock', async () => {
    // Only ONE tab executes the refresh endpoint at a time.
    // Tabs 2 and 3 wait for Tab 1 to rotate the cookie before making API calls.
    await performSilentRefresh();
});
```

---

## Question 3: Database Connection Pooling & Exhaustion in Production Microservices

### The Scenario / Question
> **Scenario:** An engineer designs a high-throughput backend service. In every API handler and background worker function, they open a direct database connection: `conn = psycopg.connect(...)`, execute a fast 3ms query, and immediately close it: `conn.close()`. 
> 
> Under load testing with 200 concurrent requests per second, the application latency spikes from 5ms to over 1,500ms, and PostgreSQL crashes with `FATAL: remaining connection slots are reserved for non-replication superuser connections`.
> 
> **Question:** Why is opening raw database connections on demand so computationally expensive for PostgreSQL, and how does a Connection Pool solve both the latency bottleneck and server crash?

---

### The Production Solutions

#### 1. Why Raw Connections are Catastrophic for PostgreSQL
Opening a new connection is not a memory reference—it is a heavy multi-step protocol:
1. **TCP 3-way handshake** over the network.
2. **TLS / SSL cryptographic negotiation**.
3. **Authentication exchange** (e.g. SCRAM-SHA-256 password hashing).
4. **PostgreSQL Process Fork:** PostgreSQL uses a process-based architecture (not thread-based). For every new connection, the OS kernel must fork an entire new backend operating system process (`postgres`), allocating 5–10MB of server RAM and internal query session memory.
* **The Cost:** Connecting takes **50ms to 200ms**, even if the SQL query itself takes only **2ms**! Under traffic, the database spends 95% of its CPU just forking OS processes and doing TLS handshakes until RAM is exhausted.

#### 2. How a Connection Pool Solves It (The "Pre-Warmed Taxi Stand")
* **Pre-warmed Connections:** On server boot, the pool initializes a bounded number of persistent connections (e.g., `max_size=12`) and keeps them warm.
* **Instant Checkout (0.1ms):** When a request arrives, `with pool.connection() as conn:` checks out an already-authenticated, connected socket in **0.1ms** (30x–100x faster).
* **Connection Reusability:** When the query finishes, the connection is **not closed**. It is sanitized and parked back into the pool for the next request.
* **Traffic Surge Buffer:** If 200 requests hit simultaneously, the pool queues them safely, running them through the 12 open connections in rapid succession rather than flooding PostgreSQL with 200 process forks.
* **Cloud Quota Safety:** Cloud database tiers (Render, Supabase, Neon, AWS Aurora Serverless) enforce strict maximum connection caps (often 20–50 connections). A centralized pool singleton ensures the application never exceeds the database's hard limit.

---

## Question 4: The "Serverless Connection Exhaustion" Trap & External Connection Pooling

### The Scenario / Question
> **Scenario:** In a traditional VM or Docker container (like our FastAPI app), an in-application connection pool (`psycopg_pool`, `max_size=12`) maintains a persistent, pre-warmed set of database connections in RAM.
> 
> However, an engineering team migrates the API to **Serverless / Auto-Scaling Functions** (AWS Lambda, Vercel Functions, Google Cloud Run). 
> 
> During a viral marketing campaign, 1,000 users hit the endpoints at the same time. The cloud provider spins up **1,000 isolated serverless container instances**. If each function instance initializes its own in-memory connection pool, thousands of connections attempt to open simultaneously ($1,000 \times 10 = 10,000$ connections), causing PostgreSQL to instantly crash.
> 
> **Question:** Why does the standard in-application connection pool fail in a Serverless / auto-scaling environment, and what architectural pattern or dedicated database component is introduced in production to solve this?

---

### The Production Solutions

#### 1. Why In-Application Pools Fail in Serverless
* **Stateless & Ephemeral Lifecycle:** Serverless functions are stateless, isolated, and short-lived. Memory is not shared across function instances.
* **No Pool Reuse Across Containers:** Lambda Instance A cannot share its in-memory connections with Lambda Instance B.
* **The Multiplication Effect:** If each instance creates a pool of 5–10 connections, a sudden spike of 500 concurrent functions creates $500 \times 10 = 5,000$ real connection attempts to PostgreSQL. PostgreSQL forks an OS process for each one, exhausting all server RAM and crashing.

```
Without an External Pooler (Serverless Anti-Pattern):
[Lambda 1] ---> (Pool: 10) ---\
[Lambda 2] ---> (Pool: 10) ----+---> [PostgreSQL] (5,000+ connections -> CRASH!)
[Lambda N] ---> (Pool: 10) ---/
```

#### 2. The Production Solution: External Database Proxy (PgBouncer / AWS RDS Proxy)
In modern cloud architectures, you do not let serverless functions connect directly to PostgreSQL. Instead, you introduce an **External / Out-of-Process Connection Pooler**:

* **Industry-Standard Tools:** **PgBouncer**, **AWS RDS Proxy**, **Supabase Supavisor**, or **Prisma Accelerate**.

```
With an External Connection Proxy (Production Standard):
[1,000 Lambda Functions]
           | (Fast, lightweight TCP connections)
           v
  [PgBouncer / AWS RDS Proxy]  <--- Multiplexes thousands of client connections
           | (Bounded pool: exactly 20-50 real PostgreSQL connections)
           v
     [PostgreSQL] (Stable, protected, CPU utilization remains low)
```

#### 3. How It Works: Transaction Pooling Mode
External proxies like PgBouncer operate in **Transaction Pooling** mode:
1. When Lambda #42 executes a query, PgBouncer assigns it a real PostgreSQL connection **only for the duration of that specific SQL transaction** (e.g. 3ms).
2. The instant the query completes (`COMMIT`), PgBouncer immediately detaches the connection and gives it to Lambda #99.
3. Because queries run in a few milliseconds while the rest of the Lambda function spends hundreds of milliseconds waiting on LLM APIs or network I/O, **1,000 serverless functions can easily be multiplexed across just 20–30 real PostgreSQL connections**!

#### 4. The Interview Caveat (What Interviewers Expect You to Know):
* In **Transaction Pooling mode**, features tied to the database session state (such as `LISTEN/NOTIFY`, temporary tables, or session-level `SET timezone`) cannot be safely used, because two consecutive queries from the same Lambda might execute over two different physical database connections.




