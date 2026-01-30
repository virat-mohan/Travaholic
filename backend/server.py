from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, Header, UploadFile, File
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import resend
import asyncio
import hmac
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Razorpay client (test mode)
RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', '')
RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', '')
RAZORPAY_WEBHOOK_SECRET = os.environ.get('RAZORPAY_WEBHOOK_SECRET', '')

razorpay_client = None
if RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET:
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# Resend client
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

app = FastAPI(title="Travaholic Stays API")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== PYDANTIC MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "guest"  # guest, owner, admin
    phone: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Villa(BaseModel):
    model_config = ConfigDict(extra="ignore")
    villa_id: str = Field(default_factory=lambda: f"villa_{uuid.uuid4().hex[:12]}")
    name: str
    slug: str
    description: str
    short_description: Optional[str] = None
    location: str  # Anjuna, Vagator, Morjim, etc.
    region: str = "Goa"  # Goa, Mussoorie, Himachal Pradesh
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_guests: int
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    images: List[str] = []
    thumbnail: Optional[str] = None
    base_price: float  # Per night weekday price
    weekend_price: Optional[float] = None
    seasonal_pricing: Optional[Dict[str, float]] = None  # {"peak": 50000, "off": 30000}
    minimum_nights: int = 1
    security_deposit: float = 0
    commission_percent: float = 30.0
    owner_id: Optional[str] = None
    cancellation_policy: str = "Standard"
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VillaCreate(BaseModel):
    name: str
    slug: str
    description: str
    short_description: Optional[str] = None
    location: str
    region: str = "Goa"
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_guests: int
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    images: List[str] = []
    thumbnail: Optional[str] = None
    base_price: float
    weekend_price: Optional[float] = None
    seasonal_pricing: Optional[Dict[str, float]] = None
    minimum_nights: int = 1
    security_deposit: float = 0
    commission_percent: float = 30.0
    owner_id: Optional[str] = None
    cancellation_policy: str = "Standard"
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

class AddOn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    addon_id: str = Field(default_factory=lambda: f"addon_{uuid.uuid4().hex[:12]}")
    name: str
    description: str
    category: str  # meals, chef, spa, decor, transfers
    price: float
    is_per_day: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AddOnCreate(BaseModel):
    name: str
    description: str
    category: str
    price: float
    is_per_day: bool = False

class BlockedDate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    block_id: str = Field(default_factory=lambda: f"block_{uuid.uuid4().hex[:12]}")
    villa_id: str
    start_date: str  # YYYY-MM-DD
    end_date: str  # YYYY-MM-DD
    reason: str = "owner_block"  # owner_block, maintenance, booking
    booking_id: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PricingOverride(BaseModel):
    model_config = ConfigDict(extra="ignore")
    override_id: str = Field(default_factory=lambda: f"override_{uuid.uuid4().hex[:12]}")
    villa_id: str
    start_date: str
    end_date: str
    price: float
    reason: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingAddOn(BaseModel):
    addon_id: str
    name: str
    quantity: int
    price: float
    total: float

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str = Field(default_factory=lambda: f"booking_{uuid.uuid4().hex[:12]}")
    villa_id: str
    villa_name: str
    guest_name: str
    guest_email: str
    guest_phone: str
    check_in: str
    check_out: str
    num_guests: int
    num_nights: int
    base_amount: float
    addons: List[BookingAddOn] = []
    addons_total: float = 0
    subtotal: float
    security_deposit: float = 0
    total_amount: float
    commission_percent: float
    commission_amount: float
    owner_payout: float
    payment_status: str = "pending"  # pending, partial, paid, refunded
    payment_method: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    booking_status: str = "pending"  # pending, confirmed, cancelled, completed
    special_requests: Optional[str] = None
    payment_link: Optional[str] = None
    is_negotiated: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingCreate(BaseModel):
    villa_id: str
    guest_name: str
    guest_email: EmailStr
    guest_phone: str
    check_in: str
    check_out: str
    num_guests: int
    addons: List[Dict[str, Any]] = []
    special_requests: Optional[str] = None

class Lead(BaseModel):
    model_config = ConfigDict(extra="ignore")
    lead_id: str = Field(default_factory=lambda: f"lead_{uuid.uuid4().hex[:12]}")
    name: str
    phone: str
    email: Optional[str] = None
    preferred_time: Optional[str] = None
    villa_id: Optional[str] = None
    villa_name: Optional[str] = None
    lead_type: str = "guest"  # guest, homeowner
    message: Optional[str] = None
    status: str = "new"  # new, contacted, converted, closed
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    preferred_time: Optional[str] = None
    villa_id: Optional[str] = None
    lead_type: str = "guest"
    message: Optional[str] = None

class HomeownerListing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    listing_id: str = Field(default_factory=lambda: f"listing_{uuid.uuid4().hex[:12]}")
    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    villa_name: str
    villa_location: str
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    description: Optional[str] = None
    images: List[str] = []
    status: str = "pending"  # pending, approved, rejected
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class HomeownerListingCreate(BaseModel):
    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    villa_name: str
    villa_location: str
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    description: Optional[str] = None

class OwnerAgreement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    agreement_id: str = Field(default_factory=lambda: f"agreement_{uuid.uuid4().hex[:12]}")
    owner_id: str
    file_url: str
    file_name: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== AUTH HELPERS ====================

async def get_current_user(authorization: str = Header(None), request: Request = None) -> Optional[User]:
    """Get current user from session token - checks cookies first, then Authorization header"""
    session_token = None
    
    # Check cookies first
    if request and request.cookies.get("session_token"):
        session_token = request.cookies.get("session_token")
    # Fallback to Authorization header
    elif authorization:
        if authorization.startswith("Bearer "):
            session_token = authorization[7:]
        else:
            session_token = authorization
    
    if not session_token:
        return None
    
    # Find session
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        return None
    
    # Check expiry
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None
    
    # Get user
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    
    return User(**user_doc)

