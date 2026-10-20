# Deploying CurrentGuard AI to Zoho Catalyst

CurrentGuard AI runs on **Catalyst AppSail** as a single app: the FastAPI backend also serves the built React dashboard, so there is **one live link** and no CORS setup.

## One-time requirements (Windows)
- [Node.js](https://nodejs.org) (LTS)
- [Python](https://python.org) 3.10 or newer
- A Zoho Catalyst account with a project created in the [console](https://console.catalyst.zoho.com)

## Deploy
Double-click **`deploy_catalyst.bat`** in the project folder. It will:

1. Install the Catalyst CLI (first time only)
2. Build the React dashboard (`frontend/` → `dist/`)
3. Put the backend, dashboard and Linux Python packages into `catalyst_build/`
4. Ask you to sign in to Zoho (first time only, opens your browser)
5. Ask you to pick your Catalyst project (first time only)
6. Deploy to AppSail and print your **live URL**

Run the same file again whenever you want to publish changes.

## How it works
| File | Purpose |
|---|---|
| `catalyst.json` | Tells the CLI this project has one AppSail service, `currentguard-ai` |
| `appsail/app-config.json` | Start command (`python3 -u run.py`), Python 3.11 stack, build folder, 512 MB memory |
| `backend/run.py` | Starts the server on the port Catalyst provides (`X_ZOHO_CATALYST_LISTEN_PORT`) |
| `backend/requirements-deploy.txt` | Runtime-only packages installed into the deploy folder |

The demo SQLite database is created in the server's temp folder and re-seeded automatically on every start.

## Demo logins
The dashboard's demo accounts are listed in `frontend/src/pages/Login.jsx` (for example `viewer` / `view123` for read-only access).

## Local development (unchanged)
Use `run_backend.bat` and `run_frontend.bat` as before.
