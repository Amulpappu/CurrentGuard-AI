"""Production entry point (Zoho Catalyst AppSail or any host that sets a port).

Catalyst tells the app which port to listen on via X_ZOHO_CATALYST_LISTEN_PORT.
The SQLite demo database is kept in the system temp folder so it is always
writable; it is re-created and re-seeded automatically on every start.
"""
import os
import tempfile

os.environ.setdefault(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(tempfile.gettempdir(), "currentguard_stage2.db").replace("\\", "/"),
)
os.environ.setdefault("ENVIRONMENT", "production")

import uvicorn  # noqa: E402

if __name__ == "__main__":
    port = int(os.getenv("X_ZOHO_CATALYST_LISTEN_PORT", os.getenv("PORT", "8000")))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, log_level="info")
