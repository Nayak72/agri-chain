import argparse
import asyncio
import getpass
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.mongodb import close_mongo_connection, connect_to_mongo, get_database


async def create_admin(email: str, password: str) -> None:
    await connect_to_mongo()
    db = get_database()
    now = datetime.now(timezone.utc)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": get_password_hash(password), "role": "ADMIN",
                  "is_active": True, "is_approved": True, "updated_at": now},
         "$setOnInsert": {"email": email, "full_name": "AgriChain Administrator", "phone": None, "created_at": now}},
        upsert=True,
    )
    await close_mongo_connection()
    print(f"Admin ready: {email}")


def main() -> None:
    parser = argparse.ArgumentParser(description="AgriChain administration CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("create-admin")
    args = parser.parse_args()
    if args.command == "create-admin":
        settings = get_settings()
        email = settings.admin_email or input("Admin email: ").strip()
        password = settings.admin_password or getpass.getpass("Admin password: ")
        if len(password) < 8:
            raise SystemExit("Admin password must be at least 8 characters")
        asyncio.run(create_admin(email, password))


if __name__ == "__main__":
    main()
