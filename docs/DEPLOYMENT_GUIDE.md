# AgriChain Production Deployment Guide: Vercel + Render + MongoDB Atlas

This guide walks you step-by-step through deploying the AgriChain agricultural supply-chain and cold-chain monitoring system to cloud production using **Vercel** (Frontend), **Render** (FastAPI Backend), and **MongoDB Atlas** (Database replica set), with **GitHub Actions** providing an automated 10-minute keep-alive ping.

---

## Architecture Overview

```
                                      +------------------------------------+
                                      |           Browser Client           |
                                      +------------------------------------+
                                           |                         |
                                           | Static Assets & SPA     | /api/v1/*, /health/*, /uploads/*
                                           | Routing (HTML/JS/CSS)   | (Proxied via vercel.json)
                                           v                         v
                                +---------------------+    +------------------------------------+
                                |    Vercel (Free)    |    |      Render Web Service (Free)     |
                                | React / Vite SPA    |    |  FastAPI Backend (Uvicorn)         |
                                | Root: frontend      |    |  Root: backend                     |
                                +---------------------+    |  Worker: Cold-Chain Simulator      |
                                                           +------------------------------------+
                                                                     |
                                                                     | mongodb+srv:// (Replica Set)
                                                                     | Multi-document Transactions
                                                                     v
+-------------------------------+                          +------------------------------------+
|     GitHub Actions Cron       |------------------------->|       MongoDB Atlas (M0 Free)      |
| Heartbeat every 10 min        |  GET /health/live        |   3-Node Replica Set Cluster       |
| (.github/workflows/keepalive) |                          |   Database: agri_chain_demo        |
+-------------------------------+                          +------------------------------------+
```

---

## Part A — Prerequisites

Before starting, make sure you have:

