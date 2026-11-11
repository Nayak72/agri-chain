from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
from bson import ObjectId

from app.db.mongodb import get_database
from app.core.permissions import get_current_user, get_current_admin_user
from app.core.exceptions import NotFoundError, ValidationError, ForbiddenError, ConflictError
from app.core.constants import UserRole, LedgerEventType
from app.services.ledger_service import append_ledger_block
from app.db.unit_of_work import run_in_txn
from app.utils.serialization import to_response
from app.utils.mongo import to_mongo, resolve_doc
from app.schemas.validators import normalize_email, normalize_identifier

router = APIRouter()


class TransporterCreate(BaseModel):
    company_name: str = Field(...)
    contact_person: str = Field(...)
    email: str = Field(...)
    phone: str = Field(...)
    address: str = Field(...)
    city: str = Field(...)
    state: str = Field(...)
    pincode: str = Field(...)
    gst_number: Optional[str] = Field(None)
    license_number: Optional[str] = Field(None)
    bank_account: Optional[str] = Field(None)
    ifsc_code: Optional[str] = Field(None)
    model_config = ConfigDict(extra="forbid")


class TransporterUpdate(BaseModel):
    company_name: Optional[str] = Field(None)
    contact_person: Optional[str] = Field(None)
    email: Optional[str] = Field(None)
    phone: Optional[str] = Field(None)
    address: Optional[str] = Field(None)
    city: Optional[str] = Field(None)
    state: Optional[str] = Field(None)
    pincode: Optional[str] = Field(None)
    gst_number: Optional[str] = Field(None)
    license_number: Optional[str] = Field(None)
    bank_account: Optional[str] = Field(None)
    ifsc_code: Optional[str] = Field(None)
    # approval_status and is_active removed - system/admin managed only
    model_config = ConfigDict(extra="forbid")


class TransporterResponse(BaseModel):
    id: str
    transporter_id: str
    user_id: Optional[str] = None
    company_name: str
    contact_person: str
    email: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    gst_number: Optional[str] = None
    license_number: Optional[str] = None
    bank_account: Optional[str] = None
    ifsc_code: Optional[str] = None
    approval_status: str
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def generate_transporter_id() -> str:
    import uuid
    return f"TRN-{uuid.uuid4().hex[:8].upper()}"