async def require_auth(authorization: str = Header(None), request: Request = None) -> User:
    """Require authentication"""
    user = await get_current_user(authorization, request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user

async def require_admin(authorization: str = Header(None), request: Request = None) -> User:
    """Require admin role"""
    user = await require_auth(authorization, request)
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_owner_or_admin(authorization: str = Header(None), request: Request = None) -> User:
    """Require owner or admin role"""
    user = await require_auth(authorization, request)
    if user.role not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Owner or admin access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.get("/auth/session")
async def create_session(session_id: str = Header(None, alias="X-Session-ID")):
    """Exchange session_id from Emergent Auth for user data and session_token"""
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    import requests
    try:
        response = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session ID")
        
        data = response.json()
        email = data.get("email")
        name = data.get("name")
        picture = data.get("picture")
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email}, {"_id": 0})
        
        if existing_user:
            user_id = existing_user["user_id"]
            # Update user info
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"name": name, "picture": picture, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            role = existing_user.get("role", "guest")
        else:
            # Create new user
            user_id = f"user_{uuid.uuid4().hex[:12]}"
            role = "guest"
            user_doc = {
                "user_id": user_id,
                "email": email,
                "name": name,
                "picture": picture,
                "role": role,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(user_doc)
        
        # Create session
        session_token = f"sess_{uuid.uuid4().hex}"
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        session_doc = {
            "session_id": str(uuid.uuid4()),
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.user_sessions.insert_one(session_doc)
        
        return {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "session_token": session_token
        }
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Authentication failed: {str(e)}")

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current authenticated user"""
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role
    }

@api_router.post("/auth/logout")
async def logout(authorization: str = Header(None), request: Request = None):
    """Logout user"""
    session_token = None
    if request and request.cookies.get("session_token"):
        session_token = request.cookies.get("session_token")
    elif authorization:
        session_token = authorization.replace("Bearer ", "")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response = JSONResponse(content={"message": "Logged out successfully"})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return response

# ==================== VILLA ROUTES ====================

@api_router.get("/villas")
async def get_villas(
    location: Optional[str] = None,
    region: Optional[str] = None,
    min_guests: Optional[int] = None,
    max_guests: Optional[int] = None,
    has_pool: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    limit: int = 50,
    skip: int = 0
):
    """Get all active villas with optional filters"""
    query = {"is_active": True}
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    if min_guests:
        query["max_guests"] = {"$gte": min_guests}
    if max_guests:
        if "max_guests" in query:
            query["max_guests"]["$lte"] = max_guests
        else:
            query["max_guests"] = {"$lte": max_guests}
    if has_pool is not None:
        query["has_pool"] = has_pool
    if min_price:
        query["base_price"] = {"$gte": min_price}
    if max_price:
        if "base_price" in query:
            query["base_price"]["$lte"] = max_price
        else:
            query["base_price"] = {"$lte": max_price}
    
    villas = await db.villas.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.villas.count_documents(query)
    
    return {"villas": villas, "total": total}

@api_router.get("/villas/{villa_id}")
async def get_villa(villa_id: str):
    """Get villa by ID"""
    villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    return villa

@api_router.get("/villas/slug/{slug}")
async def get_villa_by_slug(slug: str):
    """Get villa by slug"""
    villa = await db.villas.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    return villa

@api_router.post("/villas", response_model=Villa)
async def create_villa(villa_data: VillaCreate, user: User = Depends(require_admin)):
    """Create a new villa (admin only)"""
    villa = Villa(**villa_data.model_dump())
    doc = villa.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.villas.insert_one(doc)
    return villa

@api_router.put("/villas/{villa_id}")
async def update_villa(villa_id: str, villa_data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update a villa (admin only)"""
    villa_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.villas.update_one({"villa_id": villa_id}, {"$set": villa_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    updated_villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0})
    return updated_villa

@api_router.delete("/villas/{villa_id}")
async def delete_villa(villa_id: str, user: User = Depends(require_admin)):
    """Soft delete a villa (admin only)"""
    result = await db.villas.update_one(
        {"villa_id": villa_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Villa not found")
    return {"message": "Villa deleted successfully"}

# ==================== AVAILABILITY & PRICING ====================

@api_router.get("/villas/{villa_id}/availability")
async def get_villa_availability(villa_id: str, month: Optional[str] = None):
    """Get villa availability for a month"""
    villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Get blocked dates
    query = {"villa_id": villa_id}
    if month:
        query["$or"] = [
            {"start_date": {"$regex": f"^{month}"}},
            {"end_date": {"$regex": f"^{month}"}}
        ]
    
    blocked_dates = await db.blocked_dates.find(query, {"_id": 0}).to_list(1000)
    
    # Get pricing overrides
    overrides = await db.pricing_overrides.find(query, {"_id": 0}).to_list(1000)
    
    return {
        "villa_id": villa_id,
        "blocked_dates": blocked_dates,
        "pricing_overrides": overrides,
        "base_price": villa.get("base_price"),
        "weekend_price": villa.get("weekend_price"),
        "minimum_nights": villa.get("minimum_nights", 1)
    }

@api_router.post("/villas/{villa_id}/block-dates")
async def block_dates(villa_id: str, data: Dict[str, Any], user: User = Depends(require_owner_or_admin)):
    """Block dates for a villa"""
    # Verify ownership if not admin
    if user.role == "owner":
        villa = await db.villas.find_one({"villa_id": villa_id, "owner_id": user.user_id}, {"_id": 0})
        if not villa:
            raise HTTPException(status_code=403, detail="You don't own this villa")
    
    block = BlockedDate(
        villa_id=villa_id,
        start_date=data["start_date"],
        end_date=data["end_date"],
        reason=data.get("reason", "owner_block"),
        created_by=user.user_id
    )
    
    doc = block.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.blocked_dates.insert_one(doc)
    
    return {"message": "Dates blocked successfully", "block_id": block.block_id}

@api_router.delete("/blocked-dates/{block_id}")
async def unblock_dates(block_id: str, user: User = Depends(require_owner_or_admin)):
    """Remove blocked dates"""
    block = await db.blocked_dates.find_one({"block_id": block_id}, {"_id": 0})
    if not block:
        raise HTTPException(status_code=404, detail="Block not found")
    
    # Can't unblock booking blocks
    if block.get("reason") == "booking":
        raise HTTPException(status_code=400, detail="Cannot unblock booking dates")
    
    # Verify ownership if not admin
    if user.role == "owner" and block.get("created_by") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.blocked_dates.delete_one({"block_id": block_id})
    return {"message": "Dates unblocked successfully"}

@api_router.post("/villas/{villa_id}/pricing-override")
async def create_pricing_override(villa_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Create pricing override for specific dates (admin only)"""
    override = PricingOverride(
        villa_id=villa_id,
        start_date=data["start_date"],
        end_date=data["end_date"],
        price=data["price"],
        reason=data.get("reason"),
        created_by=user.user_id
    )
    
    doc = override.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.pricing_overrides.insert_one(doc)
    
    return {"message": "Pricing override created", "override_id": override.override_id}

# ==================== BOOKING ROUTES ====================

def calculate_booking_price(villa: Dict, check_in: str, check_out: str, addons: List[Dict], overrides: List[Dict]) -> Dict:
    """Calculate total booking price with dynamic pricing"""
    from datetime import datetime
    
    start = datetime.strptime(check_in, "%Y-%m-%d")
    end = datetime.strptime(check_out, "%Y-%m-%d")
    num_nights = (end - start).days
    
    base_price = villa.get("base_price", 0)
    weekend_price = villa.get("weekend_price") or base_price
    
    # Create override lookup
    override_map = {}
    for override in overrides:
        o_start = datetime.strptime(override["start_date"], "%Y-%m-%d")
        o_end = datetime.strptime(override["end_date"], "%Y-%m-%d")
        current = o_start
        while current <= o_end:
            override_map[current.strftime("%Y-%m-%d")] = override["price"]
            current += timedelta(days=1)
    
    # Calculate per-night prices
    total_base = 0
    current = start
    while current < end:
        date_str = current.strftime("%Y-%m-%d")
        if date_str in override_map:
            total_base += override_map[date_str]
        elif current.weekday() >= 5:  # Weekend
            total_base += weekend_price
        else:
            total_base += base_price
        current += timedelta(days=1)
    
    # Calculate addons
    addons_total = 0
    addon_details = []
    for addon in addons:
        addon_price = addon.get("price", 0)
        quantity = addon.get("quantity", 1)
        is_per_day = addon.get("is_per_day", False)
        
        if is_per_day:
            total = addon_price * num_nights * quantity
        else:
            total = addon_price * quantity
        
        addons_total += total
        addon_details.append({
            "addon_id": addon.get("addon_id"),
            "name": addon.get("name"),
            "quantity": quantity,
            "price": addon_price,
            "total": total
        })
    
    subtotal = total_base + addons_total
    security_deposit = villa.get("security_deposit", 0)
    total_amount = subtotal + security_deposit
    
    commission_percent = villa.get("commission_percent", 30.0)
    commission_amount = (subtotal * commission_percent) / 100
    owner_payout = subtotal - commission_amount
    
    return {
        "num_nights": num_nights,
        "base_amount": total_base,
        "addons": addon_details,
        "addons_total": addons_total,
        "subtotal": subtotal,
        "security_deposit": security_deposit,
        "total_amount": total_amount,
        "commission_percent": commission_percent,
        "commission_amount": commission_amount,
        "owner_payout": owner_payout
    }

@api_router.post("/bookings/calculate-price")
async def calculate_price(data: Dict[str, Any]):
    """Calculate booking price without creating a booking"""
    villa = await db.villas.find_one({"villa_id": data["villa_id"]}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Get pricing overrides
    overrides = await db.pricing_overrides.find({"villa_id": data["villa_id"]}, {"_id": 0}).to_list(1000)
    
    # Get addon details
    addons = []
    for addon_req in data.get("addons", []):
        addon = await db.addons.find_one({"addon_id": addon_req["addon_id"]}, {"_id": 0})
        if addon:
            addons.append({**addon, "quantity": addon_req.get("quantity", 1)})
    
    pricing = calculate_booking_price(villa, data["check_in"], data["check_out"], addons, overrides)
    return pricing

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    villa = await db.villas.find_one({"villa_id": booking_data.villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Check availability
    blocked = await db.blocked_dates.find_one({
        "villa_id": booking_data.villa_id,
        "$or": [
            {"start_date": {"$lte": booking_data.check_out}, "end_date": {"$gte": booking_data.check_in}}
        ]
    })
    if blocked:
        raise HTTPException(status_code=400, detail="Dates not available")
    
    # Get pricing overrides
    overrides = await db.pricing_overrides.find({"villa_id": booking_data.villa_id}, {"_id": 0}).to_list(1000)
    
    # Get addon details
    addons = []
    for addon_req in booking_data.addons:
        addon = await db.addons.find_one({"addon_id": addon_req["addon_id"]}, {"_id": 0})
        if addon:
            addons.append({**addon, "quantity": addon_req.get("quantity", 1)})
    
    pricing = calculate_booking_price(villa, booking_data.check_in, booking_data.check_out, addons, overrides)
    
    booking = Booking(
        villa_id=booking_data.villa_id,
        villa_name=villa["name"],
        guest_name=booking_data.guest_name,
        guest_email=booking_data.guest_email,
        guest_phone=booking_data.guest_phone,
        check_in=booking_data.check_in,
        check_out=booking_data.check_out,
        num_guests=booking_data.num_guests,
        special_requests=booking_data.special_requests,
        **pricing
    )
    
    doc = booking.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.bookings.insert_one(doc)
    
    # Block the dates
    block = BlockedDate(
        villa_id=booking_data.villa_id,
        start_date=booking_data.check_in,
        end_date=booking_data.check_out,
        reason="booking",
        booking_id=booking.booking_id,
        created_by="system"
    )
    block_doc = block.model_dump()
    block_doc["created_at"] = block_doc["created_at"].isoformat()
    await db.blocked_dates.insert_one(block_doc)
    
    return booking

@api_router.get("/bookings")
async def get_bookings(
    status: Optional[str] = None,
    villa_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: User = Depends(require_owner_or_admin)
):
    """Get bookings (admin sees all, owner sees their villas)"""
    query = {}
    
    if user.role == "owner":
        # Get owner's villas
        owner_villas = await db.villas.find({"owner_id": user.user_id}, {"villa_id": 1, "_id": 0}).to_list(1000)
        villa_ids = [v["villa_id"] for v in owner_villas]
        query["villa_id"] = {"$in": villa_ids}
    
    if status:
        query["booking_status"] = status
    if villa_id:
        query["villa_id"] = villa_id
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.bookings.count_documents(query)
    
    return {"bookings": bookings, "total": total}

@api_router.get("/bookings/{booking_id}")
async def get_booking(booking_id: str, user: User = Depends(require_owner_or_admin)):
    """Get booking details"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Check access for owners
    if user.role == "owner":
        villa = await db.villas.find_one({"villa_id": booking["villa_id"], "owner_id": user.user_id})
        if not villa:
            raise HTTPException(status_code=403, detail="Not authorized")
    
    return booking

@api_router.put("/bookings/{booking_id}")
async def update_booking(booking_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update booking (admin only)"""
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.bookings.update_one({"booking_id": booking_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    updated = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    return updated

@api_router.post("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user: User = Depends(require_admin)):
    """Cancel a booking (admin only)"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Update booking status
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"booking_status": "cancelled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Remove blocked dates
    await db.blocked_dates.delete_one({"booking_id": booking_id})
    
    return {"message": "Booking cancelled successfully"}

# ==================== PAYMENT ROUTES ====================

@api_router.post("/payments/create-order")
async def create_payment_order(data: Dict[str, Any]):
    """Create Razorpay order for a booking"""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    
    booking = await db.bookings.find_one({"booking_id": data["booking_id"]}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    amount = data.get("amount", booking["total_amount"])
    amount_paise = int(amount * 100)  # Convert to paise
    
    try:
        order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": booking["booking_id"],
            "notes": {
                "booking_id": booking["booking_id"],
                "villa_name": booking["villa_name"]
            }
        })
        
        # Update booking with order ID
        await db.bookings.update_one(
            {"booking_id": data["booking_id"]},
            {"$set": {"razorpay_order_id": order["id"], "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {
            "order_id": order["id"],
            "amount": amount_paise,
            "currency": "INR",
            "key_id": RAZORPAY_KEY_ID
        }
    except Exception as e:
        logger.error(f"Razorpay error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/payments/verify")
async def verify_payment(data: Dict[str, Any]):
    """Verify Razorpay payment signature"""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    
    try:
        razorpay_client.utility.verify_payment_signature({
            "razorpay_order_id": data["razorpay_order_id"],
            "razorpay_payment_id": data["razorpay_payment_id"],
            "razorpay_signature": data["razorpay_signature"]
        })
        
        # Update booking
        booking = await db.bookings.find_one({"razorpay_order_id": data["razorpay_order_id"]}, {"_id": 0})
        if booking:
            await db.bookings.update_one(
                {"razorpay_order_id": data["razorpay_order_id"]},
                {"$set": {
                    "payment_status": "paid",
                    "booking_status": "confirmed",
                    "razorpay_payment_id": data["razorpay_payment_id"],
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "success", "message": "Payment verified successfully"}
    except Exception as e:
        logger.error(f"Payment verification failed: {str(e)}")
        raise HTTPException(status_code=400, detail="Payment verification failed")

@api_router.post("/payments/webhook")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events"""
    if not RAZORPAY_WEBHOOK_SECRET:
        return {"status": "webhook not configured"}
    
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    
    try:
        razorpay_client.utility.verify_webhook_signature(
            payload.decode(),
            signature,
            RAZORPAY_WEBHOOK_SECRET
        )
        
        data = await request.json()
        event = data.get("event")
        
        if event == "payment.captured":
            payment = data["payload"]["payment"]["entity"]
            order_id = payment.get("order_id")
            
            if order_id:
                await db.bookings.update_one(
                    {"razorpay_order_id": order_id},
                    {"$set": {
                        "payment_status": "paid",
                        "booking_status": "confirmed",
                        "razorpay_payment_id": payment["id"],
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
        
        return {"status": "processed"}
    except Exception as e:
        logger.error(f"Webhook error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/payments/create-link")
async def create_payment_link(data: Dict[str, Any], user: User = Depends(require_admin)):
    """Create a payment link for negotiated bookings (admin only)"""
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment gateway not configured")
    
    booking_id = data.get("booking_id")
    amount = data.get("amount")
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    try:
        link = razorpay_client.payment_link.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "description": f"Payment for {booking['villa_name']} - {booking['check_in']} to {booking['check_out']}",
            "customer": {
                "name": booking["guest_name"],
                "email": booking["guest_email"],
                "contact": booking["guest_phone"]
            },
            "notes": {
                "booking_id": booking_id
            }
        })
        
        await db.bookings.update_one(
            {"booking_id": booking_id},
            {"$set": {
                "payment_link": link["short_url"],
                "is_negotiated": True,
                "total_amount": amount,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"payment_link": link["short_url"]}
    except Exception as e:
        logger.error(f"Payment link error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment link: {str(e)}")

# ==================== ADD-ONS ROUTES ====================

@api_router.get("/addons")
async def get_addons(category: Optional[str] = None):
    """Get all active add-ons"""
    query = {"is_active": True}
    if category:
        query["category"] = category
    
    addons = await db.addons.find(query, {"_id": 0}).to_list(1000)
    return {"addons": addons}

@api_router.post("/addons")
async def create_addon(addon_data: AddOnCreate, user: User = Depends(require_admin)):
    """Create a new add-on (admin only)"""
    addon = AddOn(**addon_data.model_dump())
    doc = addon.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.addons.insert_one(doc)
    return addon

@api_router.put("/addons/{addon_id}")
async def update_addon(addon_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update an add-on (admin only)"""
    result = await db.addons.update_one({"addon_id": addon_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Add-on not found")
    
    updated = await db.addons.find_one({"addon_id": addon_id}, {"_id": 0})
    return updated

@api_router.delete("/addons/{addon_id}")
async def delete_addon(addon_id: str, user: User = Depends(require_admin)):
    """Delete an add-on (admin only)"""
    result = await db.addons.update_one({"addon_id": addon_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Add-on not found")
    return {"message": "Add-on deleted successfully"}

# ==================== LEADS ROUTES ====================

@api_router.post("/leads")
async def create_lead(lead_data: LeadCreate):
    """Create a callback/inquiry lead"""
    lead = Lead(**lead_data.model_dump())
    
    # Get villa name if villa_id provided
    if lead_data.villa_id:
        villa = await db.villas.find_one({"villa_id": lead_data.villa_id}, {"name": 1, "_id": 0})
        if villa:
            lead.villa_name = villa["name"]
    
    doc = lead.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.leads.insert_one(doc)
    
    # Send notification email if configured
    if RESEND_API_KEY:
        try:
            await asyncio.to_thread(resend.Emails.send, {
                "from": SENDER_EMAIL,
                "to": [os.environ.get("ADMIN_EMAIL", "admin@travaholicstays.com")],
                "subject": f"New Lead: {lead.name} ({lead.lead_type})",
                "html": f"""
                    <h2>New {lead.lead_type.title()} Lead</h2>
                    <p><strong>Name:</strong> {lead.name}</p>
                    <p><strong>Phone:</strong> {lead.phone}</p>
                    <p><strong>Email:</strong> {lead.email or 'Not provided'}</p>
                    <p><strong>Villa:</strong> {lead.villa_name or 'Not specified'}</p>
                    <p><strong>Message:</strong> {lead.message or 'None'}</p>
                """
            })
        except Exception as e:
            logger.error(f"Email notification failed: {str(e)}")
    
    return {"message": "Lead created successfully", "lead_id": lead.lead_id}

@api_router.get("/leads")
async def get_leads(
    lead_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: User = Depends(require_admin)
):
    """Get all leads (admin only)"""
    query = {}
    if lead_type:
        query["lead_type"] = lead_type
    if status:
        query["status"] = status
    
    leads = await db.leads.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.leads.count_documents(query)
    
    return {"leads": leads, "total": total}

@api_router.put("/leads/{lead_id}")
async def update_lead(lead_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update lead status/notes (admin only)"""
    result = await db.leads.update_one({"lead_id": lead_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    updated = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    return updated

# ==================== HOMEOWNER LISTING ROUTES ====================

@api_router.post("/list-villa")
async def submit_villa_listing(listing_data: HomeownerListingCreate):
    """Submit a new villa listing request"""
    listing = HomeownerListing(**listing_data.model_dump())
    
    doc = listing.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.homeowner_listings.insert_one(doc)
    
    # Also create a lead for follow-up
    lead = Lead(
        name=listing_data.owner_name,
        phone=listing_data.owner_phone,
        email=listing_data.owner_email,
        lead_type="homeowner",
        message=f"New villa listing: {listing_data.villa_name} in {listing_data.villa_location}"
    )
    lead_doc = lead.model_dump()
    lead_doc["created_at"] = lead_doc["created_at"].isoformat()
    await db.leads.insert_one(lead_doc)
    
    return {"message": "Listing submitted successfully", "listing_id": listing.listing_id}

@api_router.get("/homeowner-listings")
async def get_homeowner_listings(
    status: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    user: User = Depends(require_admin)
):
    """Get all homeowner listings (admin only)"""
    query = {}
    if status:
        query["status"] = status
    
    listings = await db.homeowner_listings.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.homeowner_listings.count_documents(query)
    
    return {"listings": listings, "total": total}

@api_router.put("/homeowner-listings/{listing_id}")
async def update_homeowner_listing(listing_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update homeowner listing (admin only)"""
    result = await db.homeowner_listings.update_one({"listing_id": listing_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    updated = await db.homeowner_listings.find_one({"listing_id": listing_id}, {"_id": 0})
    return updated

# ==================== OWNER MANAGEMENT ROUTES ====================

@api_router.get("/owners")
async def get_owners(user: User = Depends(require_admin)):
    """Get all villa owners (admin only)"""
    owners = await db.users.find({"role": "owner"}, {"_id": 0}).to_list(1000)
    return {"owners": owners}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: Dict[str, Any], admin: User = Depends(require_admin)):
    """Update user role (admin only)"""
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": data["role"]}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return updated

@api_router.post("/owners/{owner_id}/agreement")
async def upload_owner_agreement(owner_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Upload owner agreement document (admin only)"""
    agreement = OwnerAgreement(
        owner_id=owner_id,
        file_url=data["file_url"],
        file_name=data["file_name"]
    )
    
    doc = agreement.model_dump()
    doc["uploaded_at"] = doc["uploaded_at"].isoformat()
    await db.owner_agreements.insert_one(doc)
    
    return {"message": "Agreement uploaded successfully", "agreement_id": agreement.agreement_id}

@api_router.get("/owners/{owner_id}/agreements")
async def get_owner_agreements(owner_id: str, user: User = Depends(require_owner_or_admin)):
    """Get owner's agreements"""
    if user.role == "owner" and user.user_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    agreements = await db.owner_agreements.find({"owner_id": owner_id}, {"_id": 0}).to_list(100)
    return {"agreements": agreements}

# ==================== FINANCIAL LEDGER ROUTES ====================

@api_router.get("/financials/summary")
async def get_financial_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_admin)
):
    """Get financial summary (admin only)"""
    query = {"payment_status": "paid"}
    
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(b.get("subtotal", 0) for b in bookings)
    total_commission = sum(b.get("commission_amount", 0) for b in bookings)
    total_owner_payout = sum(b.get("owner_payout", 0) for b in bookings)
    total_security_deposits = sum(b.get("security_deposit", 0) for b in bookings)
    
    return {
        "total_bookings": len(bookings),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_owner_payout": total_owner_payout,
        "total_security_deposits": total_security_deposits
    }

@api_router.get("/financials/villa/{villa_id}")
async def get_villa_financials(
    villa_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_owner_or_admin)
):
    """Get financial details for a villa"""
    villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Check owner access
    if user.role == "owner" and villa.get("owner_id") != user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    query = {"villa_id": villa_id, "payment_status": "paid"}
    
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(b.get("subtotal", 0) for b in bookings)
    total_commission = sum(b.get("commission_amount", 0) for b in bookings)
    total_payout = sum(b.get("owner_payout", 0) for b in bookings)
    
    return {
        "villa_id": villa_id,
        "villa_name": villa["name"],
        "total_bookings": len(bookings),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_payout": total_payout,
        "bookings": bookings
    }

@api_router.get("/financials/owner/{owner_id}")
async def get_owner_financials(
    owner_id: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_owner_or_admin)
):
    """Get financial details for an owner"""
    if user.role == "owner" and user.user_id != owner_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get owner's villas
    villas = await db.villas.find({"owner_id": owner_id}, {"villa_id": 1, "name": 1, "_id": 0}).to_list(1000)
    villa_ids = [v["villa_id"] for v in villas]
    
    query = {"villa_id": {"$in": villa_ids}, "payment_status": "paid"}
    
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(b.get("subtotal", 0) for b in bookings)
    total_commission = sum(b.get("commission_amount", 0) for b in bookings)
    total_payout = sum(b.get("owner_payout", 0) for b in bookings)
    
    return {
        "owner_id": owner_id,
        "villas": villas,
        "total_bookings": len(bookings),
        "total_revenue": total_revenue,
        "total_commission": total_commission,
        "total_payout": total_payout,
        "bookings": bookings
    }

@api_router.get("/financials/export")
async def export_financials(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_admin)
):
    """Export financial data as CSV-ready JSON (admin only)"""
    query = {"payment_status": "paid"}
    
    if start_date:
        query["check_in"] = {"$gte": start_date}
    if end_date:
        if "check_in" in query:
            query["check_in"]["$lte"] = end_date
        else:
            query["check_in"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("check_in", 1).to_list(10000)
    
    export_data = []
    for b in bookings:
        export_data.append({
            "booking_id": b.get("booking_id"),
            "villa_name": b.get("villa_name"),
            "guest_name": b.get("guest_name"),
            "check_in": b.get("check_in"),
            "check_out": b.get("check_out"),
            "num_nights": b.get("num_nights"),
            "base_amount": b.get("base_amount"),
            "addons_total": b.get("addons_total"),
            "subtotal": b.get("subtotal"),
            "security_deposit": b.get("security_deposit"),
            "total_amount": b.get("total_amount"),
            "commission_percent": b.get("commission_percent"),
            "commission_amount": b.get("commission_amount"),
            "owner_payout": b.get("owner_payout"),
            "payment_status": b.get("payment_status"),
            "booking_status": b.get("booking_status")
        })
    
    return {"data": export_data}

# ==================== OWNER PORTAL ROUTES ====================

@api_router.get("/owner/dashboard")
async def get_owner_dashboard(user: User = Depends(require_owner_or_admin)):
    """Get owner dashboard data"""
    if user.role == "admin":
        # Admin can see everything
        villas = await db.villas.find({}, {"_id": 0}).to_list(1000)
    else:
        villas = await db.villas.find({"owner_id": user.user_id}, {"_id": 0}).to_list(1000)
    
    villa_ids = [v["villa_id"] for v in villas]
    
    # Get upcoming bookings
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming_bookings = await db.bookings.find({
        "villa_id": {"$in": villa_ids},
        "check_in": {"$gte": today},
        "booking_status": {"$in": ["pending", "confirmed"]}
    }, {"_id": 0}).sort("check_in", 1).limit(10).to_list(10)
    
    # Get blocked dates
    blocked_dates = await db.blocked_dates.find({
        "villa_id": {"$in": villa_ids}
    }, {"_id": 0}).to_list(1000)
    
    # Get all bookings for this owner's villas
    all_bookings = await db.bookings.find({
        "villa_id": {"$in": villa_ids},
        "booking_status": {"$in": ["confirmed", "completed"]}
    }, {"_id": 0}).to_list(10000)
    
    total_revenue = sum(b.get("subtotal", 0) for b in all_bookings)
    total_earnings = sum(b.get("owner_payout", 0) for b in all_bookings)
    
    return {
        "villas": villas,
        "upcoming_bookings": upcoming_bookings,
        "blocked_dates": blocked_dates,
        "total_revenue": total_revenue,
        "total_earnings": total_earnings,
        "total_bookings": len(all_bookings)
    }

# ==================== LOCATIONS & AMENITIES ====================

@api_router.get("/locations")
async def get_locations():
    """Get all unique locations"""
    locations = await db.villas.distinct("location", {"is_active": True})
    regions = await db.villas.distinct("region", {"is_active": True})
    return {"locations": locations, "regions": regions}

@api_router.get("/amenities")
async def get_amenities():
    """Get all unique amenities"""
    villas = await db.villas.find({"is_active": True}, {"amenities": 1, "_id": 0}).to_list(1000)
    all_amenities = set()
    for v in villas:
        all_amenities.update(v.get("amenities", []))
    return {"amenities": sorted(list(all_amenities))}

# ==================== RAZORPAY SETUP GUIDE ====================

@api_router.get("/admin/razorpay-setup")
async def get_razorpay_setup_guide(user: User = Depends(require_admin)):
    """Get Razorpay setup instructions (admin only)"""
    return {
        "title": "Razorpay Setup Guide",
        "steps": [
            {
                "step": 1,
                "title": "Create Razorpay Account",
                "description": "Visit https://razorpay.com and click 'Sign Up'. Complete the registration process with your business details."
            },
            {
                "step": 2,
                "title": "Complete KYC",
                "description": "Submit required documents (PAN, GST, Bank Account) for KYC verification. This typically takes 2-3 business days."
            },
            {
                "step": 3,
                "title": "Generate API Keys",
                "description": "Go to Dashboard → Settings → API Keys → Generate Key. Save both Key ID and Key Secret securely."
            },
            {
                "step": 4,
                "title": "Configure Environment",
                "description": "Add the following to backend/.env:\n- RAZORPAY_KEY_ID=your_key_id\n- RAZORPAY_KEY_SECRET=your_key_secret"
            },
            {
                "step": 5,
                "title": "Test Mode",
                "description": "Use test keys (rzp_test_xxx) for testing. Switch to live keys (rzp_live_xxx) when ready for production."
            },
            {
                "step": 6,
                "title": "Configure Webhooks",
                "description": "Go to Dashboard → Settings → Webhooks → Add New Webhook. Set URL to your domain/api/payments/webhook and add RAZORPAY_WEBHOOK_SECRET to .env"
            }
        ],
        "test_cards": {
            "success": "4111 1111 1111 1111",
            "failure": "4000 0000 0000 0002",
            "upi": "success@razorpay"
        },
        "current_status": {
            "configured": bool(RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET),
            "mode": "test" if RAZORPAY_KEY_ID and "test" in RAZORPAY_KEY_ID else "live" if RAZORPAY_KEY_ID else "not_configured"
        }
    }

# ==================== SEED DATA ====================

@api_router.post("/seed-data")
async def seed_sample_data():
    """Seed sample villas and add-ons for testing"""
    
    # Sample villas
    sample_villas = [
        {
            "villa_id": f"villa_{uuid.uuid4().hex[:12]}",
            "name": "La Sierra Villa 12",
            "slug": "la-sierra-villa-12",
            "description": "Experience luxury living at La Sierra Villa 12, nestled in the serene landscapes of Vagator, Goa. This stunning 4-bedroom villa offers breathtaking views, a private infinity pool, and world-class amenities. Perfect for families and groups seeking an unforgettable escape.",
            "short_description": "Stunning 4BHK villa with infinity pool in Vagator",
            "location": "Vagator",
            "region": "Goa",
            "address": "La Sierra Complex, Vagator Beach Road, Goa",
            "latitude": 15.6010,
            "longitude": 73.7449,
            "max_guests": 8,
            "bedrooms": 4,
            "bathrooms": 4,
            "has_pool": True,
            "amenities": ["Private Pool", "WiFi", "Air Conditioning", "Kitchen", "Parking", "BBQ", "Garden", "Housekeeping", "Caretaker", "TV", "Breakfast"],
            "images": [
                "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200",
                "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200",
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200"
            ],
            "thumbnail": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
            "base_price": 35000,
            "weekend_price": 45000,
            "minimum_nights": 2,
            "security_deposit": 10000,
            "commission_percent": 30.0,
            "cancellation_policy": "Free cancellation up to 7 days before check-in",
            "meta_title": "La Sierra Villa 12 - Luxury 4BHK Villa in Vagator, Goa",
            "meta_description": "Book La Sierra Villa 12, a stunning 4-bedroom luxury villa with private pool in Vagator, Goa. Perfect for family getaways.",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "villa_id": f"villa_{uuid.uuid4().hex[:12]}",
            "name": "La Viola Villas",
            "slug": "la-viola-villas",
            "description": "La Viola Villas offers a perfect blend of contemporary design and traditional Goan charm. This 3-bedroom retreat in Anjuna features a stunning pool area, lush gardens, and easy access to the famous Anjuna Beach.",
            "short_description": "Contemporary 3BHK villa near Anjuna Beach",
            "location": "Anjuna",
            "region": "Goa",
            "max_guests": 6,
            "bedrooms": 3,
            "bathrooms": 3,
            "has_pool": True,
            "amenities": ["Private Pool", "WiFi", "Air Conditioning", "Kitchen", "Parking", "Garden", "Housekeeping", "TV"],
            "images": [
                "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200",
                "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200",
                "https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=1200"
            ],
            "thumbnail": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
            "base_price": 28000,
            "weekend_price": 35000,
            "minimum_nights": 2,
            "security_deposit": 8000,
            "commission_percent": 30.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "villa_id": f"villa_{uuid.uuid4().hex[:12]}",
            "name": "La Maroma Villa",
            "slug": "la-maroma-villa",
            "description": "Discover tranquility at La Maroma Villa in Morjim. This elegant 5-bedroom property combines luxury with nature, featuring an expansive pool, tropical gardens, and proximity to Morjim's pristine beaches.",
            "short_description": "Elegant 5BHK villa in serene Morjim",
            "location": "Morjim",
            "region": "Goa",
            "max_guests": 10,
            "bedrooms": 5,
            "bathrooms": 5,
            "has_pool": True,
            "amenities": ["Private Pool", "WiFi", "Air Conditioning", "Kitchen", "Parking", "BBQ", "Garden", "Housekeeping", "Caretaker", "TV", "Bonfire", "Breakfast"],
            "images": [
                "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=1200",
                "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200",
                "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200"
            ],
            "thumbnail": "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800",
            "base_price": 50000,
            "weekend_price": 65000,
            "minimum_nights": 2,
            "security_deposit": 15000,
            "commission_percent": 30.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "villa_id": f"villa_{uuid.uuid4().hex[:12]}",
            "name": "Cloud Nest Mussoorie",
            "slug": "cloud-nest-mussoorie",
            "description": "Escape to the hills at Cloud Nest, a charming 3-bedroom cottage in Mussoorie. Wake up to misty mountain views, enjoy cozy fireplaces, and experience the magic of the Queen of Hills.",
            "short_description": "Charming hill cottage with mountain views",
            "location": "Mussoorie",
            "region": "Uttarakhand",
            "max_guests": 6,
            "bedrooms": 3,
            "bathrooms": 2,
            "has_pool": False,
            "amenities": ["WiFi", "Heating", "Fireplace", "Kitchen", "Parking", "Garden", "Mountain Views", "Housekeeping"],
            "images": [
                "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=1200",
                "https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?w=1200",
                "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1200"
            ],
            "thumbnail": "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=800",
            "base_price": 18000,
            "weekend_price": 22000,
            "minimum_nights": 1,
            "security_deposit": 5000,
            "commission_percent": 30.0,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Sample add-ons
    sample_addons = [
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "Private Chef", "description": "Personal chef for breakfast, lunch, and dinner", "category": "chef", "price": 5000, "is_per_day": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "Airport Transfer", "description": "Private car pickup from Goa Airport", "category": "transfers", "price": 2500, "is_per_day": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "Spa Session", "description": "In-villa massage and spa treatment (per person)", "category": "spa", "price": 3000, "is_per_day": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "BBQ Night", "description": "Complete BBQ setup with chef and ingredients", "category": "meals", "price": 8000, "is_per_day": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "Decoration Package", "description": "Romantic or celebration decoration", "category": "decor", "price": 5000, "is_per_day": False, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"addon_id": f"addon_{uuid.uuid4().hex[:12]}", "name": "Daily Breakfast", "description": "Continental/Indian breakfast for all guests", "category": "meals", "price": 1500, "is_per_day": True, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    # Insert data
    await db.villas.delete_many({})
    await db.addons.delete_many({})
    
    await db.villas.insert_many(sample_villas)
    await db.addons.insert_many(sample_addons)
    
    return {"message": "Sample data seeded successfully", "villas": len(sample_villas), "addons": len(sample_addons)}

# ==================== MAKE ADMIN (TEMPORARY - FOR SETUP) ====================

@api_router.post("/make-admin")
async def make_current_user_admin(user: User = Depends(require_auth)):
    """Make the current logged-in user an admin (for initial setup)"""
    # Check if any admin exists
    existing_admin = await db.users.find_one({"role": "admin"})
    
    if existing_admin and existing_admin.get("user_id") != user.user_id:
        # If admin exists and it's not the current user, only allow if no bookings yet (fresh setup)
        booking_count = await db.bookings.count_documents({})
        if booking_count > 0:
            raise HTTPException(status_code=403, detail="Admin already exists. Contact existing admin for access.")
    
    # Update user role to admin
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "admin"}}
    )
    
    return {"message": f"User {user.email} is now an admin", "role": "admin"}

@api_router.post("/make-owner")
async def make_current_user_owner(user: User = Depends(require_auth)):
    """Make the current logged-in user an owner (for testing)"""
    # Update user role to owner
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "owner"}}
    )
    
    # Assign some villas to this owner for demo purposes
    # Get first 2 villas that don't have an owner
    villas_to_assign = await db.villas.find(
        {"$or": [{"owner_id": {"$exists": False}}, {"owner_id": None}]},
        {"villa_id": 1, "_id": 0}
    ).limit(2).to_list(2)
    
    for villa in villas_to_assign:
        await db.villas.update_one(
            {"villa_id": villa["villa_id"]},
            {"$set": {"owner_id": user.user_id}}
        )
    
    return {
        "message": f"User {user.email} is now an owner with {len(villas_to_assign)} villas assigned",
        "role": "owner",
        "villas_assigned": len(villas_to_assign)
    }

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.get("/sitemap.xml", response_class=Response)
async def generate_sitemap():
    """Generate XML sitemap for SEO"""
    base_url = "https://travaholicstays.com"
    
    # Get all active villas
    villas = await db.villas.find({"is_active": True}, {"slug": 1, "updated_at": 1, "_id": 0}).to_list(1000)
    
    # Static pages
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/villas", "priority": "0.9", "changefreq": "daily"},
        {"loc": "/about", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/contact", "priority": "0.7", "changefreq": "monthly"},
        {"loc": "/experiences", "priority": "0.8", "changefreq": "weekly"},
        {"loc": "/blog", "priority": "0.6", "changefreq": "weekly"},
        {"loc": "/list-your-villa", "priority": "0.7", "changefreq": "monthly"},
    ]
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # Add static pages
    for page in static_pages:
        xml_content += f'''  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n'''
    
    # Add villa pages
    for villa in villas:
        xml_content += f'''  <url>
    <loc>{base_url}/villas/{villa["slug"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    
    return Response(content=xml_content, media_type="application/xml")

# Include router and add middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
