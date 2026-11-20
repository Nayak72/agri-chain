# Render Free Backend Keep-Alive Guide

This guide documents the external heartbeat mechanism configured for AgriChain's FastAPI backend deployed on **Render Free Web Service**, with the frontend hosted on **Vercel** and database on **MongoDB Atlas**.

---

## 1. Overview & Render Free Spin-Down Mechanics

Render's Free Web Service tier includes an automatic spin-down mechanism:
- **Inactivity Window:** If a free instance receives no incoming HTTP traffic for **15 consecutive minutes**, Render automatically puts the service into a dormant/sleep state.
- **Cold Starts:** When a subsequent HTTP request arrives after spin-down, Render spins the container back up. This cold start typically introduces a latency delay of **50 to 90 seconds**, during which user requests to the frontend appear sluggish or time out.
- **Background Worker Disruption:** AgriChain's cold-chain simulator runs an asynchronous background loop inside the FastAPI process. When Render suspends the container due to inactivity, the simulator stops emitting telemetric readings until the backend is awakened again.

To prevent this 15-minute inactivity spin-down, an external heartbeat sends a lightweight HTTP `GET` request every **10 minutes** to keep the container awake.

---

## 2. Architecture & Request Flow

```
External Scheduler (GitHub Actions or cron-job.org)
          |
          | Every 10 minutes (GET request)
          v
Render FastAPI Backend (https://<app>.onrender.com)
          |
          | GET /health/live (Zero DB queries, memory-only)
          v
HTTP 200 {"status": "ok"}
```

### Key Architectural Characteristics:
- **Independent of Vercel:** The heartbeat scheduler runs entirely outside Vercel. It requires no open browser sessions, no active web clients, and zero frontend involvement.
- **Zero Database Load:** The target endpoint is `/health/live` (defined in `backend/app/main.py`), which immediately returns `{"status": "ok"}` without accessing MongoDB Atlas or pinging database connection pools. (In contrast, `/health/ready` connects to MongoDB and should **never** be used for frequent pings).
- **Zero Ledger & Simulation Mutation:** The liveness probe does not alter shipment state, simulator ticks, cryptographic hashes, or database records.

---

## 3. GitHub Actions Setup

