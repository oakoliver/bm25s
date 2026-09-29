/**
 * A seeded generator for an invented knowledge base: the docs of "Driftwood", a
 * fictional self-hosted job queue and scheduler. It gives search.ts a realistic
 * corpus of a few hundred paragraphs without shipping or reading any real data.
 * The same seed always produces the same corpus.
 */

export interface KbDoc {
  title: string;
  paragraphs: string[];
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SLOTS: Record<string, string[]> = {
  queue: ["emails", "thumbnails", "invoices", "webhooks-out", "reports", "search-reindex", "exports", "notifications"],
  n: ["3", "5", "8", "10", "16", "25", "50", "200"],
  ms: ["250", "500", "1500", "3000", "30000"],
  version: ["2.4", "2.5", "2.6", "3.0", "3.1"],
  env: ["DRIFTWOOD_DATABASE_URL", "DRIFTWOOD_REDIS_URL", "DRIFTWOOD_API_TOKEN", "DRIFTWOOD_LOG_LEVEL", "DRIFTWOOD_WORKERS", "DRIFTWOOD_METRICS_PORT"],
  code: ["DW-1042", "DW-1107", "DW-2210", "DW-3001", "DW-4018", "DW-5120"],
  cron: ["*/5 * * * *", "0 2 * * *", "0 */6 * * *", "30 9 * * 1-5"],
  db: ["PostgreSQL", "SQLite"],
  region: ["eu-west", "us-east", "ap-south"],
};

// One article per topic. Each template is filled several times with different slot values.
const TOPICS: [string, string[]][] = [
  ["Installing Driftwood", [
    "Driftwood ships as a single binary and a container image. Version {version} runs on Linux and macOS, and needs a {db} database for job state.",
    "Set {env} before the first start. The server refuses to boot without a database URL and prints the exact variable it could not read.",
    "For a quick trial, run the container with an embedded SQLite file. For production, point Driftwood at PostgreSQL so several servers can share one job table.",
    "The first start runs migrations automatically. Pass --no-migrate if your deployment runs schema changes as a separate step.",
    "Package managers lag behind releases. Pin the image tag to {version} instead of latest so a rolling restart never mixes versions.",
  ]],
  ["Queues and priorities", [
    "Every job belongs to a queue. The {queue} queue is created on first use, so there is nothing to declare up front.",
    "Priorities range from 0 to 9, and higher numbers run first within a queue. Jobs with equal priority run in the order they were enqueued.",
    "A queue can be paused from the dashboard or the CLI. Paused queues keep accepting jobs but no worker picks them up until the queue is resumed.",
    "Use separate queues for work with different latency needs. Keeping {queue} apart from bulk exports stops a large backfill from delaying user-facing jobs.",
    "Queue names are case-sensitive and may contain letters, digits, dots and dashes, up to 64 characters.",
  ]],
  ["Retries and backoff", [
    "A failed job is retried up to {n} times by default. Each attempt waits longer than the last, using exponential backoff with jitter.",
    "The first retry waits {ms} milliseconds. The delay doubles with every attempt and is capped at one hour, so a flaky dependency is not hammered.",
    "Throw a PermanentError from a handler to skip the remaining retries. Use it for failures that retrying cannot fix, such as a malformed payload.",
    "After the last retry a job moves to the dead-letter list of its queue. Dead jobs keep their payload, their error and the stack trace of every attempt.",
    "Retry a dead job from the dashboard, or requeue every dead job in {queue} with driftwood jobs retry --queue {queue} --dead.",
  ]],
  ["Scheduling recurring jobs", [
    "Recurring jobs use standard five-field cron syntax. The schedule {cron} is evaluated in UTC unless the schedule sets its own time zone.",
    "Only one server enqueues each scheduled run, even when several servers are online. Leadership is held with a lease in the database that renews every {ms} milliseconds.",
    "If the scheduler was down when a run was due, Driftwood enqueues one catch-up run on restart instead of replaying every missed tick.",
    "Disable a schedule without deleting it by setting enabled to false. Its history and next-run time are kept.",
    "Schedules are defined in driftwood.toml or through the API. Changes made through the API survive restarts and show up in the dashboard immediately.",
  ]],
  ["Workers and concurrency", [
    "A worker process runs {n} jobs at a time by default. Raise DRIFTWOOD_WORKERS for I/O-bound handlers and lower it for CPU-heavy work.",
    "Concurrency can also be limited per queue. Setting a limit of {n} on {queue} caps how many of its jobs run at once across the whole cluster.",
    "Workers send a heartbeat every few seconds. A job whose worker stops sending heartbeats is considered abandoned and is returned to its queue.",
    "Graceful shutdown waits for running jobs to finish, up to a timeout. Jobs still running at the deadline are released so another worker can pick them up.",
    "Handlers should be idempotent. A job can run twice if a worker crashes after finishing the work but before recording the result.",
  ]],
  ["Authentication and API tokens", [
    "Every API request needs a bearer token. Create one in the dashboard under Settings, then Tokens, and pass it in the Authorization header.",
    "Tokens are shown once. Driftwood stores only a hash, so a lost token cannot be recovered and has to be replaced.",
    "Rotate an API token by creating a new one, deploying it, and then revoking the old one. Both stay valid during the overlap.",
    "Scoped tokens limit what a client can do. A token with the enqueue scope can add jobs to {queue} but cannot read payloads or change schedules.",
    "Failed authentication returns 401 with error code {code}. Repeated failures from one address are rate limited for fifteen minutes.",
  ]],
  ["Webhooks", [
    "Driftwood can call a webhook when a job succeeds, fails permanently, or is retried. Configure the URL per queue in the dashboard.",
    "Webhook bodies are signed with HMAC-SHA256. Verify the Driftwood-Signature header against the raw request body before trusting the payload.",
    "A webhook that does not answer within {ms} milliseconds counts as failed, and delivery is retried with the same backoff as jobs.",
    "Each delivery carries a unique id. Store processed ids and ignore repeats, because a delivery can arrive more than once.",
  ]],
  ["Metrics and monitoring", [
    "Prometheus metrics are served on DRIFTWOOD_METRICS_PORT. The most useful series are queue depth, job latency and the failure rate per queue.",
    "Alert on queue depth growing for longer than ten minutes rather than on a fixed threshold. A deep queue that drains steadily is healthy.",
    "Job latency is measured from enqueue to start and from start to finish. A rising wait time with a steady run time means you need more workers.",
    "The dashboard keeps {n} days of per-minute history. Export metrics to your own monitoring stack for longer retention.",
    "Structured logs are written as JSON lines. Set DRIFTWOOD_LOG_LEVEL to debug to include payload sizes and the id of every attempt.",
  ]],
  ["Database and storage", [
    "With {db}, Driftwood keeps jobs, schedules and results in a handful of tables. Payloads larger than 256 KB should be stored elsewhere and referenced by key.",
    "The connection pool holds {n} connections per server. If you see error {code} with the message pool exhausted, raise the pool size or reduce worker concurrency.",
    "Completed jobs are deleted after seven days. Change the retention per queue if you need results for longer, for example for {queue}.",
    "Vacuum and index maintenance matter on busy PostgreSQL installs. The job table churns quickly, so tune autovacuum for it specifically.",
    "SQLite is fine for a single server with modest load. It does not support running several Driftwood servers against the same file.",
  ]],
  ["Backups and disaster recovery", [
    "Back up the database, not the servers. Driftwood servers are stateless, and a fresh server pointed at a restored database resumes where the old one stopped.",
    "Take a snapshot before every upgrade to {version} or later, because major versions can include migrations that are not reversible.",
    "After a restore, jobs that were running at snapshot time are returned to their queues. Make sure handlers tolerate running a job twice.",
    "For a cross-region standby, replicate the database to {region} and keep the standby servers stopped until you fail over.",
  ]],
  ["Upgrading", [
    "Minor releases are drop-in: replace the binary or image and restart servers one at a time. Workers on the old version keep processing jobs during the rollout.",
    "Major releases can change the payload envelope. Read the release notes for {version} before upgrading, and upgrade all servers before new clients.",
    "Run driftwood migrate --dry-run to print the pending schema changes without applying them.",
    "If an upgrade fails midway, restore the snapshot and run the previous version. Driftwood refuses to start against a schema newer than it understands.",
  ]],
  ["Command-line interface", [
    "The driftwood CLI talks to the API with the same tokens as any other client. Set DRIFTWOOD_API_TOKEN or pass --token.",
    "List the jobs in a queue with driftwood jobs list --queue {queue} --state failed. Add --json for output that scripts can parse.",
    "Enqueue a one-off job from the shell with driftwood enqueue {queue} --payload @job.json --priority 5.",
    "driftwood queues stats prints depth, throughput and failure rate for every queue, refreshed every {n} seconds with --watch.",
  ]],
  ["Troubleshooting", [
    "Error {code} means the worker could not reach the database. Check {env}, network policies and whether the pool is exhausted.",
    "Jobs stuck in the running state usually belong to a worker that was killed without a graceful shutdown. They are released after the heartbeat timeout.",
    "If scheduled jobs run twice, two servers probably disagree on the time. Keep clocks synchronized with NTP; the scheduler lease assumes clock drift under one second.",
    "A queue that never drains while workers look idle is often paused, or limited by a concurrency cap of zero. driftwood queues stats shows both.",
    "High memory use in a worker usually comes from large payloads held in memory. Store big inputs in object storage and pass a key instead.",
  ]],
  ["Limits and quotas", [
    "Payloads are limited to 256 KB and job names to 200 characters. Larger payloads are rejected with error {code}.",
    "The API accepts up to {n} requests per second per token by default. Batch enqueue endpoints accept up to 1,000 jobs in one request.",
    "A single queue can hold millions of pending jobs, but scheduling latency grows with depth on SQLite. PostgreSQL keeps latency flat with the bundled indexes.",
    "Hosted plans in {region} add per-organization quotas on workers and retention. Self-hosted installs have no quotas beyond your hardware.",
  ]],
];

const LEADS = ["", "", "", "", "Note: ", "Tip: ", "In production, ", "As of the current release, "];

function fill(template: string, rnd: () => number): string {
  const chosen: Record<string, string> = {};
  const lead = LEADS[Math.floor(rnd() * LEADS.length)]!;
  const body = template.replace(/\{(\w+)\}/g, (_, k: string) => {
    const opts = SLOTS[k]!;
    return (chosen[k] ??= opts[Math.floor(rnd() * opts.length)]!);
  });
  // "In production, " and friends continue the sentence, so lowercase its first word
  if (!lead.endsWith(", ") || /^(?:[A-Z]{2}|Driftwood|PostgreSQL|SQLite|Prometheus)/.test(body)) return lead + body;
  return lead + body[0]!.toLowerCase() + body.slice(1);
}

/** Build the knowledge base. Each article repeats its templates `rounds` times with fresh slot values. */
export function generateKnowledgeBase(seed = 7, rounds = 6): KbDoc[] {
  const rnd = mulberry32(seed);
  return TOPICS.map(([title, templates]) => {
    const paragraphs: string[] = [];
    const seen = new Set<string>();
    for (let r = 0; r < rounds; r++) {
      for (const t of templates) {
        const p = fill(t, rnd);
        if (!seen.has(p)) { seen.add(p); paragraphs.push(p); }
      }
    }
    return { title: `Driftwood docs: ${title}`, paragraphs };
  });
}
