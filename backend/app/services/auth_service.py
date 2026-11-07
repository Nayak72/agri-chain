from app.db.mongodb import get_database
from app.core.security import get_password_hash, verify_password, create_token_pair
from app.core.exceptions import ConflictError, UnauthorizedError, ValidationError
from datetime import datetime, timezone
from bson import ObjectId


class AuthService:
    @staticmethod
    async def register(user_data: dict):
        db = get_database()
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            raise ConflictError("Email already registered")

        if user_data.get("role") == "ADMIN":
            raise ValidationError("Cannot register as admin")

        hashed_password = get_password_hash(user_data["password"])
        user_doc = {
            "email": user_data["email"],
            "password_hash": hashed_password,
            "full_name": user_data["full_name"],
            "phone": user_data.get("phone"),
            "role": user_data["role"],
            "is_active": True,
            "is_approved": user_data["role"] != "TRANSPORTER",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        result = await db.users.insert_one(user_doc)
        return create_token_pair(str(result.inserted_id), user_data["email"], user_data["role"])

    @staticmethod
    async def login(email: str, password: str):
        db = get_database()
        user = await db.users.find_one({"email": email})
        if not user:
            raise UnauthorizedError("Invalid credentials")
        if not verify_password(password, user["password_hash"]):
            raise UnauthorizedError("Invalid credentials")
        if not user.get("is_active", True):
            raise UnauthorizedError("Account is deactivated")
        if not user.get("is_approved", True):
            raise UnauthorizedError("Account pending approval")
        return create_token_pair(str(user["_id"]), user["email"], user["role"])

    @staticmethod
    async def refresh(refresh_token: str):
        from app.core.security import decode_token
        payload = decode_token(refresh_token)
        if not payload or payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid refresh token")
        db = get_database()
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or not user.get("is_active", True):
            raise UnauthorizedError("User not found or inactive")
        return create_token_pair(str(user["_id"]), user["email"], user["role"])