1. **GitHub Account**: Access to your AgriChain repository on GitHub.
2. **MongoDB Atlas Account**: Register at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
3. **Render Account**: Register at [render.com](https://render.com) (sign up with GitHub).
4. **Vercel Account**: Register at [vercel.com](https://vercel.com) (sign up with GitHub).
5. **Local Development Tools**: Git, Node.js (v18+), Python (3.12+), and npm installed.

### Verify Project Structure
Ensure your repository matches the expected structure:
```text
agri-chain/
├── .github/
│   └── workflows/
│       └── render-keepalive.yml     # 10-minute Render health check
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI app factory with lifespan & /health routes
│   │   ├── core/config.py           # Pydantic Settings & CORS parser
│   │   ├── db/mongodb.py            # Motor async MongoDB client & replica verification
│   │   └── services/simulation_worker.py # Background sensor simulator task
│   ├── scripts/seed_demo.py         # Demo account seeder
│   ├── .python-version              # Pinned Python version (3.12.11)
│   ├── .env.example                 # Production environment template
│   └── requirements.txt             # Pinned backend dependencies
├── frontend/
│   ├── src/                         # React SPA source code
│   ├── package.json                 # Frontend dependencies & scripts
│   ├── vercel.json                  # Vercel proxy rewrites & SPA router fallback
│   ├── vite.config.js               # Vite build configuration
│   └── .env.example                 # Frontend environment template
└── render.yaml                      # Render Blueprint specification
```

---

## Part B — MongoDB Atlas Setup

AgriChain requires multi-document transactions for inventory operations, batch creation, and audit-ledger appending. MongoDB Atlas free tier (M0) is automatically configured as a 3-node replica set, which fully supports multi-document transactions.

### 1. Create an Atlas Organization & Project
1. Log into your MongoDB Atlas dashboard.
2. Click the organization dropdown at the top left and select **Create Organization** (or use your existing one).
3. Click **New Project**, name it `AgriChain`, and click **Create Project**.

### 2. Deploy a Free M0 Cluster
1. On the project overview page, click **Create**.
2. Select the **M0 (Free)** tier.
3. Choose a cloud provider and region closest to your Render service (e.g., **AWS / us-east-1 (N. Virginia)** or **AWS / us-west-2 (Oregon)**).
4. Enter a cluster name, e.g., `agrichain-cluster`.
5. Click **Create Deployment**.

### 3. Create a Database User
1. In the left navigation menu under **Security**, click **Database Access**.
2. Click **Add New Database User**.
3. Authentication Method: **Password**.
4. Set **Username**: e.g. `agrichain_app_user`.
5. Set **Password**: Click **Autogenerate Secure Password** or create a strong password. **Copy and save this password securely**.
6. Under **Database User Privileges**, select **Read and write to any database** (built-in role `readWriteAnyDatabase@admin`).
7. Click **Add User**.

### 4. Configure Network Access (IP Access List)
Render Free Web Services use dynamic outbound IP addresses that change over time.
1. In the left navigation menu under **Security**, click **Network Access**.
2. Click **Add IP Address**.
3. For initial setup and testing with Render's shared dynamic IPs, select **Allow Access from Anywhere** (`0.0.0.0/0`).
4. (Optional / Recommended for Production): If you upgrade Render to a paid tier or use a dedicated outbound static IP gateway, replace `0.0.0.0/0` with the specific static IPs.
5. Enter a comment such as `Render Web Service dynamic outbound` and click **Confirm**.

> [!WARNING]
> While `0.0.0.0/0` enables Render's free tier to reach Atlas, ensure your database user has a long, cryptographically random password (32+ characters) and never grant administrative cluster permissions to the application user.

### 5. Obtain Connection String
1. In the left navigation menu under **Deployment**, click **Database**.
2. Click the **Connect** button next to your cluster.
3. Select **Drivers**.
4. Driver: **Python**, Version: **3.12 or later**.
5. Copy the SRV connection string:
   ```text
   mongodb+srv://agrichain_app_user:<password>@agrichain-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Replace `<password>` with the password you created in Step 3.
7. Note the target database name: `agri_chain_demo` (or `agri_chain`).

---

## Part C — Render Backend Deployment

Deploy the FastAPI backend as a Python Web Service on Render.

### Option 1: Automatic Blueprint Deployment (Recommended)
1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub repository `agri-chain`.
4. Render detects the root `render.yaml` file automatically.
5. In the Blueprint form:
   - Provide `MONGODB_URI`: paste your full Atlas SRV connection string.
   - Set `CORS_ORIGINS`: `https://YOUR-APP.vercel.app` (you can update this after Vercel gives you your URL).
6. Click **Apply**. Render will provision and deploy the service.

---

### Option 2: Manual Web Service Setup
If you prefer configuring via the Render Dashboard manually:

1. In Render Dashboard, click **New +** > **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your repo.
3. Configure the following fields:

| Field | Exact Value | Notes |
|---|---|---|
| **Name** | `agrichain-backend` | Will generate `https://agrichain-backend.onrender.com` |
| **Region** | `Oregon (US West)` | Pick the region closest to your MongoDB Atlas cluster |
| **Branch** | `main` | Production deployment branch |
| **Root Directory** | `backend` | **Crucial**: Points to the FastAPI root |
| **Runtime** | `Python` | Python 3.12 runtime |
| **Build Command** | `pip install -r requirements.txt` | Installs pinned dependencies |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` | Uses Render's dynamic `$PORT` |
| **Instance Type** | `Free` | 512 MB RAM, 0.1 CPU |

4. Scroll down to **Advanced** and set:
   - **Health Check Path**: `/health/live`
   - **Auto-Deploy**: `Yes`

5. Add Environment Variables under **Environment**:

| Key | Value | Purpose |
|---|---|---|
| `PYTHON_VERSION` | `3.12.11` | Ensures supported Python 3.12 release |
| `APP_ENV` | `production` | Enables production security & JWT checks |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority` | Atlas connection string |
| `DATABASE_NAME` | `agri_chain_demo` | Database name |
| `JWT_SECRET_KEY` | *(Click "Generate" or enter a 32+ char random string)* | Production JWT signing secret |
| `JWT_ALGORITHM` | `HS256` | Token algorithm |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | 8-hour token expiration |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` | Vercel domain (or temporary `*` during first setup) |
| `ALLOW_STANDALONE_DEV` | `false` | Strictly enforces replica set transactions |
| `UPLOAD_DIRECTORY` | `uploads` | Local upload directory |
| `LOG_LEVEL` | `INFO` | Standard logging |

6. Click **Create Web Service**.
7. Monitor the build logs. Once deployed, note your service URL:
   `https://<YOUR-RENDER-HOST>.onrender.com`

---

## Part D — Vercel Frontend Deployment

Deploy the React/Vite SPA on Vercel and connect it to your Render backend via `frontend/vercel.json` rewrites.

### 1. Update Render Hostname in `frontend/vercel.json`
Before deploying or pushing to Vercel, replace the placeholder in `frontend/vercel.json` with your real Render hostname:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://agrichain-backend.onrender.com/api/:path*"
    },
    {
      "source": "/health/:path*",
      "destination": "https://agrichain-backend.onrender.com/health/:path*"
    },
    {
      "source": "/uploads/:path*",
      "destination": "https://agrichain-backend.onrender.com/uploads/:path*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
*(Replace `agrichain-backend.onrender.com` with your exact Render service URL).*

Commit and push this change to your repository:
```bash
git add frontend/vercel.json
git commit -m "chore: configure production render backend url in vercel rewrites"
git push origin main
```

### 2. Import Project in Vercel
1. Log into [vercel.com](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your `agri-chain` repository.
4. In the **Configure Project** screen:
   - **Project Name**: `agrichain` (or your preferred name).
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click **Edit** and select `frontend`.
5. Expand **Build and Output Settings** (confirm defaults):
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
6. Expand **Environment Variables**:
   - Add `VITE_API_BASE_URL`: `/api/v1`
7. Click **Deploy**.
8. Once finished, Vercel gives you your production URL:
   `https://agrichain.vercel.app` (or similar).

### 3. Update Render CORS
Now that you have your Vercel URL:
1. Go to your Render Dashboard > `agrichain-backend` > **Environment**.
2. Update `CORS_ORIGINS` to match your Vercel URL:
   ```text
   https://agrichain.vercel.app
   ```
   *(If you also use custom preview domains, list them comma-separated: `https://agrichain.vercel.app, https://agrichain-git-main-yourname.vercel.app`).*
3. Render will automatically redeploy with the updated CORS policy.

---

## Part E — GitHub Keep-Alive Automation

Render Free Web Services spin down (sleep) after 15 minutes of inactivity. To keep your demonstration responsive and prevent long cold-start delays, AgriChain includes `.github/workflows/render-keepalive.yml`, which sends an HTTP GET request to `/health/live` every 10 minutes.

### 1. Add GitHub Actions Secret
1. Open your repository on GitHub.
2. Go to **Settings** > **Secrets and variables** > **Actions**.
3. Under **Repository secrets**, click **New repository secret**.
4. **Name**: `RENDER_HEALTH_URL`
5. **Secret**: `https://<YOUR-RENDER-HOST>.onrender.com/health/live`
   *(Example: `https://agrichain-backend.onrender.com/health/live`)*.
6. Click **Add secret**.

### 2. Test Keep-Alive Manually
1. In your GitHub repository, click the **Actions** tab.
2. In the left workflow list, click **Render backend heartbeat (10 minutes)**.
3. Click the **Run workflow** dropdown on the right and select the `main` branch.
4. Click **Run workflow**.
5. Refresh the page after 10-20 seconds and click the executing job.
6. Verify the step **Request FastAPI liveness endpoint** succeeds with:
   ```text
   Health check HTTP status: 200
   ```

### 3. Understand Free Tier Limitations
- **Scheduled Jitter**: GitHub Actions scheduled cron runs are provided on a best-effort basis and can occasionally experience delays during peak GitHub load.
- **Render Restarts**: Render Free instances restart once a month and may be terminated if memory limits (512 MB) are exceeded.
- **Monthly Free Hours**: Render Free provides 750 free hours per month for a single service. Running multiple free services concurrently on one account can consume hours before the end of the month.

---

## Part F — Seeding Demo Accounts Safely

The repository includes a repeatable seed script (`backend/scripts/seed_demo.py`) that provisions:
- Six demonstration users (Admin, Farmer, Warehouse Manager, Transporter, Driver, Buyer)
- A sample Nashik farm
- Produce catalog (Tomato)
- Cold-storage warehouse in Nashik
- Transport company, refrigerated vehicles, and drivers
- An initial produce batch with cryptographically linked ledger block

### Safety Guardrails
`seed_demo.py` strictly prohibits running in production environments. It validates:
```python
if settings.app_env not in ("development", "test") or not settings.database_name.startswith(("agri_chain_demo", "agri_chain_test", "agri_chain_it_")):
    raise RuntimeError("Demo seed requires development/test APP_ENV and an isolated agri_chain_demo* or agri_chain_test* database")
```

### How to Seed Your Atlas Demo Database
Run the seed script **from your local terminal** pointing to your Atlas cluster with `APP_ENV=development`:

```bash
cd backend

# Execute using python with environment variables:
APP_ENV=development \
DATABASE_NAME=agri_chain_demo \
MONGODB_URI="mongodb+srv://agrichain_app_user:<YOUR_PASSWORD>@agrichain-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority" \
python scripts/seed_demo.py
```

### Output:
```text
Connecting to MongoDB at mongodb+srv://[REDACTED]@agrichain-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
Connected to replica set: atlas-xxxxx-shard-0
Demo ready: six roles, Nashik tomato batch (2000 kg), Nashik cold warehouse, two reefers and drivers.
Demo passwords follow Role123! (for example, Admin123!).
```

### Seeded Demo Credentials

| Role | Email | Password | Full Name |
|---|---|---|---|
| **Administrator** | `admin@agrichain.com` | `Admin123!` | System Administrator |
| **Farmer** | `farmer1@agrichain.com` | `Farmer123!` | Nashik Farmer |
| **Warehouse Manager** | `warehouse1@agrichain.com` | `Warehouse123!` | Bengaluru Warehouse Manager |
| **Transporter** | `transporter1@agrichain.com` | `Transporter123!` | Cold Chain Transporter |
| **Driver** | `driver1@agrichain.com` | `Driver123!` | Reefer Driver |
| **Buyer** | `buyer1@agrichain.com` | `Buyer123!` | Bengaluru Buyer |

> [!IMPORTANT]
> If you ever deploy AgriChain for real production or public users, change these default passwords or register individual unique accounts.

---

## Part G — Verification & Smoke Testing

Once deployed, verify each layer of the infrastructure:

### 1. Render Health Checks
```bash
# Test Liveness (lightweight, no DB hit)
curl -i https://<YOUR-RENDER-HOST>.onrender.com/health/live
```
**Expected Response**:
```http
HTTP/2 200
content-type: application/json

{"status":"ok"}
```

```bash
# Test Readiness (checks MongoDB Atlas connectivity & replica-set transactions)
curl -i https://<YOUR-RENDER-HOST>.onrender.com/health/ready
```
**Expected Response**:
```http
HTTP/2 200
content-type: application/json

{"status":"ready","database":"connected","transactions":true}
```

### 2. Vercel Proxy Health Checks
```bash
# Test Proxy through Vercel
curl -i https://<YOUR-VERCEL-HOST>.vercel.app/health/live
```
**Expected Response**:
```http
HTTP/2 200
content-type: application/json

{"status":"ok"}
```

### 3. Vercel Frontend SPA Routing
Open the following URLs in your browser:
- `https://<YOUR-VERCEL-HOST>.vercel.app/login` (Should render the glassmorphic login interface).
- `https://<YOUR-VERCEL-HOST>.vercel.app/dashboard` (Direct navigation should redirect unauthenticated users to `/login`, not return a 404).

---

## Part H — Complete Demonstration Workflow (Smoke Test)

Follow these steps to demonstrate the full application lifecycle:

1. **Login as Farmer**:
   - URL: `https://<YOUR-VERCEL-HOST>.vercel.app/login`
   - Email: `farmer1@agrichain.com`, Password: `Farmer123!`
   - Verify: Lands on `/dashboard`, sidebar shows role **Farmer**.
   - Navigate to `/farms` to view "Nashik Tomato Farm".
   - Navigate to `/batches` to view demo batch `TOM-NAS-DEMO`.

2. **Login as Buyer & Create Purchase Order**:
   - Logout, login as `buyer1@agrichain.com` / `Buyer123!`.
   - Go to `/purchase-orders/new`.
   - Select batch `TOM-NAS-DEMO`, requested quantity `500 kg`, unit price `3000 paise` (₹30.00/kg).
   - Submit order.

3. **Login as Farmer to Accept**:
   - Login as `farmer1@agrichain.com`.
   - Go to `/purchase-orders`, click the order, click **Accept Order**.

4. **Book Freight & Submit Quote**:
   - Farmer or Buyer creates a Freight Booking at `/freight-bookings/new`.
   - Login as Transporter `transporter1@agrichain.com` / `Transporter123!`.
   - Go to `/freight-quotes`, submit a quotation with Reefer truck and rate.
   - Acceptance moves booking to ready for shipment creation.

5. **Create Shipment & Dispatch**:
   - Transporter creates shipment at `/shipments/new`.
   - Assigns vehicle `MH15RE0001` and driver `Reefer Driver 1`.
   - Executes status transitions: `LOAD` -> `DISPATCH` -> `START TRANSIT`.

6. **Cold-Chain Simulation**:
   - Go to `/cold-chain`.
   - Find the active `IN_TRANSIT` shipment.
   - Start session (e.g. `NORMAL` or `COOLING_FAILURE`).
   - Observe live sensor telemetry graphs polling every 5000 ms.
   - In `COOLING_FAILURE`, observe excursion alerts (WARNING / CRITICAL).
   - Transporter or Admin can acknowledge and resolve alerts.

7. **Delivery Confirmation & Ledger Audit**:
   - Driver or Transporter marks `ARRIVED_AT_DESTINATION` -> `OUT_FOR_DELIVERY`.
   - Buyer confirms delivery at `/deliveries`.
   - Navigate to `/ledger` to view cryptographically linked SHA-256 blocks and click **Verify Ledger** to prove data immutability.

---

## Part I — Troubleshooting Guide

### 1. Vercel Blank Page or 404 on Refresh
- **Cause**: Vercel is not routing SPA paths to `/index.html`.
- **Fix**: Verify `frontend/vercel.json` exists and includes:
  ```json
  { "source": "/(.*)", "destination": "/index.html" }
  ```
  Ensure Root Directory in Vercel project settings is set to `frontend`.

### 2. API Returns HTML Instead of JSON
- **Cause**: The rewrite in `frontend/vercel.json` still has the placeholder `REPLACE-WITH-RENDER-HOST.onrender.com` or points to an invalid host.
- **Fix**: Update `destination` in `frontend/vercel.json` to your actual Render URL (e.g. `https://agrichain-backend.onrender.com/api/:path*`), commit, and push.

### 3. Login Fails with 401 Unauthorized
- **Cause**: Demo user was not seeded, or wrong password was entered.
- **Fix**: Run `seed_demo.py` as detailed in Part F. Passwords are case-sensitive (e.g., `Admin123!`, `Farmer123!`).

### 4. CORS Error in Browser Console
- **Symptom**: `Access to fetch at ... from origin 'https://YOUR-APP.vercel.app' has been blocked by CORS policy`.
- **Fix**: Open Render Dashboard > Web Service > **Environment**. Add or update `CORS_ORIGINS` to `https://YOUR-APP.vercel.app` (without trailing slash).

### 5. Render Startup Failure: "MongoDB transactions required: run a replica set"
- **Cause**: Connecting to a standalone MongoDB instance or invalid replica set.
- **Fix**: Ensure your `MONGODB_URI` points to a MongoDB Atlas cluster (`mongodb+srv://...`). Atlas free tier clusters are always replica sets.

### 6. Render Timeout Connecting to MongoDB Atlas
- **Cause**: Atlas Network Access IP allowlist is blocking Render's outbound connection.
- **Fix**: In MongoDB Atlas, go to **Network Access** > **Add IP Address** > select **Allow Access from Anywhere** (`0.0.0.0/0`).

### 7. File Upload Disappears After Restart
- **Cause**: Render Free uses an ephemeral filesystem. Any files saved locally to `./uploads` are discarded when the service restarts or redeploys.
- **Fix / Recommendation**: This is expected for free hosting. Core supply-chain records, audit ledger, and sensor readings persist in MongoDB Atlas. For permanent asset hosting in production, configure an S3-compatible bucket (e.g., AWS S3 or Cloudflare R2).

### 8. Render Free Backend Sleeps / Delay on First Request
- **Cause**: Render Free puts instances to sleep after 15 minutes without incoming requests.
- **Fix**: The GitHub Actions keep-alive workflow (`render-keepalive.yml`) runs every 10 minutes to minimize sleep periods. If the instance has slept, allow 30-50 seconds for the initial wake-up request.

---

## Part J — Updating and Redeploying

When you push changes to your GitHub `main` branch:
1. **Render** automatically detects changes in `backend/`, runs `pip install -r requirements.txt`, and redeploys the web service.
2. **Vercel** automatically detects changes in `frontend/`, executes `npm ci` and `npm run build`, and updates the CDN globally.
3. Database records and ledger blocks in MongoDB Atlas remain persistent across deployments.