AgriChain includes a dedicated GitHub Actions workflow located at:
[`.github/workflows/render-keepalive.yml`](file:///.github/workflows/render-keepalive.yml)

### A. Workflow Specifications
- **Schedule:** `cron: '7,17,27,37,47,57 * * * *'` (runs every 10 minutes at non-zero minute offsets to avoid peak GitHub Actions scheduler queue delays).
- **Manual Trigger:** Supports manual on-demand execution via `workflow_dispatch`.
- **Security:** Requires `RENDER_HEALTH_URL` stored as an encrypted GitHub repository secret. Never hardcode the live backend URL into source control.
- **Resilience:** Configured with `--retry 1 --retry-delay 3 --max-time 90` to comfortably accommodate potential cold starts without failing the workflow.

### B. Adding the Repository Secret
Once your FastAPI backend is deployed on Render:
1. Open your repository on GitHub.
2. Navigate to **Settings** > **Secrets and variables** > **Actions**.
3. Under the **Repository secrets** section, click **New repository secret**.
4. Set the **Name** to:
   ```text
   RENDER_HEALTH_URL
   ```
5. Set the **Value** to your backend's HTTPS liveness URL:
   ```text
   https://YOUR-RENDER-SERVICE.onrender.com/health/live
   ```
   *(Replace `YOUR-RENDER-SERVICE` with your actual Render service subdomain. Ensure it starts with `https://` and ends with `/health/live`).*
6. Click **Add secret**.

### C. Manually Testing the Workflow
1. Go to the **Actions** tab in your GitHub repository.
2. In the left sidebar, click **Render backend heartbeat (10 minutes)**.
3. Click the **Run workflow** dropdown on the right side.
4. Select branch `main` and click the green **Run workflow** button.
5. Once the run completes, click into the job details and inspect the step **Request FastAPI liveness endpoint**.
6. Successful output should display:
   ```text
   Health check HTTP status: 200
   ```

### D. Troubleshooting Failed Workflow Runs
- `Missing GitHub Actions secret: RENDER_HEALTH_URL`:
  - **Cause:** The repository secret has not been created or the name contains typos.
  - **Resolution:** Re-check **Settings** > **Secrets and variables** > **Actions** and ensure the secret name is exactly `RENDER_HEALTH_URL`.
- `RENDER_HEALTH_URL must be an HTTPS URL`:
  - **Cause:** The secret starts with `http://` or omits the protocol.
  - **Resolution:** Render provides managed SSL certificates; always use `https://`.
- `curl: (22) The requested URL returned error: 404`:
  - **Cause:** Path is incorrect.
  - **Resolution:** Ensure the URL path ends with `/health/live`, not `/health` or `/api/v1/health`.
- `curl: (28) Operation timed out after 90000 milliseconds`:
  - **Cause:** Render service is experiencing an extended cold start or deployment stall.
  - **Resolution:** Check your Render dashboard to verify if the deployment is healthy and not failing during startup.

---

## 4. Alternative Free Scheduler: cron-job.org

If your repository is **private**, note that GitHub Actions allocates 2,000 free runner minutes per month. A job running every 10 minutes produces ~4,320 runs per month (~4,320 billed minutes), which will consume your monthly GitHub Actions allowance.

For private repositories, **[cron-job.org](https://cron-job.org/en/)** is an excellent, free, external scheduler alternative that uses zero GitHub Actions quota.

### Configuration on cron-job.org:
1. Create a free account at [https://cron-job.org/en/](https://cron-job.org/en/).
2. Click **Create Cronjob**.
3. Fill in the job details:
   - **Title:** `AgriChain Render Heartbeat`
   - **URL:** `https://YOUR-RENDER-SERVICE.onrender.com/health/live`
   - **Request Method:** `GET`
   - **Execution Schedule:** Every `10` minutes (or cron: `*/10 * * * *`)
   - **Request Timeout:** `90` seconds (to accommodate cold starts)
   - **Failures / Notifications:** Enable email alerts if 3 consecutive failures occur.
4. Click **Create**.

> [!IMPORTANT]
> **Choose Only One Scheduler:** Do not run both GitHub Actions and cron-job.org simultaneously. Running both generates duplicate traffic without providing additional keep-alive benefit.

---

## 5. Important Hosting Limitations

While keeping the container awake every 10 minutes minimizes ordinary idle spin-downs, keep the following platform constraints in mind:

1. **Best-Effort Keep-Alive:**
   - This heartbeat is a best-effort mitigation; it **does not provide guaranteed 24/7 uptime**.
   - Render Free services are not high-availability production clusters.
2. **Render 750 Free Instance Hours Limit:**
   - Render accounts receive 750 free instance hours per calendar month across all free web services.
   - A single service running continuously 24 hours x 31 days consumes 744 hours. If you host multiple free services on the same Render account, they share this 750-hour pool and will spin down once the monthly allowance is exhausted until the next billing cycle.
3. **Routine Container Restarts & Deployments:**
   - Render periodically restarts free containers for host OS updates, platform maintenance, or when you trigger a deployment commit.
4. **GitHub Actions Scheduler Jitter:**
   - Scheduled GitHub Actions workflows run on shared compute queues. During peak traffic hours across GitHub, scheduled runs can experience queue latency of 5 to 15 minutes, or occasionally be dropped.
5. **Simulator Lifecycle:**
   - AgriChain's background cold-chain simulator requires an active Python event loop. If Render restarts or suspends the instance, the simulator worker halts until the next startup cycle.
6. **MongoDB Atlas Inactivity:**
   - MongoDB Atlas M0 free clusters have independent pause policies for prolonged inactivity. The `/health/live` endpoint intentionally does not query MongoDB, so database connectivity remains isolated.
7. **Production Monitoring:**
   - A simple HTTP ping is not a substitute for synthetic uptime monitors, application performance management (APM), or error tracking (e.g. Sentry, Datadog, Better Stack).