@router.post("", response_model=TransporterResponse)
async def create_transporter(
    transporter_data: TransporterCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can create transporter profiles")
    
    clean_email = normalize_email(transporter_data.email)
    existing = await db.transporters.find_one({"email": clean_email})
    if existing:
        raise ConflictError("A transporter profile with this email already exists")
    
    clean_company = transporter_data.company_name.strip()
    existing_company = await db.transporters.find_one({"company_name": clean_company})
    if existing_company:
        raise ConflictError(f"A transporter company with name '{clean_company}' already exists")

    user_id = current_user["sub"] if current_user["role"] == UserRole.TRANSPORTER else None
    if user_id:
        existing_user_profile = await db.transporters.find_one({"user_id": user_id})
        if existing_user_profile:
            raise ConflictError("This user already has a registered transporter profile")
    
    transporter_id = generate_transporter_id()
    while await db.transporters.find_one({"transporter_id": transporter_id}):
        transporter_id = generate_transporter_id()
    
    now = datetime.now(timezone.utc)
    transporter_doc = {
        "transporter_id": transporter_id,
        "user_id": user_id,
        **transporter_data.model_dump(),
        "company_name": clean_company,
        "email": clean_email,
        "gst_number": normalize_identifier(transporter_data.gst_number),
        "license_number": normalize_identifier(transporter_data.license_number),
        "ifsc_code": normalize_identifier(transporter_data.ifsc_code),
        "approval_status": "PENDING" if current_user["role"] == UserRole.TRANSPORTER else "APPROVED",
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    
    result = await db.transporters.insert_one(to_mongo(transporter_doc))
    transporter_doc["_id"] = result.inserted_id
    
    return to_response(TransporterResponse, transporter_doc)


@router.get("", response_model=List[TransporterResponse])
async def list_transporters(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1),
    approval_status: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    query = {}
    if current_user["role"] == UserRole.TRANSPORTER:
        query["user_id"] = current_user["sub"]
    elif current_user["role"] != UserRole.ADMIN:
        query["approval_status"] = "APPROVED"
        query["is_active"] = True
    
    if approval_status and current_user["role"] == UserRole.ADMIN:
        query["approval_status"] = approval_status
    if is_active is not None and current_user["role"] == UserRole.ADMIN:
        query["is_active"] = is_active
    
    transporters = await db.transporters.find(query).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return [to_response(TransporterResponse, t) for t in transporters]


@router.get("/{transporter_id}", response_model=TransporterResponse)
async def get_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    transporter = await resolve_doc(db.transporters, transporter_id, "Transporter", business_key="transporter_id")
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to view this transporter profile")
    
    return to_response(TransporterResponse, transporter)


@router.patch("/{transporter_id}", response_model=TransporterResponse)
async def update_transporter(
    transporter_id: str,
    transporter_data: TransporterUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Strict RBAC: only the owning transporter or admin can update
    if current_user["role"] not in [UserRole.TRANSPORTER, UserRole.ADMIN]:
        raise ForbiddenError("Only transporters or admins can update transporter profiles")
    
    transporter = await resolve_doc(db.transporters, transporter_id, "Transporter", business_key="transporter_id")
    
    if current_user["role"] == UserRole.TRANSPORTER and transporter.get("user_id") != current_user["sub"]:
        raise ForbiddenError("Not authorized to update this transporter profile")
    
    update_data = transporter_data.model_dump(exclude_unset=True)
    if not update_data:
        raise ValidationError("No valid fields to update")
    
    if "email" in update_data:
        update_data["email"] = normalize_email(update_data["email"])
    if "gst_number" in update_data:
        update_data["gst_number"] = normalize_identifier(update_data["gst_number"])
    if "ifsc_code" in update_data:
        update_data["ifsc_code"] = normalize_identifier(update_data["ifsc_code"])
    if "license_number" in update_data:
        update_data["license_number"] = normalize_identifier(update_data["license_number"])

    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.transporters.update_one(
        {"_id": transporter["_id"]},
        {"$set": to_mongo(update_data)}
    )
    
    updated = await db.transporters.find_one({"_id": transporter["_id"]})
    return to_response(TransporterResponse, updated)


@router.post("/{transporter_id}/approve")
async def approve_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    transporter = await resolve_doc(db.transporters, transporter_id, "Transporter", business_key="transporter_id")
    now = datetime.now(timezone.utc)
    
    async def approve_transaction(session):
        result = await db.transporters.update_one(
            {"_id": transporter["_id"], "approval_status": {"$ne": "APPROVED"}},
            {"$set": {"approval_status": "APPROVED", "is_active": True, "updated_at": now}},
            session=session,
        )
        if result.matched_count == 0:
            raise ConflictError("Transporter is already approved")
        if transporter.get("user_id"):
            user_id = transporter["user_id"]
            await db.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_approved": True, "updated_at": now}}, session=session,
            )
            await append_ledger_block(
                db, event_type=LedgerEventType.USER_APPROVED,
                entity_type="USER", entity_id=user_id,
                actor_id=current_user["sub"], actor_role=current_user["role"],
                event_summary="Transporter user approved",
                payload={"user_id": user_id, "transporter_id": str(transporter["_id"])},
                session=session,
            )

    await run_in_txn(approve_transaction)
    
    return {"message": "Transporter approved successfully"}


@router.post("/{transporter_id}/reject")
async def reject_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    transporter = await resolve_doc(db.transporters, transporter_id, "Transporter", business_key="transporter_id")
    now = datetime.now(timezone.utc)
    
    await db.transporters.update_one(
        {"_id": transporter["_id"]},
        {"$set": {"approval_status": "REJECTED", "updated_at": now}}
    )
    return {"message": "Transporter rejected successfully"}


@router.post("/{transporter_id}/suspend")
async def suspend_transporter(
    transporter_id: str,
    current_user: dict = Depends(get_current_admin_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    transporter = await resolve_doc(db.transporters, transporter_id, "Transporter", business_key="transporter_id")
    now = datetime.now(timezone.utc)
    
    await db.transporters.update_one(
        {"_id": transporter["_id"]},
        {"$set": {"approval_status": "SUSPENDED", "is_active": False, "updated_at": now}}
    )
    return {"message": "Transporter suspended successfully"}
