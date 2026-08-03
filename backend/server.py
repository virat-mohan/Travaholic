from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Query, Header, UploadFile, File
from fastapi.responses import JSONResponse, Response, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import re
import json
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import resend
import asyncio
from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage, PageBreak, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import urllib.request
import urllib.parse
import hmac
import hashlib
import bcrypt
import base64
from PIL import Image

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# PDF fonts - ReportLab's built-in Helvetica has no Rupee glyph (renders as a
# missing-glyph box), so bundle DejaVu Sans (has full Unicode coverage) and
# register it under names used by every PDF generator in this file.
FONTS_DIR = ROOT_DIR / "fonts"
try:
    pdfmetrics.registerFont(TTFont("DejaVuSans", str(FONTS_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(FONTS_DIR / "DejaVuSans-Bold.ttf")))
    PDF_FONT = "DejaVuSans"
    PDF_FONT_BOLD = "DejaVuSans-Bold"
except Exception:
    logging.warning("DejaVu Sans fonts not found - falling back to Helvetica (Rupee symbol will not render)")
    PDF_FONT = "Helvetica"
    PDF_FONT_BOLD = "Helvetica-Bold"

# Brand palette (matches frontend/src/index.css --accent / --foreground / --background)
PDF_INK = colors.HexColor("#1A1A1A")
PDF_GOLD = colors.HexColor("#C9A876")
PDF_GOLD_DARK = colors.HexColor("#A8875C")
PDF_MUTED = colors.HexColor("#6B6B6B")
PDF_CREAM = colors.HexColor("#F9F8F6")
PDF_LOGO_PATH = ROOT_DIR / "assets" / "travaholic-logo-color.png"

# Emails need a publicly reachable image URL (can't embed a local file the
# way the PDF does) - point at the live site's copy of the same colorful
# logo used everywhere else.
EMAIL_LOGO_URL = f"{os.environ.get('FRONTEND_URL', 'https://travaholicstays.com')}/Travaholic_color_logo-removebg-preview.png"
# Same brand palette as the PDF (#C9A876 gold / #1A1A1A ink / #F9F8F6 cream)
# instead of the unrelated teal these email templates used before.
EMAIL_GOLD = "#C9A876"
EMAIL_GOLD_DARK = "#A8875C"
EMAIL_INK = "#1A1A1A"
EMAIL_CREAM = "#F9F8F6"
EMAIL_MUTED = "#6B6B6B"

def pdf_filename(guest_name: str, villa_name: Optional[str] = None) -> str:
    """'Travaholic Booking - <Guest Name> - <Property Name>.pdf' - strips
    characters that break filenames/Content-Disposition headers, keeps spaces."""
    def _safe(value: str, fallback: str) -> str:
        return re.sub(r'[\\/:*?"<>|\r\n]', '', value or "").strip() or fallback
    safe_guest = _safe(guest_name, "Guest")
    safe_villa = _safe(villa_name, "")
    if safe_villa:
        return f"Travaholic Booking - {safe_guest} - {safe_villa}.pdf"
    return f"Travaholic Booking - {safe_guest}.pdf"

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

# Twilio WhatsApp client - optional. Booking confirmations are sent over
# WhatsApp only once TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_WHATSAPP_FROM
# are configured; otherwise send_whatsapp_booking_confirmation() is a no-op,
# same graceful-degradation pattern as the Resend/Razorpay clients above.
TWILIO_ACCOUNT_SID = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_WHATSAPP_FROM = os.environ.get('TWILIO_WHATSAPP_FROM', '')  # e.g. "whatsapp:+14155238886"

# Content SIDs for Meta-approved WhatsApp templates (see
# backend/whatsapp_templates.md for the template text to submit and get
# these from). Each is optional - until a given SID is set, the matching
# send falls back to a free-text message instead of no-op'ing entirely,
# so sends keep working before/while a template is pending approval. Note
# free-text only actually delivers within Twilio's WhatsApp sandbox or
# within 24h of the guest messaging first; in production once you're off
# the sandbox, business-initiated sends require the template.
TWILIO_TEMPLATE_BOOKING_PROPOSAL = os.environ.get('TWILIO_TEMPLATE_BOOKING_PROPOSAL', '')
TWILIO_TEMPLATE_ADVANCE_PAYMENT = os.environ.get('TWILIO_TEMPLATE_ADVANCE_PAYMENT', '')
TWILIO_TEMPLATE_BOOKING_CONFIRMED = os.environ.get('TWILIO_TEMPLATE_BOOKING_CONFIRMED', '')
TWILIO_TEMPLATE_PRIVATE_OFFER = os.environ.get('TWILIO_TEMPLATE_PRIVATE_OFFER', '')

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    from twilio.rest import Client as TwilioClient
    twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def _send_whatsapp(to_number: str, content_sid: str, content_variables: dict, fallback_body: str):
    """Send a WhatsApp message via an approved Content template when
    content_sid is configured, otherwise fall back to a free-text body.
    Shared by every guest-facing WhatsApp send below."""
    if content_sid:
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:+{to_number}",
            content_sid=content_sid,
            content_variables=json.dumps(content_variables),
        )
    else:
        twilio_client.messages.create(
            from_=TWILIO_WHATSAPP_FROM,
            to=f"whatsapp:+{to_number}",
            body=fallback_body,
        )

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
    address: Optional[str] = None
    company_name: Optional[str] = None
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
    map_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_guests: int
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    images: List[str] = []
    thumbnail: Optional[str] = None
    photo_captions: Optional[Dict[str, str]] = None  # {image_url: custom display caption}
    video_url: Optional[str] = None
    bookings_open_from: Optional[str] = None  # YYYY-MM-DD - no check-ins accepted before this date
    airbnb_ical_url: Optional[str] = None  # Airbnb's private "export calendar" link for this listing
    base_price: float  # Per night weekday price
    weekend_price: Optional[float] = None
    seasonal_pricing: Optional[Dict[str, float]] = None  # {"peak": 50000, "off": 30000}
    minimum_nights: int = 1
    security_deposit: float = 0
    commission_percent: float = 30.0
    owner_id: Optional[str] = None  # links to a registered owner User account
    # Manual owner contact info, used instead of owner_id when the owner
    # doesn't have (or need) a Travaholic login - e.g. a villa only ever
    # booked via private offers, where the admin just needs to know who
    # to pay/contact.
    owner_contact_name: Optional[str] = None
    owner_contact_phone: Optional[str] = None
    owner_contact_email: Optional[str] = None
    owner_contact_address: Optional[str] = None
    cancellation_policy: str = "Standard"
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_active: bool = True
    # New fields for enhanced pricing & visibility
    is_off_market: bool = False  # Private/invite-only listing
    weekend_multiplier: float = 1.2  # Weekend price multiplier
    long_stay_discount_7: float = 0  # % discount for 7+ nights
    long_stay_discount_14: float = 0  # % discount for 14+ nights
    long_stay_discount_30: float = 0  # % discount for 30+ nights
    cleaning_fee: float = 0  # One-time cleaning fee
    instant_book: bool = True  # Allow instant booking vs request-only
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
    map_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    max_guests: int
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    images: List[str] = []
    thumbnail: Optional[str] = None
    photo_captions: Optional[Dict[str, str]] = None
    video_url: Optional[str] = None
    bookings_open_from: Optional[str] = None
    airbnb_ical_url: Optional[str] = None
    base_price: float
    weekend_price: Optional[float] = None
    seasonal_pricing: Optional[Dict[str, float]] = None
    minimum_nights: int = 1
    security_deposit: float = 0
    commission_percent: float = 30.0
    owner_id: Optional[str] = None
    owner_contact_name: Optional[str] = None
    owner_contact_phone: Optional[str] = None
    owner_contact_email: Optional[str] = None
    owner_contact_address: Optional[str] = None
    cancellation_policy: str = "Standard"
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    is_off_market: bool = False
    weekend_multiplier: float = 1.2
    long_stay_discount_7: float = 0
    long_stay_discount_14: float = 0
    long_stay_discount_30: float = 0
    cleaning_fee: float = 0
    instant_book: bool = True

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

# ==================== NEW MODELS FOR PRIVATE OFFERS & PAYMENTS ====================

class PrivateOffer(BaseModel):
    """Time-limited private offer for negotiated bookings"""
    model_config = ConfigDict(extra="ignore")
    offer_id: str = Field(default_factory=lambda: f"offer_{uuid.uuid4().hex[:12]}")
    villa_id: Optional[str] = None  # None for an off-catalog villa the company represents
    villa_name: str
    villa_location: Optional[str] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[int] = None
    map_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    amenities: List[str] = []
    # Guest details
    guest_name: str
    guest_email: str
    guest_phone: str
    # Booking details
    check_in: str
    check_out: str
    num_guests: int
    num_nights: int
    # Custom pricing
    base_amount: float  # Negotiated base price
    addons_total: float = 0
    discount_percent: float = 0
    discount_amount: float = 0
    subtotal: float
    gst_amount: float
    security_deposit: float
    total_amount: float
    # Commission & payout
    commission_percent: float
    commission_amount: float
    owner_payout: float
    # Offer validity
    expires_at: datetime  # When this offer link expires
    payment_link: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    # Status
    status: str = "pending"  # pending, accepted, expired, cancelled
    notes: Optional[str] = None
    created_by: str  # Admin user who created the offer
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PrivateOfferCreate(BaseModel):
    villa_id: Optional[str] = None  # omit + set custom_villa_name for an off-catalog villa
    custom_villa_name: Optional[str] = None
    custom_villa_location: Optional[str] = None
    custom_bedrooms: Optional[int] = None
    custom_bathrooms: Optional[int] = None
    custom_map_link: Optional[str] = None
    amenities: List[str] = []  # catalog villa: defaults to its own list if left empty; custom villa: picked manually
    guest_name: str
    guest_email: str
    guest_phone: str
    check_in: str
    check_out: str
    num_guests: int
    # Negotiated pricing
    custom_per_night: float  # Custom per-night rate
    discount_percent: float = 0
    security_deposit: Optional[float] = None  # Override villa default
    addons: List[Dict[str, Any]] = []
    notes: Optional[str] = None
    expiry_hours: int = 48  # How long the offer is valid

class EventPricing(BaseModel):
    """Special event date pricing (NYE, Diwali, etc.)"""
    model_config = ConfigDict(extra="ignore")
    event_id: str = Field(default_factory=lambda: f"event_{uuid.uuid4().hex[:12]}")
    name: str  # "New Year's Eve 2025", "Diwali 2025"
    villa_id: Optional[str] = None  # None = applies to all villas
    start_date: str
    end_date: str
    price_multiplier: float = 1.5  # Multiplier on base price
    min_nights: int = 3  # Minimum nights during this event
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SeasonalPricing(BaseModel):
    """Seasonal pricing rules"""
    model_config = ConfigDict(extra="ignore")
    season_id: str = Field(default_factory=lambda: f"season_{uuid.uuid4().hex[:12]}")
    name: str  # "Peak Season", "Off Season"
    villa_id: Optional[str] = None  # None = applies to all villas
    start_date: str  # MM-DD format for recurring
    end_date: str  # MM-DD format for recurring
    price_multiplier: float = 1.0
    is_recurring: bool = True  # True = every year
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OwnerPayout(BaseModel):
    """Track payouts to villa owners"""
    model_config = ConfigDict(extra="ignore")
    payout_id: str = Field(default_factory=lambda: f"payout_{uuid.uuid4().hex[:12]}")
    owner_id: str
    owner_name: str
    owner_email: str
    villa_id: str
    villa_name: str
    booking_id: str
    booking_check_in: str
    booking_check_out: str
    # Financial details
    gross_amount: float  # Total booking amount (excl security deposit)
    commission_percent: float
    commission_amount: float
    net_payable: float  # What owner receives
    # Payment status
    status: str = "pending"  # pending, paid, on_hold
    paid_date: Optional[str] = None
    payment_reference: Optional[str] = None  # Bank transfer ref
    payment_mode: Optional[str] = None  # bank_transfer, upi, cash
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaymentSettings(BaseModel):
    """Admin payment gateway settings"""
    model_config = ConfigDict(extra="ignore")
    setting_id: str = "payment_settings_main"
    razorpay_key_id: Optional[str] = None
    razorpay_key_secret: Optional[str] = None
    razorpay_webhook_secret: Optional[str] = None
    is_live_mode: bool = False  # False = test mode
    partial_payment_enabled: bool = True
    min_advance_percent: float = 30.0  # Minimum advance payment %
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPost(BaseModel):
    """Blog post with SEO optimization"""
    model_config = ConfigDict(extra="ignore")
    post_id: str = Field(default_factory=lambda: f"post_{uuid.uuid4().hex[:12]}")
    slug: str  # URL-friendly slug
    title: str
    excerpt: str  # Short description for cards
    content: str  # Full blog content (supports markdown)
    featured_image: str
    category: str  # Travel Guide, Destinations, Travel Tips, Villa Guide
    tags: List[str] = []
    # SEO fields
    meta_title: Optional[str] = None  # Falls back to title if not set
    meta_description: Optional[str] = None  # Falls back to excerpt if not set
    meta_keywords: List[str] = []
    canonical_url: Optional[str] = None
    # Author & dates
    author: str = "Team Travaholic"
    published_date: str  # Display date
    read_time: str = "5 min read"
    # Status
    status: str = "draft"  # draft, published, archived
    is_featured: bool = False
    # Related content
    related_villa_ids: List[str] = []  # Link to specific villas
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BlogPostCreate(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    featured_image: str
    category: str
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    meta_keywords: List[str] = []
    author: str = "Team Travaholic"
    published_date: str
    read_time: str = "5 min read"
    status: str = "draft"
    is_featured: bool = False
    related_villa_ids: List[str] = []

class Coupon(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coupon_id: str = Field(default_factory=lambda: f"coupon_{uuid.uuid4().hex[:12]}")
    code: str  # e.g., "WELCOME10", "SUMMER2026"
    description: Optional[str] = None
    discount_type: str = "percentage"  # "percentage" or "fixed"
    discount_value: float  # e.g., 10 for 10% or 5000 for ₹5000 off
    min_booking_value: float = 0  # Minimum subtotal required
    max_discount: Optional[float] = None  # Cap for percentage discounts
    valid_from: Optional[str] = None  # ISO date string
    valid_to: Optional[str] = None  # ISO date string
    usage_limit: Optional[int] = None  # Max total uses, None = unlimited
    used_count: int = 0
    per_user_limit: int = 1  # Uses per customer
    applicable_villas: List[str] = []  # Empty = all villas
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CouponCreate(BaseModel):
    code: str
    description: Optional[str] = None
    discount_type: str = "percentage"
    discount_value: float
    min_booking_value: float = 0
    max_discount: Optional[float] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    usage_limit: Optional[int] = None
    per_user_limit: int = 1
    applicable_villas: List[str] = []
    is_active: bool = True

class CouponValidateRequest(BaseModel):
    code: str
    villa_id: str
    subtotal: float  # Amount before coupon discount

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

class ManualBookingCreate(BaseModel):
    """Model for admin-created manual bookings"""
    villa_id: str
    guest_name: str
    guest_email: EmailStr
    guest_phone: str
    check_in: str
    check_out: str
    num_guests: int
    # Custom pricing (admin can override)
    tariff_per_night: float
    total_nights: int
    total_booking_amount: float
    security_deposit: float = 20000
    advance_amount: float = 0
    balance_amount: float = 0
    # Payment tracking
    payment_status: str = "pending"  # pending, advance_received, full_received
    advance_received: bool = False
    advance_received_date: Optional[str] = None
    full_payment_received: bool = False
    full_payment_received_date: Optional[str] = None
    # Additional info
    special_requests: Optional[str] = None
    extra_pax_charge: float = 0
    extra_pax_count: int = 0
    notes: Optional[str] = None

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
    nature: str = "general_enquiry"  # booking, listing_villa, general_enquiry, other
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
    nature: str = "general_enquiry"
    message: Optional[str] = None

class HomeownerListing(BaseModel):
    model_config = ConfigDict(extra="ignore")
    listing_id: str = Field(default_factory=lambda: f"listing_{uuid.uuid4().hex[:12]}")
    owner_name: str
    owner_email: EmailStr
    owner_phone: str
    owner_instagram: Optional[str] = None
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
    owner_instagram: Optional[str] = None
    villa_name: str
    villa_location: str
    bedrooms: int
    bathrooms: int
    has_pool: bool = False
    amenities: List[str] = []
    description: Optional[str] = None
    images: List[str] = []

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

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

async def _create_session_response(user_doc: Dict[str, Any]) -> Dict[str, Any]:
    session_token = f"sess_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_doc["user_id"],
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)

    return {
        "user_id": user_doc["user_id"],
        "email": user_doc["email"],
        "name": user_doc["name"],
        "picture": user_doc.get("picture"),
        "role": user_doc.get("role", "guest"),
        "session_token": session_token
    }

@api_router.post("/auth/register")
async def register(data: RegisterRequest):
    """Create a new account with email/password"""
    existing_user = await db.users.find_one({"email": data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists")

    hashed_password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    user_doc = {
        "user_id": f"user_{uuid.uuid4().hex[:12]}",
        "email": data.email,
        "name": data.name,
        "picture": None,
        "role": "guest",
        "hashed_password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)

    return await _create_session_response(user_doc)

@api_router.post("/auth/login")
async def login(data: LoginRequest):
    """Log in with email/password"""
    user_doc = await db.users.find_one({"email": data.email})
    if user_doc and user_doc.get("invite_token") and not user_doc.get("hashed_password"):
        raise HTTPException(status_code=401, detail="This account was invited but hasn't been activated yet. Use your invite link to set a password first.")
    if not user_doc or not user_doc.get("hashed_password"):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not bcrypt.checkpw(data.password.encode(), user_doc["hashed_password"].encode()):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return await _create_session_response(user_doc)

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

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6)

@api_router.post("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user: User = Depends(require_auth)):
    """Let any logged-in user (admin, owner, or guest) change their own password."""
    user_doc = await db.users.find_one({"user_id": user.user_id})
    if not user_doc or not user_doc.get("hashed_password"):
        raise HTTPException(status_code=400, detail="This account doesn't have a password set yet")
    if not bcrypt.checkpw(data.current_password.encode(), user_doc["hashed_password"].encode()):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    new_hashed = bcrypt.hashpw(data.new_password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"hashed_password": new_hashed}}
    )
    return {"message": "Password updated successfully"}

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
    min_bedrooms: Optional[int] = None,
    has_pool: Optional[bool] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    check_in: Optional[str] = None,
    check_out: Optional[str] = None,
    limit: int = 50,
    skip: int = 0,
    include_unlisted: bool = False,
    user: Optional[User] = Depends(get_current_user),
):
    """Get all active villas with optional filters. Admins passing
    include_unlisted=true (the admin Villas page does) also see inactive
    and off-market villas - everyone else only ever sees what's actually
    live on the public site, regardless of this flag."""
    is_admin = bool(user and user.role == "admin")
    query: Dict[str, Any] = {"$and": []}
    if not (is_admin and include_unlisted):
        query["$or"] = [{"is_active": True}, {"is_active": {"$exists": False}}]
        # Exclude off-market villas from public listing
        query["$and"].append({"$or": [{"is_off_market": False}, {"is_off_market": {"$exists": False}}]})

    if check_in and check_out:
        # Villas whose "accepting bookings from" date is still in the future
        # relative to the requested check-in are excluded entirely.
        query["$and"].append({"$or": [
            {"bookings_open_from": {"$exists": False}},
            {"bookings_open_from": None},
            {"bookings_open_from": {"$lte": check_in}},
        ]})
        # Any villa with a blocked/booked range overlapping the requested
        # dates is unavailable for those dates - exclude by villa_id.
        unavailable_villa_ids = await db.blocked_dates.distinct("villa_id", {
            "start_date": {"$lte": check_out},
            "end_date": {"$gte": check_in},
        })
        if unavailable_villa_ids:
            query["villa_id"] = {"$nin": unavailable_villa_ids}

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
    if min_bedrooms:
        query["bedrooms"] = {"$gte": min_bedrooms}
    if has_pool is True:
        query["has_pool"] = True
    if min_price:
        query["base_price"] = {"$gte": min_price}
    if max_price:
        if "base_price" in query:
            query["base_price"]["$lte"] = max_price
        else:
            query["base_price"] = {"$lte": max_price}

    if not query["$and"]:
        del query["$and"]  # MongoDB rejects an empty $and array

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
    # A pasted Google Maps link (not a maps.app.goo.gl short link) usually
    # has the precise pin coordinates in it - auto-fill latitude/longitude
    # from it so admins only have to paste one thing.
    if doc.get("map_link") and not (doc.get("latitude") and doc.get("longitude")):
        lat, lng = _extract_latlng_from_map_link(doc["map_link"])
        if lat and lng:
            doc["latitude"], doc["longitude"] = lat, lng
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.villas.insert_one(doc)
    return villa

@api_router.put("/villas/{villa_id}")
async def update_villa(villa_id: str, villa_data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update a villa (admin only)"""
    if villa_data.get("map_link") and not (villa_data.get("latitude") and villa_data.get("longitude")):
        lat, lng = _extract_latlng_from_map_link(villa_data["map_link"])
        if lat and lng:
            villa_data["latitude"], villa_data["longitude"] = lat, lng
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

# ==================== IMAGE UPLOAD ====================
# Images are stored base64-encoded in MongoDB (no external storage service
# configured) - resized/compressed on upload to keep documents small.

MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10MB raw upload cap, before compression

@api_router.post("/admin/upload-image")
async def upload_image(file: UploadFile = File(...), user: User = Depends(require_admin)):
    """Upload an image (admin only) - resizes and stores it in MongoDB,
    returns a URL to reference it from a villa's images/thumbnail fields."""
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    try:
        img = Image.open(BytesIO(raw))
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    max_dimension = 1920
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    compressed = buffer.getvalue()

    image_id = f"img_{uuid.uuid4().hex[:16]}"
    await db.images.insert_one({
        "image_id": image_id,
        "data": base64.b64encode(compressed).decode(),
        "content_type": "image/jpeg",
        "uploaded_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": f"/api/images/{image_id}"}

@api_router.post("/list-villa/upload-image")
async def upload_listing_image(file: UploadFile = File(...)):
    """Upload a photo for a prospective owner's villa listing (no auth -
    this is a public form). Same resize/compress pipeline as the admin
    upload, just tagged differently so these can be told apart from
    villa-catalog images if needed."""
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 10MB)")

    try:
        img = Image.open(BytesIO(raw))
        img = img.convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image")

    max_dimension = 1920
    if img.width > max_dimension or img.height > max_dimension:
        img.thumbnail((max_dimension, max_dimension), Image.LANCZOS)

    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    compressed = buffer.getvalue()

    image_id = f"img_{uuid.uuid4().hex[:16]}"
    await db.images.insert_one({
        "image_id": image_id,
        "data": base64.b64encode(compressed).decode(),
        "content_type": "image/jpeg",
        "uploaded_by": "public_listing",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {"url": f"/api/images/{image_id}"}

@api_router.get("/images/{image_id}")
async def get_image(image_id: str):
    """Serve a previously uploaded image (public - villa photos are public marketing content)"""
    doc = await db.images.find_one({"image_id": image_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Image not found")
    raw = base64.b64decode(doc["data"])
    return Response(content=raw, media_type=doc.get("content_type", "image/jpeg"))

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

# ==================== ICAL SYNC (AIRBNB) ====================
#
# Real two-way, real-time sync with Airbnb isn't available to individual
# hosts without becoming an Airbnb-certified channel manager - this
# implements the standard workaround every small property manager uses:
#   - Export: /villas/{id}/calendar.ics publishes Travaholic's booked/
#     blocked dates as a feed. Paste that URL into Airbnb's listing
#     calendar under "Sync calendars" -> "Import calendar" so Airbnb
#     blocks those dates too.
#   - Import: an admin pastes the villa's Airbnb "export calendar" link
#     (from that same Airbnb settings page) into airbnb_ical_url, then
#     triggers /admin/villas/{id}/sync-airbnb-calendar (manually, or on
#     a schedule via Render Cron Jobs hitting that endpoint) to pull
#     Airbnb's bookings in as blocked_dates so Travaholic won't double-book.

def _generate_ical_feed(villa_id: str, villa_name: str, blocked_dates: list) -> str:
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Travaholic Stays//Villa Calendar//EN",
        "CALSCALE:GREGORIAN",
    ]
    for block in blocked_dates:
        start = block["start_date"].replace("-", "")
        # iCal DTEND is exclusive - bump one day past our inclusive end_date
        end_dt = datetime.strptime(block["end_date"], "%Y-%m-%d") + timedelta(days=1)
        end = end_dt.strftime("%Y%m%d")
        lines += [
            "BEGIN:VEVENT",
            f"UID:{block['block_id']}@travaholicstays.com",
            f"DTSTAMP:{now_stamp}",
            f"DTSTART;VALUE=DATE:{start}",
            f"DTEND;VALUE=DATE:{end}",
            f"SUMMARY:Booked - {villa_name} (Travaholic)",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(lines)

@api_router.get("/villas/{villa_id}/calendar.ics")
async def get_villa_ical_feed(villa_id: str):
    """Public iCal feed of this villa's booked/blocked dates - paste this
    URL into Airbnb's 'Import calendar' setting to keep Airbnb blocked too."""
    villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0, "name": 1})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    blocked = await db.blocked_dates.find({"villa_id": villa_id}, {"_id": 0}).to_list(1000)
    ics = _generate_ical_feed(villa_id, villa["name"], blocked)
    return Response(
        content=ics,
        media_type="text/calendar",
        headers={"Content-Disposition": f'inline; filename="{villa_id}.ics"'}
    )

def _parse_ical_events(ics_text: str) -> List[Dict[str, str]]:
    """Minimal VEVENT extractor - pulls UID/DTSTART/DTEND out of raw iCal
    text with regex rather than pulling in a full icalendar dependency.
    Handles both DATE (YYYYMMDD) and DATE-TIME (YYYYMMDDTHHMMSSZ) forms.
    Also pulls the "Reservation URL" out of DESCRIPTION when present -
    Airbnb's export calendar doesn't include guest name/phone/email (a
    platform privacy restriction), but it does link each reservation back
    to its detail page on the Airbnb host dashboard, which is the closest
    thing to "more booking details" we can surface from this feed."""
    # Unfold RFC 5545 line continuations (CRLF/LF followed by a space)
    # before matching DESCRIPTION, since Airbnb wraps long values -
    # without this, a folded Reservation URL line would get truncated.
    unfolded = re.sub(r"\r?\n[ \t]", "", ics_text)
    events = []
    for block in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", unfolded, re.DOTALL):
        uid_m = re.search(r"UID:(.+)", block)
        start_m = re.search(r"DTSTART[^:]*:(\d{8})", block)
        end_m = re.search(r"DTEND[^:]*:(\d{8})", block)
        if not (uid_m and start_m and end_m):
            continue
        start_date = f"{start_m.group(1)[:4]}-{start_m.group(1)[4:6]}-{start_m.group(1)[6:8]}"
        end_raw = end_m.group(1)
        end_dt = datetime.strptime(end_raw, "%Y%m%d") - timedelta(days=1)  # DTEND is exclusive
        url_m = re.search(r"Reservation URL:\s*(\S+)", block)
        events.append({
            "uid": uid_m.group(1).strip(),
            "start_date": start_date,
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "reservation_url": url_m.group(1).strip() if url_m else None,
        })
    return events

@api_router.post("/admin/villas/{villa_id}/sync-airbnb-calendar")
async def sync_airbnb_calendar(villa_id: str, user: User = Depends(require_admin)):
    """Fetch this villa's Airbnb export-calendar link and mirror its
    booked dates into blocked_dates (reason=airbnb_sync) so Travaholic
    won't accept bookings that overlap an Airbnb reservation. Replaces
    the previous airbnb_sync blocks wholesale each run, so cancellations
    on Airbnb's side correctly clear here too."""
    villa = await db.villas.find_one({"villa_id": villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    ical_url = villa.get("airbnb_ical_url")
    if not ical_url:
        raise HTTPException(status_code=400, detail="No Airbnb iCal URL configured for this villa")

    try:
        req = urllib.request.Request(ical_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            ics_text = resp.read().decode("utf-8", errors="ignore")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch Airbnb calendar: {e}")

    events = _parse_ical_events(ics_text)

    await db.blocked_dates.delete_many({"villa_id": villa_id, "reason": "airbnb_sync"})
    if events:
        docs = [{
            "block_id": f"block_{uuid.uuid4().hex[:12]}",
            "villa_id": villa_id,
            "start_date": e["start_date"],
            "end_date": e["end_date"],
            "reason": "airbnb_sync",
            "booking_id": None,
            "reservation_url": e.get("reservation_url"),
            "created_by": user.user_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
        } for e in events]
        await db.blocked_dates.insert_many(docs)

    return {"message": f"Synced {len(events)} blocked date range(s) from Airbnb", "synced_count": len(events)}

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

def calculate_booking_price(villa: Dict, check_in: str, check_out: str, addons: List[Dict], overrides: List[Dict], event_pricing: List[Dict] = None) -> Dict:
    """Calculate total booking price with dynamic pricing, events, and long-stay discounts"""
    from datetime import datetime
    
    start = datetime.strptime(check_in, "%Y-%m-%d")
    end = datetime.strptime(check_out, "%Y-%m-%d")
    num_nights = (end - start).days
    
    base_price = villa.get("base_price", 0)
    weekend_price = villa.get("weekend_price") or base_price
    weekend_multiplier = villa.get("weekend_multiplier", 1.2)
    
    # If no specific weekend price, calculate from multiplier
    if not villa.get("weekend_price"):
        weekend_price = base_price * weekend_multiplier
    
    # Create override lookup
    override_map = {}
    for override in overrides:
        o_start = datetime.strptime(override["start_date"], "%Y-%m-%d")
        o_end = datetime.strptime(override["end_date"], "%Y-%m-%d")
        current = o_start
        while current <= o_end:
            override_map[current.strftime("%Y-%m-%d")] = override["price"]
            current += timedelta(days=1)
    
    # Create event pricing lookup
    event_map = {}
    event_min_nights = num_nights  # Track minimum nights from events
    if event_pricing:
        for event in event_pricing:
            if not event.get("is_active", True):
                continue
            # Check if event applies to this villa
            if event.get("villa_id") and event["villa_id"] != villa.get("villa_id"):
                continue
            e_start = datetime.strptime(event["start_date"], "%Y-%m-%d")
            e_end = datetime.strptime(event["end_date"], "%Y-%m-%d")
            current = e_start
            while current <= e_end:
                event_map[current.strftime("%Y-%m-%d")] = event["price_multiplier"]
                current += timedelta(days=1)
            # Check if booking overlaps with event
            if start <= e_end and end >= e_start:
                event_min_nights = max(event_min_nights, event.get("min_nights", 1))
    
    # Calculate per-night prices
    total_base = 0
    price_breakdown = []
    current = start
    while current < end:
        date_str = current.strftime("%Y-%m-%d")
        day_price = base_price
        price_type = "weekday"
        
        # Check for manual override first (highest priority)
        if date_str in override_map:
            day_price = override_map[date_str]
            price_type = "override"
        # Then check for event pricing
        elif date_str in event_map:
            multiplier = event_map[date_str]
            if current.weekday() >= 5:
                day_price = weekend_price * multiplier
                price_type = "event_weekend"
            else:
                day_price = base_price * multiplier
                price_type = "event"
        # Weekend pricing
        elif current.weekday() >= 5:
            day_price = weekend_price
            price_type = "weekend"
        
        total_base += day_price
        price_breakdown.append({
            "date": date_str,
            "price": day_price,
            "type": price_type
        })
        current += timedelta(days=1)
    
    # Apply long-stay discounts
    long_stay_discount_percent = 0
    if num_nights >= 30:
        long_stay_discount_percent = villa.get("long_stay_discount_30", 0)
    elif num_nights >= 14:
        long_stay_discount_percent = villa.get("long_stay_discount_14", 0)
    elif num_nights >= 7:
        long_stay_discount_percent = villa.get("long_stay_discount_7", 0)
    
    long_stay_discount_amount = 0
    if long_stay_discount_percent > 0:
        long_stay_discount_amount = (total_base * long_stay_discount_percent) / 100
        total_base -= long_stay_discount_amount
    
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
    
    # Add cleaning fee
    cleaning_fee = villa.get("cleaning_fee", 0)
    
    subtotal = total_base + addons_total + cleaning_fee
    
    # Calculate GST (18%)
    gst_percent = 18.0
    gst_amount = round(subtotal * (gst_percent / 100), 2)
    subtotal_with_gst = subtotal + gst_amount
    
    security_deposit = villa.get("security_deposit") or 20000
    total_amount = subtotal_with_gst + security_deposit
    
    commission_percent = villa.get("commission_percent", 30.0)
    commission_amount = (subtotal * commission_percent) / 100
    owner_payout = subtotal - commission_amount
    
    return {
        "num_nights": num_nights,
        "base_amount": total_base,
        "long_stay_discount_percent": long_stay_discount_percent,
        "long_stay_discount_amount": long_stay_discount_amount,
        "cleaning_fee": cleaning_fee,
        "addons": addon_details,
        "addons_total": addons_total,
        "subtotal": subtotal,
        "gst_percent": gst_percent,
        "gst_amount": gst_amount,
        "subtotal_with_gst": subtotal_with_gst,
        "security_deposit": security_deposit,
        "total_amount": total_amount,
        "commission_percent": commission_percent,
        "commission_amount": commission_amount,
        "owner_payout": owner_payout,
        "price_breakdown": price_breakdown[:7] if len(price_breakdown) > 7 else price_breakdown  # First 7 days for display
    }

@api_router.post("/bookings/calculate-price")
async def calculate_price(data: Dict[str, Any]):
    """Calculate booking price without creating a booking"""
    villa = await db.villas.find_one({"villa_id": data["villa_id"]}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    # Get pricing overrides
    overrides = await db.pricing_overrides.find({"villa_id": data["villa_id"]}, {"_id": 0}).to_list(1000)
    
    # Get event pricing (both villa-specific and global)
    event_pricing = await db.event_pricing.find({
        "$or": [
            {"villa_id": data["villa_id"]},
            {"villa_id": None},
            {"villa_id": {"$exists": False}}
        ],
        "is_active": True
    }, {"_id": 0}).to_list(100)
    
    # Get addon details
    addons = []
    for addon_req in data.get("addons", []):
        addon = await db.addons.find_one({"addon_id": addon_req["addon_id"]}, {"_id": 0})
        if addon:
            addons.append({**addon, "quantity": addon_req.get("quantity", 1)})
    
    pricing = calculate_booking_price(villa, data["check_in"], data["check_out"], addons, overrides, event_pricing)
    return pricing

def villa_maps_link(villa: dict) -> Optional[str]:
    """Best available Google Maps link for a villa - prefers a
    previously-saved map_link (the exact link an admin pasted in, often
    more precise than a lat/lng-derived one), then falls back to
    coordinates, then a plain address/location text search."""
    if villa.get("map_link"):
        return villa["map_link"]
    if villa.get("latitude") and villa.get("longitude"):
        return f"https://www.google.com/maps?q={villa['latitude']},{villa['longitude']}"
    address = villa.get("address") or ", ".join(p for p in [villa.get("location", ""), villa.get("region", "")] if p)
    if address:
        return f"https://www.google.com/maps?q={urllib.parse.quote(address)}"
    return None

def send_whatsapp_booking_confirmation(booking: dict, villa: dict):
    """Best-effort WhatsApp confirmation via Twilio. No-ops silently if
    Twilio isn't configured (see TWILIO_* env vars above) - same
    graceful-degradation pattern as the Resend email and Razorpay payment
    integrations elsewhere in this file."""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        return
    try:
        digits = "".join(ch for ch in booking.get("guest_phone", "") if ch.isdigit())
        if not digits:
            return
        # Assume an Indian number when no country code was entered
        to_number = digits if len(digits) > 10 else f"91{digits}"
        total = booking.get("total_booking_amount", booking.get("total_amount", 0))
        security = booking.get("security_deposit") or 20000
        maps_link = villa_maps_link(villa)
        address = villa.get("address") or ", ".join(p for p in [villa.get("location", ""), villa.get("region", "")] if p)
        fallback_message = (
            f"Thank you for your booking at {villa.get('name')}, Travaholic Stays!\n\n"
            f"This is subject to receipt of payment.\n\n"
            f"Villa: {villa.get('name')}\n"
            + (f"Address: {address}\n" if address else "")
            + f"Check-in: {booking.get('check_in')}\n"
            f"Check-out: {booking.get('check_out')}\n"
            f"Guests: {booking.get('num_guests')}\n"
            f"Total: Rs. {total:,.0f}\n"
            f"Security Deposit: Rs. {security:,.0f} (payable separately, refundable at checkout)\n"
            f"Booking ID: {booking.get('booking_id')}\n\n"
            + (f"Map: {maps_link}\n\n" if maps_link else "")
            + f"Your full proposal - tariff breakdown, bank details for payment, "
            f"amenities and house rules - has been emailed to you."
        )
        _send_whatsapp(
            to_number,
            TWILIO_TEMPLATE_BOOKING_PROPOSAL,
            {
                "1": villa.get("name", ""),
                "2": booking.get("check_in", ""),
                "3": booking.get("check_out", ""),
                "4": str(booking.get("num_guests", "")),
                "5": f"{total:,.0f}",
                "6": f"{security:,.0f}",
                "7": booking.get("booking_id", ""),
            },
            fallback_message,
        )
        logging.info(f"WhatsApp confirmation sent to +{to_number}")
    except Exception as e:
        logging.error(f"Failed to send WhatsApp confirmation: {e}")


def send_whatsapp_payment_update(booking: dict, villa: dict, payment_type: str, amount: float):
    """Best-effort WhatsApp receipt for an advance or full payment. Same
    no-op-if-unconfigured pattern as send_whatsapp_booking_confirmation."""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        return
    try:
        digits = "".join(ch for ch in booking.get("guest_phone", "") if ch.isdigit())
        if not digits:
            return
        to_number = digits if len(digits) > 10 else f"91{digits}"
        guest_first_name = (booking.get("guest_name") or "there").split(" ")[0]
        villa_name = villa.get("name", "")

        if payment_type == "advance":
            balance = booking.get("balance_amount", 0)
            fallback_message = (
                f"Hi {guest_first_name}, we've received your advance payment of "
                f"Rs. {amount:,.0f} for {villa_name}.\n\n"
                f"Balance due: Rs. {balance:,.0f}\n"
                f"Check-in: {booking.get('check_in')}\n"
                f"Check-out: {booking.get('check_out')}\n\n"
                f"Thank you for choosing Travaholic Stays!"
            )
            _send_whatsapp(
                to_number,
                TWILIO_TEMPLATE_ADVANCE_PAYMENT,
                {
                    "1": guest_first_name,
                    "2": f"{amount:,.0f}",
                    "3": villa_name,
                    "4": f"{balance:,.0f}",
                    "5": booking.get("check_in", ""),
                    "6": booking.get("check_out", ""),
                },
                fallback_message,
            )
        else:
            fallback_message = (
                f"Hi {guest_first_name}, your booking at {villa_name} is now confirmed!\n\n"
                f"Full payment of Rs. {amount:,.0f} received.\n"
                f"Check-in: {booking.get('check_in')}\n"
                f"Check-out: {booking.get('check_out')}\n"
                f"Booking ID: {booking.get('booking_id')}\n\n"
                f"We can't wait to host you. Full details have been emailed to you."
            )
            _send_whatsapp(
                to_number,
                TWILIO_TEMPLATE_BOOKING_CONFIRMED,
                {
                    "1": guest_first_name,
                    "2": villa_name,
                    "3": f"{amount:,.0f}",
                    "4": booking.get("check_in", ""),
                    "5": booking.get("check_out", ""),
                    "6": booking.get("booking_id", ""),
                },
                fallback_message,
            )
        logging.info(f"WhatsApp payment update sent to +{to_number}")
    except Exception as e:
        logging.error(f"Failed to send WhatsApp payment update: {e}")


def send_whatsapp_private_offer(offer: dict, payment_link: str):
    """Best-effort WhatsApp notification when a private offer is sent to a
    guest. Same no-op-if-unconfigured pattern as the other WhatsApp sends."""
    if not twilio_client or not TWILIO_WHATSAPP_FROM:
        return
    try:
        digits = "".join(ch for ch in offer.get("guest_phone", "") if ch.isdigit())
        if not digits:
            return
        to_number = digits if len(digits) > 10 else f"91{digits}"
        guest_first_name = (offer.get("guest_name") or "there").split(" ")[0]
        expires_at = offer.get("expires_at", "")
        try:
            expires_display = datetime.fromisoformat(expires_at).strftime("%d %b %Y, %I:%M %p")
        except Exception:
            expires_display = expires_at

        fallback_message = (
            f"Hi {guest_first_name}, we've put together a private offer for "
            f"{offer.get('villa_name', '')}.\n\n"
            f"Check-in: {offer.get('check_in')}\n"
            f"Check-out: {offer.get('check_out')}\n"
            f"Total: Rs. {offer.get('total_amount', 0):,.0f}\n\n"
            f"View and confirm your offer: {payment_link}\n"
            f"This offer expires on {expires_display}."
        )
        _send_whatsapp(
            to_number,
            TWILIO_TEMPLATE_PRIVATE_OFFER,
            {
                "1": guest_first_name,
                "2": offer.get("villa_name", ""),
                "3": offer.get("check_in", ""),
                "4": offer.get("check_out", ""),
                "5": f"{offer.get('total_amount', 0):,.0f}",
                "6": payment_link,
                "7": expires_display,
            },
            fallback_message,
        )
        logging.info(f"WhatsApp private offer sent to +{to_number}")
    except Exception as e:
        logging.error(f"Failed to send WhatsApp private offer: {e}")

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    """Create a new booking"""
    villa = await db.villas.find_one({"villa_id": booking_data.villa_id}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")

    # Villas can have a date before which they aren't taking bookings yet
    # (e.g. a newly-listed villa not ready for guests until renovations
    # finish) - YYYY-MM-DD strings compare correctly as plain strings.
    bookings_open_from = villa.get("bookings_open_from")
    if bookings_open_from and booking_data.check_in < bookings_open_from:
        raise HTTPException(
            status_code=400,
            detail=f"This villa is only accepting bookings from {bookings_open_from} onwards"
        )

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
    doc["is_online_booking"] = True
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
    
    # Send booking proposal email (booking details, bank details, amenities,
    # house rules as a PDF attachment) for online bookings
    try:
        resend_key = os.environ.get("RESEND_API_KEY")
        if resend_key and not resend_key.startswith("re_placeholder"):
            resend.api_key = resend_key
            proposal_pdf = generate_booking_confirmation_pdf(
                doc, villa,
                document_title="BOOKING PROPOSAL",
                intro_text="Thank you for choosing Travaholic Stays! Please find your booking proposal below and attached as a PDF, including the tariff breakdown, bank details for payment, villa amenities and house rules."
            )
            resend.Emails.send({
                "from": "Travaholic Stays <bookings@travaholicstays.com>",
                "to": [booking_data.guest_email],
                "subject": f"Your Booking Proposal - {villa['name']} | Travaholic Stays",
                "html": generate_booking_received_email(doc, villa),
                "attachments": [{
                    "filename": pdf_filename(booking_data.guest_name, villa.get("name")),
                    "content": list(proposal_pdf.getvalue()),
                }],
            })
            logging.info(f"Proposal email sent to {booking_data.guest_email}")
    except Exception as e:
        logging.error(f"Failed to send email: {e}")

    # WhatsApp confirmation (best-effort, no-ops if Twilio isn't configured)
    send_whatsapp_booking_confirmation(doc, villa)

    # Generate WhatsApp link for the booking
    booking_dict = doc.copy()
    booking_dict.pop("_id", None)

    return booking

@api_router.get("/bookings/{booking_id}/proposal-pdf")
async def get_booking_proposal_pdf(booking_id: str):
    """Publicly viewable booking proposal PDF - booking details, bank account
    details, amenities and house rules. Linked from the checkout page right
    after a booking is submitted, and from the proposal email."""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    villa = await db.villas.find_one({"villa_id": booking["villa_id"]}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")

    pdf_buffer = generate_booking_confirmation_pdf(
        booking, villa,
        document_title="BOOKING PROPOSAL",
        intro_text="Thank you for choosing Travaholic Stays! Please find below your booking proposal, including the tariff breakdown, bank details for payment, villa amenities and house rules."
    )

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{pdf_filename(booking.get("guest_name"), villa.get("name"))}"'
        }
    )

# ==================== MANUAL BOOKING (ADMIN) ====================

def generate_booking_confirmation_pdf(
    booking_data: dict,
    villa: dict,
    document_title: str = "BOOKING CONFIRMATION",
    intro_text: str = "Greetings from Travaholic Stays! We look forward to hosting you in Goa.",
) -> BytesIO:
    """Generate a professional booking confirmation / proposal / private
    offer PDF - brand colors and fonts matching the website, logo in the
    header, laid out to run exactly 2 pages (page 1: stay + pricing + bank
    details, page 2: policies + house rules + amenities)."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=45, leftMargin=45, topMargin=40, bottomMargin=36)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='BrandTitle', fontName=PDF_FONT_BOLD, fontSize=17, textColor=PDF_INK, alignment=TA_RIGHT, leading=19))
    styles.add(ParagraphStyle(name='BrandTagline', fontName=PDF_FONT, fontSize=8, textColor=PDF_MUTED, alignment=TA_RIGHT))
    styles.add(ParagraphStyle(name='DocTitle', fontName=PDF_FONT_BOLD, fontSize=13, textColor=PDF_GOLD_DARK))
    styles.add(ParagraphStyle(name='MetaText', fontName=PDF_FONT, fontSize=8.5, textColor=PDF_MUTED, alignment=TA_RIGHT, leading=12))
    styles.add(ParagraphStyle(name='SectionHeader', fontName=PDF_FONT_BOLD, fontSize=10.5, textColor=PDF_INK, spaceBefore=10, spaceAfter=5))
    styles.add(ParagraphStyle(name='BodyTextStyle', fontName=PDF_FONT, fontSize=9, textColor=PDF_INK, spaceAfter=4, leading=12.5))
    styles.add(ParagraphStyle(name='BoldText', fontName=PDF_FONT_BOLD, fontSize=9.5, textColor=PDF_INK, spaceAfter=4))
    styles.add(ParagraphStyle(name='SmallText', fontName=PDF_FONT, fontSize=7.5, textColor=PDF_MUTED, spaceAfter=3, leading=10.5))
    styles.add(ParagraphStyle(name='Footer', fontName=PDF_FONT, fontSize=7.5, textColor=PDF_MUTED, alignment=TA_CENTER))
    styles.add(ParagraphStyle(name='TableLabel', fontName=PDF_FONT_BOLD, fontSize=8.5, textColor=PDF_MUTED))
    styles.add(ParagraphStyle(name='TableValue', fontName=PDF_FONT, fontSize=9, textColor=PDF_INK))

    elements = []

    # ---- Header: logo + wordmark/tagline ----
    logo_cell = ""
    if PDF_LOGO_PATH.exists():
        try:
            logo_cell = RLImage(str(PDF_LOGO_PATH), width=100, height=100)
        except Exception:
            logo_cell = ""
    header_text = [
        Paragraph("TRAVAHOLIC STAYS", styles['BrandTitle']),
        Paragraph("Ultra-Luxury Villas in Goa &amp; Beyond", styles['BrandTagline']),
    ]
    header_table = Table([[logo_cell, header_text]], colWidths=[104, 361])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
    ]))
    elements.append(header_table)
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=1.2, color=PDF_GOLD, spaceAfter=10))

    # ---- Title + date/reference ----
    title_row = Table(
        [[Paragraph(document_title, styles['DocTitle']),
          Paragraph(f"Date: {datetime.now().strftime('%d %b %Y')}<br/>Reference: {booking_data.get('booking_id', 'N/A')}", styles['MetaText'])]],
        colWidths=[280, 185]
    )
    title_row.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    elements.append(title_row)
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(f"Dear {booking_data['guest_name']},", styles['BoldText']))
    elements.append(Paragraph(intro_text, styles['BodyTextStyle']))
    elements.append(Spacer(1, 6))

    # ---- Stay details: villa + booking info side by side ----
    elements.append(Paragraph("STAY DETAILS", styles['SectionHeader']))
    num_nights_val = booking_data.get('total_nights') or booking_data.get('num_nights') or 0
    location_parts = [p for p in [villa.get('location', ''), villa.get('region', 'Goa')] if p]
    villa_rows = [
        ("Villa", villa.get('name', 'N/A')),
        ("Location", ", ".join(location_parts) or "N/A"),
        ("Bedrooms", f"{villa.get('bedrooms', 3)} BHK"),
    ]
    booking_rows = [
        ("Check-in", f"{booking_data['check_in']}  -  2:00 PM"),
        ("Check-out", f"{booking_data['check_out']}  -  11:00 AM"),
        ("Nights", str(num_nights_val)),
        ("Guests", f"{booking_data['num_guests']} pax"),
    ]
    max_rows = max(len(villa_rows), len(booking_rows))
    villa_rows += [("", "")] * (max_rows - len(villa_rows))
    booking_rows += [("", "")] * (max_rows - len(booking_rows))
    stay_data = [
        [Paragraph(vl, styles['TableLabel']), Paragraph(vv, styles['TableValue']),
         Paragraph(bl, styles['TableLabel']), Paragraph(bv, styles['TableValue'])]
        for (vl, vv), (bl, bv) in zip(villa_rows, booking_rows)
    ]
    stay_table = Table(stay_data, colWidths=[62, 172, 65, 171])
    stay_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    elements.append(stay_table)
    if villa.get('address'):
        elements.append(Paragraph(f"<b>Address:</b> {villa['address']}", styles['SmallText']))
    maps_link = villa_maps_link(villa)
    if maps_link:
        elements.append(Paragraph(f'<b>Location:</b> <link href="{maps_link}" color="#A8875C"><u>View on Google Maps</u></link>', styles['SmallText']))
    elements.append(Spacer(1, 6))

    # ---- Villa features (right after stay details, ahead of pricing) ----
    elements.append(Paragraph("VILLA FEATURES &amp; INCLUSIONS", styles['SectionHeader']))
    features = villa.get('amenities', [])
    features_text = "&nbsp;&nbsp;•&nbsp;&nbsp;".join(features[:14]) if features else \
        "Private Pool&nbsp;&nbsp;•&nbsp;&nbsp;Housekeeping&nbsp;&nbsp;•&nbsp;&nbsp;WiFi&nbsp;&nbsp;•&nbsp;&nbsp;Air Conditioning&nbsp;&nbsp;•&nbsp;&nbsp;Smart TV&nbsp;&nbsp;•&nbsp;&nbsp;Full Kitchen&nbsp;&nbsp;•&nbsp;&nbsp;Parking"
    elements.append(Paragraph(features_text, styles['BodyTextStyle']))
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("<b>Additional services on request:</b> Private Chef, Spa Session, BBQ Night, Decoration, Airport Transfers", styles['BodyTextStyle']))
    elements.append(Spacer(1, 6))

    # ---- Pricing ----
    elements.append(Paragraph("PRICING BREAKDOWN", styles['SectionHeader']))
    tariff_per_night = booking_data.get('tariff_per_night')
    if tariff_per_night is None:
        if booking_data.get('base_amount') and num_nights_val:
            tariff_per_night = booking_data['base_amount'] / num_nights_val
        else:
            tariff_per_night = villa.get('base_price', 0)
    total_amount = booking_data.get('total_booking_amount', booking_data.get('total_amount', 0))
    security = booking_data.get('security_deposit')
    if security is None:
        security = villa.get('security_deposit', 20000)

    pricing_rows = [
        ("Tariff per night", f"₹{tariff_per_night:,.0f}"),
        ("Total Booking Amount", f"₹{total_amount:,.0f}  (incl. GST)"),
        ("Security Deposit", f"₹{security:,.0f}  (refundable at checkout)"),
    ]
    if booking_data.get('addons_total', 0) > 0:
        pricing_rows.insert(1, ("Add-ons", f"₹{booking_data['addons_total']:,.0f}"))
    if booking_data.get('extra_pax_charge', 0) > 0:
        pricing_rows.insert(1, ("Extra Pax Charge", f"₹{booking_data['extra_pax_charge']:,.0f}"))
    if booking_data.get('advance_amount', 0) > 0:
        pricing_rows.append(("Advance Paid", f"₹{booking_data['advance_amount']:,.0f}"))
        balance = booking_data.get('balance_amount', total_amount - booking_data['advance_amount'])
        pricing_rows.append(("Balance Due", f"₹{balance:,.0f}"))

    pricing_data = [[Paragraph(l, styles['TableLabel']), Paragraph(v, styles['TableValue'])] for l, v in pricing_rows]
    pricing_table = Table(pricing_data, colWidths=[220, 250])
    pricing_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor("#E5E0D8")),
        ('BACKGROUND', (0, -1), (-1, -1), PDF_CREAM),
        ('BOX', (0, 0), (-1, -1), 0.75, PDF_GOLD),
    ]))
    elements.append(pricing_table)
    elements.append(Spacer(1, 4))
    elements.append(Paragraph("Security deposit is payable separately (cash/UPI to the caretaker at check-in) and is fully refundable at checkout, subject to no damage to the property.", styles['SmallText']))
    elements.append(Spacer(1, 8))

    # ---- Bank details ----
    elements.append(Paragraph("BANK DETAILS FOR PAYMENT", styles['SectionHeader']))
    bank_data = [
        [Paragraph("Bank:", styles['TableLabel']), Paragraph("Standard Chartered Bank", styles['TableValue']),
         Paragraph("Account No.:", styles['TableLabel']), Paragraph("52105900326", styles['TableValue'])],
        [Paragraph("Account Name:", styles['TableLabel']), Paragraph("TRAVAHOLIC", styles['TableValue']),
         Paragraph("IFSC:", styles['TableLabel']), Paragraph("SCBL0036033", styles['TableValue'])],
        [Paragraph("Branch:", styles['TableLabel']), Paragraph("GK-1, Delhi", styles['TableValue']), "", ""],
    ]
    bank_table = Table(bank_data, colWidths=[75, 165, 65, 165])
    bank_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (0, 0), (-1, -1), PDF_CREAM),
        ('BOX', (0, 0), (-1, -1), 0.75, PDF_GOLD),
    ]))
    elements.append(bank_table)

    # ---- Page 2: house rules, ID requirements, cancellation policy ----
    elements.append(PageBreak())

    elements.append(Paragraph("HOUSE RULES", styles['SectionHeader']))
    house_rules = [
        "<b>No Drugs</b> - strictly prohibited on the premises",
        "<b>No Smoking Indoors</b> - balconies/outdoor areas only; ₹10,000 cleaning fee otherwise",
        "<b>Guest Registration</b> - accurate guest details required; strict no-visitor policy",
        "<b>Peaceful Community</b> - no loud music or parties past 10 PM",
        "<b>Extra Guests</b> - base rate covers 6 pax; ₹2,000/person beyond that",
        "<b>Check-in / Check-out</b> - 2:00 PM / 11:00 AM (early/late subject to availability)",
    ]
    for rule in house_rules:
        elements.append(Paragraph(f"•&nbsp; {rule}", styles['BodyTextStyle']))
    elements.append(Spacer(1, 6))

    elements.append(Paragraph("ID REQUIREMENTS", styles['SectionHeader']))
    elements.append(Paragraph(
        "Valid photo ID and address proof are required for all guests at check-in. "
        "<b>PAN cards are not accepted.</b> Check-in cannot proceed without valid documents "
        "(treated as a no-show, non-refundable).", styles['BodyTextStyle']))
    elements.append(Spacer(1, 6))

    elements.append(Paragraph("CANCELLATION POLICY", styles['SectionHeader']))
    elements.append(Paragraph(
        "<b>100% refund</b> - cancelled 30+ days before check-in&nbsp;&nbsp;|&nbsp;&nbsp;"
        "<b>50% refund</b> - cancelled 15-30 days before check-in&nbsp;&nbsp;|&nbsp;&nbsp;"
        "<b>No refund</b> - cancelled within 15 days of check-in", styles['BodyTextStyle']))
    elements.append(Spacer(1, 20))

    # ---- Footer ----
    elements.append(HRFlowable(width="100%", thickness=0.75, color=PDF_GOLD, spaceAfter=8))
    elements.append(Paragraph("Warm regards, Team Travaholic", styles['BoldText']))
    elements.append(Paragraph("Travaholic Stays&nbsp;&nbsp;|&nbsp;&nbsp;+91 99588 71283&nbsp;&nbsp;|&nbsp;&nbsp;www.travaholicstays.com&nbsp;&nbsp;|&nbsp;&nbsp;@travaholicstays", styles['Footer']))

    doc.build(elements)
    buffer.seek(0)
    return buffer

@api_router.post("/admin/manual-booking")
async def create_manual_booking(booking_data: ManualBookingCreate, user: User = Depends(require_admin)):
    """Create a manual booking (admin only)"""
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
    
    # Calculate commission
    commission_percent = villa.get("commission_percent", 30)
    commission_amount = booking_data.total_booking_amount * (commission_percent / 100)
    owner_payout = booking_data.total_booking_amount - commission_amount
    
    # Create booking ID
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    
    booking = {
        "booking_id": booking_id,
        "villa_id": booking_data.villa_id,
        "villa_name": villa["name"],
        "guest_name": booking_data.guest_name,
        "guest_email": booking_data.guest_email,
        "guest_phone": booking_data.guest_phone,
        "check_in": booking_data.check_in,
        "check_out": booking_data.check_out,
        "num_guests": booking_data.num_guests,
        "num_nights": booking_data.total_nights,
        "tariff_per_night": booking_data.tariff_per_night,
        "base_price": booking_data.tariff_per_night,
        "base_amount": booking_data.tariff_per_night * booking_data.total_nights,
        "extra_pax_charge": booking_data.extra_pax_charge,
        "extra_pax_count": booking_data.extra_pax_count,
        "addons_total": 0,
        "subtotal": booking_data.total_booking_amount,
        "security_deposit": booking_data.security_deposit,
        "total_amount": booking_data.total_booking_amount,
        "total_booking_amount": booking_data.total_booking_amount,
        "advance_amount": booking_data.advance_amount,
        "balance_amount": booking_data.balance_amount or (booking_data.total_booking_amount - booking_data.advance_amount),
        "commission_percent": commission_percent,
        "commission_amount": commission_amount,
        "owner_payout": owner_payout,
        "payment_status": booking_data.payment_status,
        "advance_received": booking_data.advance_received,
        "advance_received_date": booking_data.advance_received_date,
        "full_payment_received": booking_data.full_payment_received,
        "full_payment_received_date": booking_data.full_payment_received_date,
        "booking_status": "pending",
        "special_requests": booking_data.special_requests,
        "notes": booking_data.notes,
        "is_manual_booking": True,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.bookings.insert_one(booking)
    
    # Block the dates
    block = {
        "block_id": f"block_{uuid.uuid4().hex[:12]}",
        "villa_id": booking_data.villa_id,
        "start_date": booking_data.check_in,
        "end_date": booking_data.check_out,
        "reason": "booking",
        "booking_id": booking_id,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.blocked_dates.insert_one(block)
    
    # Remove _id from response
    booking.pop("_id", None)
    return booking

@api_router.post("/admin/bookings/{booking_id}/mark-payment")
async def mark_payment_received(
    booking_id: str,
    payment_type: str = Query(..., description="advance or full"),
    amount: float = Query(None),
    send_confirmation: bool = Query(True),
    payment_mode: str = Query("upi", description="upi, online, card, cash, cheque"),
    user: User = Depends(require_admin)
):
    """Mark payment as received and optionally send confirmation"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    villa = await db.villas.find_one({"villa_id": booking["villa_id"]}, {"_id": 0})
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if payment_type == "advance":
        update_data["advance_received"] = True
        update_data["advance_received_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        update_data["advance_payment_mode"] = payment_mode
        update_data["payment_status"] = "advance_received"
        if amount:
            update_data["advance_amount"] = amount
            update_data["balance_amount"] = booking.get("total_booking_amount", booking.get("total_amount", 0)) - amount
    elif payment_type == "full":
        update_data["full_payment_received"] = True
        update_data["full_payment_received_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        update_data["full_payment_mode"] = payment_mode
        update_data["payment_status"] = "full_received"
        update_data["booking_status"] = "confirmed"
        update_data["balance_amount"] = 0
    
    await db.bookings.update_one({"booking_id": booking_id}, {"$set": update_data})

    # Send a payment-receipt email whenever a payment is recorded - advance
    # or full - not just once at final confirmation.
    confirmation_sent = False
    if send_confirmation and payment_type in ("advance", "full"):
        updated_booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if payment_type == "advance":
            received_amount = amount if amount is not None else updated_booking.get("advance_amount", 0)
            received_mode = payment_mode
            subject = f"Advance Payment Received - {villa['name']} | Travaholic Stays"
        else:
            received_amount = amount if amount is not None else booking.get("balance_amount", booking.get("total_booking_amount", booking.get("total_amount", 0)))
            received_mode = payment_mode
            subject = f"Booking Confirmed - {villa['name']} | Travaholic Stays"

        try:
            resend_key = os.environ.get("RESEND_API_KEY")
            if resend_key and not resend_key.startswith("re_"):
                resend.api_key = resend_key
                resend.Emails.send({
                    "from": "Travaholic Stays <bookings@travaholicstays.com>",
                    "to": [updated_booking["guest_email"]],
                    "subject": subject,
                    "html": generate_confirmation_email_html(
                        updated_booking, villa,
                        payment_type=payment_type, payment_amount=received_amount, payment_mode=received_mode,
                    )
                })
                confirmation_sent = True
        except Exception as e:
            logging.error(f"Failed to send email: {e}")

        try:
            send_whatsapp_payment_update(updated_booking, villa, payment_type, received_amount)
        except Exception as e:
            logging.error(f"Failed to send WhatsApp payment update: {e}")

    return {
        "message": f"Payment marked as {payment_type}",
        "confirmation_sent": confirmation_sent,
        "booking_status": update_data.get("booking_status", booking.get("booking_status")),
        "payment_status": update_data.get("payment_status")
    }

@api_router.get("/admin/bookings/{booking_id}/confirmation-pdf")
async def get_booking_confirmation_pdf(booking_id: str, user: User = Depends(require_admin)):
    """Generate and download booking confirmation PDF"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    villa = await db.villas.find_one({"villa_id": booking["villa_id"]}, {"_id": 0})
    if not villa:
        raise HTTPException(status_code=404, detail="Villa not found")
    
    pdf_buffer = generate_booking_confirmation_pdf(booking, villa)
    
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_filename(booking.get("guest_name"), villa.get("name"))}"'
        }
    )

def generate_confirmation_email_html(
    booking: dict, villa: dict,
    payment_type: Optional[str] = None,
    payment_amount: Optional[float] = None,
    payment_mode: Optional[str] = None,
) -> str:
    """Generate HTML email for booking confirmation. When payment_type is
    "advance" or "full", a payment-received receipt is shown at the top -
    this same email doubles as the receipt sent whenever a payment is
    recorded, not just once at final confirmation."""
    gst_amount = booking.get('gst_amount', 0)
    subtotal = booking.get('subtotal', 0)
    receipt_html = ""
    if payment_type and payment_amount is not None:
        mode_label = (payment_mode or "").upper()
        if payment_type == "advance":
            balance = booking.get('balance_amount', 0)
            receipt_html = f"""
                <div class="section" style="border-left-color:{EMAIL_GOLD};">
                    <h2>PAYMENT RECEIPT</h2>
                    <div class="detail-row">
                        <span class="label">Advance Received</span>
                        <span class="value">₹{payment_amount:,.0f}{' via ' + mode_label if mode_label else ''}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Balance Due</span>
                        <span class="value">₹{balance:,.0f}</span>
                    </div>
                </div>
            """
        else:
            receipt_html = f"""
                <div class="section" style="border-left-color:{EMAIL_GOLD};">
                    <h2>PAYMENT RECEIPT</h2>
                    <div class="detail-row">
                        <span class="label">Full Payment Received</span>
                        <span class="value">₹{payment_amount:,.0f}{' via ' + mode_label if mode_label else ''}</span>
                    </div>
                </div>
            """
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica', Arial, sans-serif; color: {EMAIL_INK}; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: {EMAIL_INK}; color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid {EMAIL_GOLD}; }}
            .header img {{ width: 96px; height: 96px; margin-bottom: 10px; }}
            .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 1px; color: #ffffff; }}
            .header p {{ color: {EMAIL_GOLD}; }}
            .content {{ padding: 30px; background: {EMAIL_CREAM}; }}
            .section {{ background: white; padding: 20px; margin-bottom: 20px; border-left: 4px solid {EMAIL_GOLD}; }}
            .section h2 {{ color: {EMAIL_GOLD_DARK}; font-size: 16px; margin-top: 0; }}
            .detail-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }}
            .label {{ color: {EMAIL_MUTED}; }}
            .value {{ font-weight: bold; color: {EMAIL_INK}; }}
            .total {{ background: {EMAIL_INK}; color: white; padding: 15px; text-align: right; font-size: 18px; }}
            .footer {{ text-align: center; padding: 20px; color: {EMAIL_MUTED}; font-size: 12px; }}
            .cta {{ background: {EMAIL_GOLD_DARK}; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{EMAIL_LOGO_URL}" alt="Travaholic Stays" />
                <h1>TRAVAHOLIC STAYS</h1>
                <p style="margin: 5px 0 0 0;">{"Payment Received" if payment_type else "Booking Confirmed"}</p>
            </div>

            <div class="content">
                <p>Dear <strong>{booking['guest_name']}</strong>,</p>
                <p>Greetings from Travaholic Stays! {"We've received your payment - thank you." if payment_type else "Your booking has been confirmed."} We look forward to hosting you in Goa.</p>
                {receipt_html}
                <div class="section">
                    <h2>VILLA DETAILS</h2>
                    <div class="detail-row">
                        <span class="label">Villa</span>
                        <span class="value">{villa['name']}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Location</span>
                        <span class="value">{villa.get('location', '')}, {villa.get('region', 'Goa')}</span>
                    </div>
                    {f'<div class="detail-row"><span class="label">Map</span><span class="value"><a href="{villa_maps_link(villa)}">View on Google Maps</a></span></div>' if villa_maps_link(villa) else ''}
                </div>

                <div class="section">
                    <h2>BOOKING DETAILS</h2>
                    <div class="detail-row">
                        <span class="label">Check-in</span>
                        <span class="value">{booking['check_in']} (2:00 PM)</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-out</span>
                        <span class="value">{booking['check_out']} (11:00 AM)</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Guests</span>
                        <span class="value">{booking['num_guests']} pax</span>
                    </div>
                </div>
                
                <div class="section">
                    <h2>PAYMENT SUMMARY</h2>
                    <div class="detail-row">
                        <span class="label">Subtotal</span>
                        <span class="value">₹{subtotal:,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">GST (18%)</span>
                        <span class="value">₹{gst_amount:,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Total Amount</span>
                        <span class="value">₹{booking.get('total_amount', 0):,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Security Deposit</span>
                        <span class="value">₹{booking.get('security_deposit', 20000):,.0f} (Refundable at checkout)</span>
                    </div>
                </div>
                
                <div class="section">
                    <h2>IMPORTANT REMINDERS</h2>
                    <ul style="padding-left: 20px; color: #666;">
                        <li>Check-in: 2:00 PM | Check-out: 11:00 AM</li>
                        <li>Please carry valid photo ID (PAN card not accepted)</li>
                        <li>Security deposit to be paid at check-in</li>
                        <li>No smoking inside the villa</li>
                    </ul>
                </div>
                
                <p style="text-align: center;">
                    <a href="https://wa.me/919958871283" class="cta">Contact Us on WhatsApp</a>
                </p>
            </div>
            
            <div class="footer">
                <p><strong>Travaholic Stays</strong></p>
                <p>+91 99588 71283 | www.travaholicstays.com</p>
                <p>@travaholicstays on Instagram</p>
            </div>
        </div>
    </body>
    </html>
    """

def generate_booking_received_email(booking: dict, villa: dict) -> str:
    """Generate HTML email for booking received (before payment confirmation)"""
    gst_amount = booking.get('gst_amount', 0)
    subtotal = booking.get('subtotal', 0)
    total = booking.get('total_amount', 0)
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica', Arial, sans-serif; color: {EMAIL_INK}; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: {EMAIL_INK}; color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid {EMAIL_GOLD}; }}
            .header img {{ width: 96px; height: 96px; margin-bottom: 10px; }}
            .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 1px; color: #ffffff; }}
            .header p {{ color: {EMAIL_GOLD}; }}
            .content {{ padding: 30px; background: {EMAIL_CREAM}; }}
            .section {{ background: white; padding: 20px; margin-bottom: 20px; border-left: 4px solid {EMAIL_GOLD}; }}
            .section h2 {{ color: {EMAIL_GOLD_DARK}; font-size: 16px; margin-top: 0; }}
            .detail-row {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
            .label {{ color: {EMAIL_MUTED}; display: inline-block; width: 45%; }}
            .value {{ font-weight: bold; color: {EMAIL_INK}; }}
            .bank-details {{ background: {EMAIL_CREAM}; padding: 15px; border: 1px solid {EMAIL_GOLD}; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: {EMAIL_MUTED}; font-size: 12px; }}
            .cta {{ background: {EMAIL_GOLD_DARK}; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; margin: 10px 0; }}
            .highlight {{ background: #FBF3E3; padding: 15px; border-left: 4px solid {EMAIL_GOLD}; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{EMAIL_LOGO_URL}" alt="Travaholic Stays" />
                <h1>TRAVAHOLIC STAYS</h1>
                <p style="margin: 5px 0 0 0;">Booking Request Received</p>
            </div>

            <div class="content">
                <p>Dear <strong>{booking['guest_name']}</strong>,</p>
                <p>Thank you for your booking request! We have received your inquiry and our team will confirm your booking once payment is received.</p>
                
                <div class="section">
                    <h2>BOOKING SUMMARY</h2>
                    <div class="detail-row">
                        <span class="label">Villa:</span>
                        <span class="value">{villa['name']}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Location:</span>
                        <span class="value">{villa.get('location', '')}, {villa.get('region', 'Goa')}</span>
                    </div>
                    {f'<div class="detail-row"><span class="label">Map:</span><span class="value"><a href="{villa_maps_link(villa)}">View on Google Maps</a></span></div>' if villa_maps_link(villa) else ''}
                    <div class="detail-row">
                        <span class="label">Check-in:</span>
                        <span class="value">{booking['check_in']} (2:00 PM)</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-out:</span>
                        <span class="value">{booking['check_out']} (11:00 AM)</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Guests:</span>
                        <span class="value">{booking['num_guests']} pax</span>
                    </div>
                </div>
                
                <div class="section">
                    <h2>PAYMENT DETAILS</h2>
                    <div class="detail-row">
                        <span class="label">Subtotal:</span>
                        <span class="value">₹{subtotal:,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">GST (18%):</span>
                        <span class="value">₹{gst_amount:,.0f}</span>
                    </div>
                    <div class="detail-row" style="font-size: 18px; padding-top: 15px;">
                        <span class="label"><strong>Total Amount:</strong></span>
                        <span class="value" style="color: {EMAIL_GOLD_DARK};">₹{total:,.0f}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Security Deposit:</span>
                        <span class="value">₹{booking.get('security_deposit', 20000):,.0f} (Payable at check-in, refundable at checkout)</span>
                    </div>
                </div>
                
                <div class="bank-details">
                    <h3 style="margin-top: 0; color: {EMAIL_GOLD_DARK};">Bank Details for Payment</h3>
                    <p style="margin: 5px 0;"><strong>Bank:</strong> Standard Chartered Bank</p>
                    <p style="margin: 5px 0;"><strong>Account Name:</strong> TRAVAHOLIC</p>
                    <p style="margin: 5px 0;"><strong>Account No:</strong> 52105900326</p>
                    <p style="margin: 5px 0;"><strong>IFSC:</strong> SCBL0036033</p>
                    <p style="margin: 5px 0;"><strong>Branch:</strong> GK-1, Delhi</p>
                </div>
                
                <div class="highlight">
                    <strong>Next Steps:</strong>
                    <ol style="margin: 10px 0 0 0; padding-left: 20px;">
                        <li>Make payment via UPI or bank transfer</li>
                        <li>Share payment screenshot on WhatsApp</li>
                        <li>Receive confirmation within 2 hours</li>
                    </ol>
                </div>
                
                <p style="text-align: center;">
                    <a href="https://wa.me/919958871283?text=Hi%20Travaholic%2C%20I%20have%20made%20payment%20for%20booking%20at%20{villa['name'].replace(' ', '%20')}" class="cta">Share Payment on WhatsApp</a>
                </p>
            </div>
            
            <div class="footer">
                <p><strong>Travaholic Stays</strong></p>
                <p>+91 99588 71283 | www.travaholicstays.com</p>
                <p>@travaholicstays on Instagram</p>
            </div>
        </div>
    </body>
    </html>
    """

@api_router.get("/admin/bookings/{booking_id}/whatsapp-message")
async def get_whatsapp_confirmation_message(booking_id: str, user: User = Depends(require_admin)):
    """Get pre-formatted WhatsApp confirmation message"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    villa = await db.villas.find_one({"villa_id": booking["villa_id"]}, {"_id": 0})
    
    message = f"""🏡 *BOOKING CONFIRMED*
_Travaholic Stays_

Dear *{booking['guest_name']}*,

Greetings! Your booking has been confirmed. ✅

📍 *Villa:* {villa['name']}
📍 *Location:* {villa.get('location', '')}, Goa

📅 *Check-in:* {booking['check_in']} (2:00 PM)
📅 *Check-out:* {booking['check_out']} (11:00 AM)
👥 *Guests:* {booking['num_guests']} pax

💰 *Total Amount:* ₹{booking.get('total_booking_amount', booking.get('total_amount', 0)):,.0f}
🔒 *Security Deposit:* ₹{booking.get('security_deposit', 20000):,.0f} (Refundable at checkout)

📋 *Important Reminders:*
• Please carry valid photo ID (PAN not accepted)
• Security deposit at check-in
• No smoking inside the villa
• Check-in: 2 PM | Check-out: 11 AM

We look forward to hosting you! 🌴

_Team Travaholic_
📞 +91 99588 71283
🌐 www.travaholicstays.com"""
    
    # Generate WhatsApp link
    encoded_message = urllib.parse.quote(message)
    whatsapp_link = f"https://wa.me/{booking['guest_phone'].replace('+', '').replace(' ', '')}?text={encoded_message}"
    
    return {
        "message": message,
        "whatsapp_link": whatsapp_link,
        "guest_phone": booking['guest_phone']
    }

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

@api_router.get("/admin/calendar")
async def get_admin_calendar(villa_id: Optional[str] = None, user: User = Depends(require_admin)):
    """Unified calendar feed for the admin booking calendar: every booking
    (website or private-offer sourced) plus every Airbnb-synced blocked
    date range, in one shape the frontend can render without knowing
    which collection each event came from. Airbnb's export calendar
    doesn't include guest identity, so airbnb_block events carry no
    guest_name/phone/email - that's a platform limitation, not a gap
    in this endpoint."""
    booking_query: Dict[str, Any] = {}
    if villa_id:
        booking_query["villa_id"] = villa_id
    bookings = await db.bookings.find(booking_query, {"_id": 0}).sort("check_in", 1).to_list(2000)

    block_query: Dict[str, Any] = {"reason": "airbnb_sync"}
    if villa_id:
        block_query["villa_id"] = villa_id
    airbnb_blocks = await db.blocked_dates.find(block_query, {"_id": 0}).sort("start_date", 1).to_list(2000)

    villa_ids_needed = {b["villa_id"] for b in airbnb_blocks}
    villa_names = {}
    if villa_ids_needed:
        villas = await db.villas.find(
            {"villa_id": {"$in": list(villa_ids_needed)}}, {"villa_id": 1, "name": 1, "_id": 0}
        ).to_list(1000)
        villa_names = {v["villa_id"]: v["name"] for v in villas}

    events = []
    for b in bookings:
        events.append({
            "id": b["booking_id"],
            "type": "booking",
            "source": "private_offer" if b.get("private_offer_id") else "website",
            "villa_id": b["villa_id"],
            "villa_name": b.get("villa_name"),
            "guest_name": b.get("guest_name"),
            "guest_phone": b.get("guest_phone"),
            "guest_email": b.get("guest_email"),
            "check_in": b["check_in"],
            "check_out": b["check_out"],
            "booking_status": b.get("booking_status"),
            "payment_status": b.get("payment_status"),
            "total_amount": b.get("total_amount"),
        })
    for blk in airbnb_blocks:
        events.append({
            "id": blk["block_id"],
            "type": "airbnb_block",
            "source": "airbnb",
            "villa_id": blk["villa_id"],
            "villa_name": villa_names.get(blk["villa_id"]),
            "guest_name": None,
            "guest_phone": None,
            "guest_email": None,
            "check_in": blk["start_date"],
            "check_out": blk["end_date"],
            "booking_status": None,
            "payment_status": None,
            "total_amount": None,
            # Airbnb's export calendar never includes guest identity (a
            # platform privacy restriction) but does link each reservation
            # back to its detail page on the Airbnb host dashboard when
            # the calendar was synced after that field was added.
            "reservation_url": blk.get("reservation_url"),
        })

    return {"events": events}

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
    """Update booking (admin only). Setting commission_percent recomputes
    commission_amount and owner_payout off the booking's subtotal, so an
    admin can override the commission on a single booking (e.g. a
    one-off deal) without having to hand-calculate the payout."""
    if "commission_percent" in data and "commission_amount" not in data:
        existing = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
        if not existing:
            raise HTTPException(status_code=404, detail="Booking not found")
        subtotal = data.get("subtotal", existing.get("subtotal", 0))
        commission_amount = subtotal * (data["commission_percent"] / 100)
        data["commission_amount"] = commission_amount
        data["owner_payout"] = subtotal - commission_amount

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
                "to": [os.environ.get("ADMIN_EMAIL", "Travaholicstays@gmail.com")],
                "subject": f"New Lead: {lead.name} ({lead.nature.replace('_', ' ').title()})",
                "html": f"""
                    <h2>New {lead.nature.replace('_', ' ').title()} Lead</h2>
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
    """Get all villa owners (admin only), each with how many villas are
    currently assigned to them and whether their invite is still pending."""
    owners = await db.users.find({"role": "owner"}, {"_id": 0, "hashed_password": 0}).to_list(1000)
    for o in owners:
        o["villa_count"] = await db.villas.count_documents({"owner_id": o["user_id"]})
        o["invite_pending"] = bool(o.get("invite_token"))
    return {"owners": owners}

@api_router.put("/users/{user_id}/role")
async def update_user_role(user_id: str, data: Dict[str, Any], admin: User = Depends(require_admin)):
    """Update user role (admin only)"""
    result = await db.users.update_one({"user_id": user_id}, {"$set": {"role": data["role"]}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated = await db.users.find_one({"user_id": user_id}, {"_id": 0, "hashed_password": 0})
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

@api_router.post("/admin/seed-blog-posts")
async def seed_blog_posts(user: User = Depends(require_admin)):
    """One-click import of the launch blog posts (admin only) - upserts by
    slug, safe to click more than once."""
    import json as _json

    data_path = ROOT_DIR / "scripts" / "blog_posts_data.json"
    if not data_path.exists():
        raise HTTPException(status_code=500, detail="Blog post data file not found on server")

    with open(data_path) as f:
        posts = _json.load(f)["posts"]

    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    updated = 0
    for post in posts:
        set_fields = {
            "status": "published",
            "related_villa_ids": [],
            "canonical_url": None,
            "updated_at": now,
            **post,
        }
        result = await db.blog_posts.update_one(
            {"slug": post["slug"]},
            {
                "$set": set_fields,
                "$setOnInsert": {
                    "post_id": f"post_{uuid.uuid4().hex[:12]}",
                    "created_at": now,
                },
            },
            upsert=True,
        )
        if result.upserted_id:
            inserted += 1
        else:
            updated += 1

    return {"message": "Blog posts seeded", "inserted": inserted, "updated": updated}

# ==================== MAKE ADMIN (TEMPORARY - FOR SETUP) ====================

@api_router.post("/make-admin")
async def make_current_user_admin(user: User = Depends(require_auth)):
    """Bootstrap the very first admin account on a fresh deploy. Once any
    admin exists, this stays locked - use the invite flow instead
    (Admin > Team > Invite Admin)."""
    existing_admin = await db.users.find_one({"role": "admin"})

    if existing_admin and existing_admin.get("user_id") != user.user_id:
        raise HTTPException(status_code=403, detail="An admin already exists. Ask them to invite you instead.")

    # Update user role to admin
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {"role": "admin"}}
    )

    return {"message": f"User {user.email} is now an admin", "role": "admin"}

class InviteAdminRequest(BaseModel):
    email: EmailStr
    name: str

class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=6)

def _check_invite_not_expired(user_doc: Dict[str, Any]):
    expires_at = user_doc.get("invite_expires_at")
    if not expires_at:
        return
    exp = datetime.fromisoformat(expires_at)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This invite link has expired")

@api_router.get("/admin/team")
async def list_admin_team(admin: User = Depends(require_admin)):
    """List all admin users, including pending invites (for the Team page)"""
    admins = await db.users.find({"role": "admin"}, {"_id": 0, "hashed_password": 0}).to_list(100)
    for a in admins:
        a["invite_pending"] = bool(a.get("invite_token"))
    return {"admins": admins}

@api_router.delete("/admin/team/{user_id}")
async def remove_admin_team_member(user_id: str, admin: User = Depends(require_admin)):
    """Remove an admin (or revoke a pending invite) from the Team page."""
    if user_id == admin.user_id:
        raise HTTPException(status_code=400, detail="You can't remove yourself.")

    target = await db.users.find_one({"user_id": user_id, "role": "admin"})
    if not target:
        raise HTTPException(status_code=404, detail="Admin not found")

    admin_count = await db.users.count_documents({"role": "admin"})
    if admin_count <= 1:
        raise HTTPException(status_code=400, detail="Can't remove the last remaining admin.")

    await db.users.delete_one({"user_id": user_id})
    return {"message": "Removed"}

@api_router.post("/admin/invite-admin")
async def invite_admin(data: InviteAdminRequest, admin: User = Depends(require_admin)):
    """Invite someone by email to become an admin. Returns a one-time invite
    token for a shareable link - the invitee sets their own password when
    they open it. Also attempts to email it if Resend is configured."""
    existing = await db.users.find_one({"email": data.email})
    invite_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    if existing:
        if existing.get("hashed_password"):
            raise HTTPException(status_code=400, detail="A user with this email already has an account.")
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {
                "name": data.name,
                "role": "admin",
                "invite_token": invite_token,
                "invite_expires_at": expires_at.isoformat(),
            }}
        )
    else:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": data.email,
            "name": data.name,
            "picture": None,
            "role": "admin",
            "hashed_password": None,
            "invite_token": invite_token,
            "invite_expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    try:
        resend_key = os.environ.get("RESEND_API_KEY")
        if resend_key and not resend_key.startswith("re_placeholder"):
            resend.api_key = resend_key
            resend.Emails.send({
                "from": "Travaholic Stays <onboarding@travaholicstays.com>",
                "to": [data.email],
                "subject": "You've been invited to Travaholic Stays admin",
                "html": f"<p>Hi {data.name},</p><p>You've been invited as an admin on Travaholic Stays. Use the link the person who invited you shared with you to set your password and log in.</p>"
            })
    except Exception as e:
        logger.error(f"Failed to send invite email: {e}")

    return {"message": "Invite created", "invite_token": invite_token, "email": data.email}

class InviteOwnerRequest(BaseModel):
    email: EmailStr
    name: str
    phone: Optional[str] = None
    address: Optional[str] = None
    company_name: Optional[str] = None

@api_router.post("/admin/invite-owner")
async def invite_owner(data: InviteOwnerRequest, admin: User = Depends(require_admin)):
    """Add a villa owner and invite them to log into the owner portal.
    Same one-time invite-link pattern as invite_admin: the owner sets
    their own password when they open the link - the admin never sees
    or sets it. Villas can then be assigned to this owner (owner_id) from
    the villa admin form. Also attempts to email it if Resend is configured."""
    existing = await db.users.find_one({"email": data.email})
    invite_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    profile_fields = {
        "name": data.name,
        "role": "owner",
        "phone": data.phone,
        "address": data.address,
        "company_name": data.company_name,
    }

    if existing:
        if existing.get("hashed_password"):
            raise HTTPException(status_code=400, detail="A user with this email already has an account.")
        await db.users.update_one(
            {"user_id": existing["user_id"]},
            {"$set": {
                **profile_fields,
                "invite_token": invite_token,
                "invite_expires_at": expires_at.isoformat(),
            }}
        )
        owner_user_id = existing["user_id"]
    else:
        owner_user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": owner_user_id,
            "email": data.email,
            "picture": None,
            "hashed_password": None,
            "invite_token": invite_token,
            "invite_expires_at": expires_at.isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
            **profile_fields,
        })

    try:
        resend_key = os.environ.get("RESEND_API_KEY")
        if resend_key and not resend_key.startswith("re_placeholder"):
            resend.api_key = resend_key
            resend.Emails.send({
                "from": "Travaholic Stays <onboarding@travaholicstays.com>",
                "to": [data.email],
                "subject": "You've been invited to the Travaholic Stays owner portal",
                "html": f"<p>Hi {data.name},</p><p>You've been added as a villa owner on Travaholic Stays. Use the link the person who invited you shared with you to set your password and log in to view your villa's bookings and payouts.</p>"
            })
        else:
            logger.info(f"Resend not configured - skipped invite email to {data.email}")
    except Exception as e:
        logger.error(f"Failed to send invite email: {e}")

    return {"message": "Owner invited", "invite_token": invite_token, "email": data.email, "user_id": owner_user_id}

@api_router.delete("/admin/owners/{owner_id}")
async def remove_owner(owner_id: str, admin: User = Depends(require_admin)):
    """Remove an owner account (or revoke a pending invite). Blocked while
    villas are still assigned to them, so a villa never ends up pointing
    at an owner_id that no longer resolves to anything."""
    target = await db.users.find_one({"user_id": owner_id, "role": "owner"})
    if not target:
        raise HTTPException(status_code=404, detail="Owner not found")

    assigned_count = await db.villas.count_documents({"owner_id": owner_id})
    if assigned_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Reassign or unassign this owner's {assigned_count} villa(s) before removing them."
        )

    await db.users.delete_one({"user_id": owner_id})
    return {"message": "Removed"}

@api_router.get("/auth/invite/{token}")
async def get_invite(token: str):
    """Look up a pending invite by token (public - used by the accept-invite page)"""
    user_doc = await db.users.find_one({"invite_token": token}, {"_id": 0, "hashed_password": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="Invalid or expired invite link")
    _check_invite_not_expired(user_doc)
    return {"email": user_doc["email"], "name": user_doc["name"], "role": user_doc.get("role", "guest")}

@api_router.post("/auth/accept-invite")
async def accept_invite(data: AcceptInviteRequest):
    """Set a password for an invited account and log in"""
    user_doc = await db.users.find_one({"invite_token": data.token})
    if not user_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired invite link")
    if user_doc.get("hashed_password"):
        raise HTTPException(status_code=400, detail="This invite has already been used")
    _check_invite_not_expired(user_doc)

    hashed_password = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt()).decode()
    await db.users.update_one(
        {"user_id": user_doc["user_id"]},
        {
            "$set": {"hashed_password": hashed_password},
            "$unset": {"invite_token": "", "invite_expires_at": ""}
        }
    )

    updated = await db.users.find_one({"user_id": user_doc["user_id"]})
    return await _create_session_response(updated)

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

# ==================== PRIVATE OFFERS (NEGOTIATED PRICING) ====================

def _extract_latlng_from_map_link(map_link: Optional[str]) -> tuple:
    """Pull a lat/lng pair out of a full (non-shortened) Google Maps URL.
    Prefers the precise pin coordinates in a "place" URL's data segment
    (!3d{lat}!4d{lng}) over the coarser viewport-center coordinates
    (@lat,lng,zoom) when both are present. Short links (maps.app.goo.gl/...)
    don't contain coordinates in the URL itself - those return (None, None)."""
    if not map_link:
        return (None, None)
    place_match = re.search(r"!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)", map_link)
    if place_match:
        return (float(place_match.group(1)), float(place_match.group(2)))
    viewport_match = re.search(r"@(-?\d+\.\d+),(-?\d+\.\d+)", map_link)
    if viewport_match:
        return (float(viewport_match.group(1)), float(viewport_match.group(2)))
    return (None, None)

def _resolve_offer_villa(offer_data: PrivateOfferCreate, villa_doc: Optional[dict]) -> dict:
    """Resolve villa fields for a private offer - from the catalog villa doc
    if villa_id was given, or from the custom_* fields for an off-catalog
    property the company also represents."""
    if offer_data.villa_id:
        if not villa_doc:
            raise HTTPException(status_code=404, detail="Villa not found")
        return {
            "villa_name": villa_doc["name"],
            "villa_location": f"{villa_doc.get('location', '')}, {villa_doc.get('region', 'Goa')}",
            "bedrooms": villa_doc.get("bedrooms"),
            "bathrooms": villa_doc.get("bathrooms"),
            "map_link": villa_doc.get("map_link"),
            "latitude": villa_doc.get("latitude"),
            "longitude": villa_doc.get("longitude"),
            "amenities": offer_data.amenities or villa_doc.get("amenities", []),
            "commission_percent": villa_doc.get("commission_percent", 30.0),
            "default_security_deposit": villa_doc.get("security_deposit") or 20000,
        }
    if not offer_data.custom_villa_name:
        raise HTTPException(status_code=400, detail="custom_villa_name is required when no villa_id is given")
    latitude, longitude = _extract_latlng_from_map_link(offer_data.custom_map_link)
    return {
        "villa_name": offer_data.custom_villa_name,
        "villa_location": offer_data.custom_villa_location or "",
        "bedrooms": offer_data.custom_bedrooms,
        "bathrooms": offer_data.custom_bathrooms,
        "map_link": offer_data.custom_map_link,
        "latitude": latitude,
        "longitude": longitude,
        "amenities": offer_data.amenities,
        "commission_percent": 30.0,
        "default_security_deposit": 20000,
    }

def _price_offer(offer_data: PrivateOfferCreate, resolved: dict) -> dict:
    """Shared pricing math for creating and editing a private offer."""
    check_in = datetime.strptime(offer_data.check_in, "%Y-%m-%d")
    check_out = datetime.strptime(offer_data.check_out, "%Y-%m-%d")
    num_nights = (check_out - check_in).days
    if num_nights < 1:
        raise HTTPException(status_code=400, detail="Invalid date range")

    base_amount = offer_data.custom_per_night * num_nights

    addons_total = 0
    for addon in offer_data.addons:
        addon_total = addon.get("price", 0) * addon.get("quantity", 1)
        if addon.get("is_per_day"):
            addon_total *= num_nights
        addons_total += addon_total

    subtotal = base_amount + addons_total

    discount_amount = 0
    if offer_data.discount_percent > 0:
        discount_amount = (subtotal * offer_data.discount_percent) / 100
        subtotal -= discount_amount

    gst_percent = 18.0
    gst_amount = round(subtotal * (gst_percent / 100), 2)

    security_deposit = offer_data.security_deposit if offer_data.security_deposit is not None else resolved["default_security_deposit"]
    total_amount = subtotal + gst_amount + security_deposit

    commission_percent = resolved["commission_percent"]
    commission_amount = (subtotal * commission_percent) / 100
    owner_payout = subtotal - commission_amount

    return {
        "num_nights": num_nights,
        "base_amount": base_amount,
        "addons_total": addons_total,
        "discount_amount": discount_amount,
        "subtotal": subtotal,
        "gst_amount": gst_amount,
        "security_deposit": security_deposit,
        "total_amount": total_amount,
        "commission_percent": commission_percent,
        "commission_amount": commission_amount,
        "owner_payout": owner_payout,
    }

@api_router.post("/admin/private-offers")
async def create_private_offer(offer_data: PrivateOfferCreate, request: Request, user: User = Depends(require_admin)):
    """Create a private offer with custom negotiated pricing - for a
    catalog villa (villa_id) or an off-catalog property the company also
    represents (custom_villa_name)."""
    villa_doc = None
    if offer_data.villa_id:
        villa_doc = await db.villas.find_one({"villa_id": offer_data.villa_id}, {"_id": 0})
    resolved = _resolve_offer_villa(offer_data, villa_doc)
    pricing = _price_offer(offer_data, resolved)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=offer_data.expiry_hours)

    offer = PrivateOffer(
        villa_id=offer_data.villa_id,
        villa_name=resolved["villa_name"],
        villa_location=resolved["villa_location"],
        bedrooms=resolved["bedrooms"],
        bathrooms=resolved["bathrooms"],
        map_link=resolved["map_link"],
        latitude=resolved["latitude"],
        longitude=resolved["longitude"],
        amenities=resolved["amenities"],
        guest_name=offer_data.guest_name,
        guest_email=offer_data.guest_email,
        guest_phone=offer_data.guest_phone,
        check_in=offer_data.check_in,
        check_out=offer_data.check_out,
        num_guests=offer_data.num_guests,
        num_nights=pricing["num_nights"],
        base_amount=pricing["base_amount"],
        addons_total=pricing["addons_total"],
        discount_percent=offer_data.discount_percent,
        discount_amount=pricing["discount_amount"],
        subtotal=pricing["subtotal"],
        gst_amount=pricing["gst_amount"],
        security_deposit=pricing["security_deposit"],
        total_amount=pricing["total_amount"],
        commission_percent=pricing["commission_percent"],
        commission_amount=pricing["commission_amount"],
        owner_payout=pricing["owner_payout"],
        expires_at=expires_at,
        notes=offer_data.notes,
        created_by=user.user_id
    )

    doc = offer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["expires_at"] = doc["expires_at"].isoformat()
    await db.private_offers.insert_one(doc)

    # Payment link points back at whichever frontend origin the admin is
    # actually using (falls back to FRONTEND_URL, then a placeholder) -
    # hardcoding a domain here previously produced dead links whenever that
    # domain wasn't the real deployed site.
    base_url = os.environ.get("FRONTEND_URL") or request.headers.get("origin") or "https://travaholicstays.com"
    payment_link = f"{base_url}/offer/{offer.offer_id}"

    await db.private_offers.update_one(
        {"offer_id": offer.offer_id},
        {"$set": {"payment_link": payment_link}}
    )

    return {
        "offer_id": offer.offer_id,
        "payment_link": payment_link,
        "expires_at": expires_at.isoformat(),
        "total_amount": pricing["total_amount"],
        "message": "Private offer created successfully"
    }

@api_router.put("/admin/private-offers/{offer_id}")
async def update_private_offer(offer_id: str, offer_data: PrivateOfferCreate, user: User = Depends(require_admin)):
    """Edit a pending private offer's terms - re-runs the same pricing math
    as creation. Only pending offers can be edited; once a guest has paid or
    the offer has expired/been cancelled, terms are locked."""
    existing = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Offer not found")
    if existing["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Cannot edit an offer that is already {existing['status']}")

    villa_doc = None
    if offer_data.villa_id:
        villa_doc = await db.villas.find_one({"villa_id": offer_data.villa_id}, {"_id": 0})
    resolved = _resolve_offer_villa(offer_data, villa_doc)
    pricing = _price_offer(offer_data, resolved)

    update_data = {
        "villa_id": offer_data.villa_id,
        "villa_name": resolved["villa_name"],
        "villa_location": resolved["villa_location"],
        "bedrooms": resolved["bedrooms"],
        "bathrooms": resolved["bathrooms"],
        "map_link": resolved["map_link"],
        "latitude": resolved["latitude"],
        "longitude": resolved["longitude"],
        "amenities": resolved["amenities"],
        "guest_name": offer_data.guest_name,
        "guest_email": offer_data.guest_email,
        "guest_phone": offer_data.guest_phone,
        "check_in": offer_data.check_in,
        "check_out": offer_data.check_out,
        "num_guests": offer_data.num_guests,
        "num_nights": pricing["num_nights"],
        "base_amount": pricing["base_amount"],
        "addons_total": pricing["addons_total"],
        "discount_percent": offer_data.discount_percent,
        "discount_amount": pricing["discount_amount"],
        "subtotal": pricing["subtotal"],
        "gst_amount": pricing["gst_amount"],
        "security_deposit": pricing["security_deposit"],
        "total_amount": pricing["total_amount"],
        "commission_percent": pricing["commission_percent"],
        "commission_amount": pricing["commission_amount"],
        "owner_payout": pricing["owner_payout"],
        "notes": offer_data.notes,
    }
    if offer_data.expiry_hours:
        update_data["expires_at"] = (datetime.now(timezone.utc) + timedelta(hours=offer_data.expiry_hours)).isoformat()

    await db.private_offers.update_one({"offer_id": offer_id}, {"$set": update_data})
    updated = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    return updated

@api_router.get("/admin/private-offers")
async def list_private_offers(user: User = Depends(require_admin)):
    """List all private offers"""
    offers = await db.private_offers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"offers": offers}

@api_router.delete("/admin/private-offers/{offer_id}")
async def delete_private_offer(offer_id: str, user: User = Depends(require_admin)):
    """Delete a private offer (admin only)"""
    result = await db.private_offers.delete_one({"offer_id": offer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offer not found")
    return {"message": "Offer deleted"}

@api_router.get("/offer/{offer_id}")
async def get_private_offer(offer_id: str):
    """Get private offer details (public endpoint for payment page)"""
    offer = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    # Check if expired
    expires_at = datetime.fromisoformat(offer["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        return {"offer": offer, "is_expired": True, "message": "This offer has expired"}

    if offer["status"] != "pending":
        return {"offer": offer, "is_expired": False, "message": f"This offer is {offer['status']}"}

    # Get villa details (catalog villa only - a custom/off-catalog offer has no villa_id)
    villa = None
    if offer.get("villa_id"):
        villa = await db.villas.find_one({"villa_id": offer["villa_id"]}, {"_id": 0, "name": 1, "images": 1, "location": 1, "address": 1, "latitude": 1, "longitude": 1})

    return {"offer": offer, "villa": villa, "is_expired": False}

def _offer_pdf_context(offer: dict) -> tuple[dict, dict]:
    """Shared villa/booking dicts for rendering a private offer through the
    same PDF generator used for regular bookings - built from the offer's
    own terms whether it's a catalog or custom villa."""
    villa_for_pdf = {
        "name": offer.get("villa_name"),
        "location": offer.get("villa_location", ""),
        "region": "",
        "bedrooms": offer.get("bedrooms") or 3,
        "amenities": offer.get("amenities", []),
        "security_deposit": offer.get("security_deposit"),
    }
    booking_like = {
        "booking_id": offer["offer_id"],
        "guest_name": offer["guest_name"],
        "check_in": offer["check_in"],
        "check_out": offer["check_out"],
        "num_guests": offer["num_guests"],
        "num_nights": offer["num_nights"],
        "tariff_per_night": offer["base_amount"] / offer["num_nights"] if offer["num_nights"] else 0,
        "total_amount": offer["total_amount"],
        "security_deposit": offer.get("security_deposit"),
        "addons_total": offer.get("addons_total", 0),
    }
    return villa_for_pdf, booking_like

@api_router.get("/offer/{offer_id}/pdf")
async def get_private_offer_pdf(offer_id: str):
    """Publicly viewable private offer PDF - same proposal document as a
    regular booking (tariff, bank details, amenities, house rules), built
    from the offer's own terms whether it's a catalog or custom villa."""
    offer = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    villa_for_pdf, booking_like = _offer_pdf_context(offer)

    pdf_buffer = generate_booking_confirmation_pdf(
        booking_like, villa_for_pdf,
        document_title="PRIVATE OFFER",
        intro_text="Thank you for your interest in Travaholic Stays! Please find below your private offer, including the tariff breakdown, bank details for payment, villa amenities and house rules."
    )

    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{pdf_filename(offer.get("guest_name"), offer.get("villa_name"))}"'
        }
    )

class SendOfferEmailRequest(BaseModel):
    email: Optional[EmailStr] = None

def generate_private_offer_email(offer: dict, payment_link: str) -> str:
    """Branded HTML email for sending a private offer link directly to a
    customer (or anyone else) from the admin panel."""
    expires_at = offer.get("expires_at", "")
    try:
        expires_display = datetime.fromisoformat(expires_at).strftime("%d %b %Y, %I:%M %p")
    except Exception:
        expires_display = expires_at
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Helvetica', Arial, sans-serif; color: {EMAIL_INK}; line-height: 1.6; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: {EMAIL_INK}; color: #ffffff; padding: 30px; text-align: center; border-bottom: 3px solid {EMAIL_GOLD}; }}
            .header img {{ width: 96px; height: 96px; margin-bottom: 10px; }}
            .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 1px; color: #ffffff; }}
            .header p {{ color: {EMAIL_GOLD}; }}
            .content {{ padding: 30px; background: {EMAIL_CREAM}; }}
            .section {{ background: white; padding: 20px; margin-bottom: 20px; border-left: 4px solid {EMAIL_GOLD}; }}
            .section h2 {{ color: {EMAIL_GOLD_DARK}; font-size: 16px; margin-top: 0; }}
            .detail-row {{ padding: 8px 0; border-bottom: 1px solid #eee; }}
            .label {{ color: {EMAIL_MUTED}; display: inline-block; width: 45%; }}
            .value {{ font-weight: bold; color: {EMAIL_INK}; }}
            .footer {{ text-align: center; padding: 20px; color: {EMAIL_MUTED}; font-size: 12px; }}
            .cta {{ background: {EMAIL_GOLD_DARK}; color: white; padding: 12px 24px; text-decoration: none; display: inline-block; margin: 10px 0; }}
            .highlight {{ background: #FBF3E3; padding: 15px; border-left: 4px solid {EMAIL_GOLD}; margin: 15px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="{EMAIL_LOGO_URL}" alt="Travaholic Stays" />
                <h1>TRAVAHOLIC STAYS</h1>
                <p style="margin: 5px 0 0 0;">Your Private Offer</p>
            </div>

            <div class="content">
                <p>Dear <strong>{offer['guest_name']}</strong>,</p>
                <p>Here's your private offer from Travaholic Stays - full tariff breakdown, bank details, amenities and house rules are attached as a PDF.</p>

                <div class="section">
                    <h2>OFFER SUMMARY</h2>
                    <div class="detail-row">
                        <span class="label">Villa:</span>
                        <span class="value">{offer.get('villa_name', '')}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-in:</span>
                        <span class="value">{offer['check_in']}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Check-out:</span>
                        <span class="value">{offer['check_out']}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Guests:</span>
                        <span class="value">{offer['num_guests']} pax</span>
                    </div>
                    <div class="detail-row" style="font-size: 18px; padding-top: 15px;">
                        <span class="label"><strong>Total Amount:</strong></span>
                        <span class="value" style="color: {EMAIL_GOLD_DARK};">₹{offer['total_amount']:,.0f}</span>
                    </div>
                </div>

                <div class="highlight">
                    This offer expires on <strong>{expires_display}</strong>. Click below to review and complete payment.
                </div>

                <p style="text-align: center;">
                    <a href="{payment_link}" class="cta">View Offer &amp; Pay</a>
                </p>
            </div>

            <div class="footer">
                <p><strong>Travaholic Stays</strong></p>
                <p>+91 99588 71283 | www.travaholicstays.com</p>
                <p>@travaholicstays on Instagram</p>
            </div>
        </div>
    </body>
    </html>
    """

@api_router.post("/admin/private-offers/{offer_id}/send-email")
async def send_private_offer_email(offer_id: str, data: SendOfferEmailRequest, user: User = Depends(require_admin)):
    """Email a private offer (payment link + PDF) directly to a customer -
    or anyone else the admin specifies - from the admin panel."""
    offer = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")

    recipient = data.email or offer.get("guest_email")
    if not recipient:
        raise HTTPException(status_code=400, detail="No email address on file for this offer - provide one to send to")

    resend_key = os.environ.get("RESEND_API_KEY")
    if not resend_key or resend_key.startswith("re_placeholder"):
        raise HTTPException(status_code=400, detail="Email sending isn't configured yet (RESEND_API_KEY missing)")

    payment_link = offer.get("payment_link") or f"{os.environ.get('FRONTEND_URL', 'https://travaholicstays.com')}/offer/{offer_id}"
    villa_for_pdf, booking_like = _offer_pdf_context(offer)
    pdf_buffer = generate_booking_confirmation_pdf(
        booking_like, villa_for_pdf,
        document_title="PRIVATE OFFER",
        intro_text="Thank you for your interest in Travaholic Stays! Please find below your private offer, including the tariff breakdown, bank details for payment, villa amenities and house rules."
    )

    resend.api_key = resend_key
    try:
        resend.Emails.send({
            "from": SENDER_EMAIL,
            "to": [recipient],
            "subject": f"Your Private Offer - {offer.get('villa_name', 'Travaholic Stays')} | Travaholic Stays",
            "html": generate_private_offer_email(offer, payment_link),
            "attachments": [{
                "filename": pdf_filename(offer.get("guest_name"), offer.get("villa_name")),
                "content": list(pdf_buffer.getvalue()),
            }],
        })
    except Exception as e:
        logging.error(f"Failed to send private offer email: {e}")
        raise HTTPException(status_code=502, detail="Failed to send email - please try again")

    try:
        send_whatsapp_private_offer(offer, payment_link)
    except Exception as e:
        logging.error(f"Failed to send WhatsApp private offer: {e}")

    return {"message": f"Offer emailed to {recipient}"}

@api_router.post("/offer/{offer_id}/accept")
async def accept_private_offer(offer_id: str, payment_data: Dict[str, Any]):
    """Accept a private offer and create booking"""
    offer = await db.private_offers.find_one({"offer_id": offer_id}, {"_id": 0})
    if not offer:
        raise HTTPException(status_code=404, detail="Offer not found")
    
    # Check expiry
    expires_at = datetime.fromisoformat(offer["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This offer has expired")
    
    if offer["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"This offer is already {offer['status']}")
    
    # Create booking from offer
    booking_id = f"booking_{uuid.uuid4().hex[:12]}"
    booking = {
        "booking_id": booking_id,
        "villa_id": offer["villa_id"],
        "villa_name": offer["villa_name"],
        "guest_name": offer["guest_name"],
        "guest_email": offer["guest_email"],
        "guest_phone": offer["guest_phone"],
        "check_in": offer["check_in"],
        "check_out": offer["check_out"],
        "num_guests": offer["num_guests"],
        "num_nights": offer["num_nights"],
        "base_amount": offer["base_amount"],
        "addons_total": offer["addons_total"],
        "subtotal": offer["subtotal"],
        "gst_amount": offer["gst_amount"],
        "security_deposit": offer["security_deposit"],
        "total_amount": offer["total_amount"],
        "commission_percent": offer["commission_percent"],
        "commission_amount": offer["commission_amount"],
        "owner_payout": offer["owner_payout"],
        "is_negotiated": True,
        "private_offer_id": offer_id,
        "payment_status": "pending",
        "booking_status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.bookings.insert_one(booking)
    
    # Block dates
    block = {
        "block_id": f"block_{uuid.uuid4().hex[:12]}",
        "villa_id": offer["villa_id"],
        "start_date": offer["check_in"],
        "end_date": offer["check_out"],
        "reason": "booking",
        "booking_id": booking_id,
        "created_by": "private_offer",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocked_dates.insert_one(block)
    
    # Update offer status
    await db.private_offers.update_one(
        {"offer_id": offer_id},
        {"$set": {"status": "accepted"}}
    )
    
    return {"booking_id": booking_id, "message": "Booking confirmed successfully"}

# ==================== RAZORPAY PAYMENT INTEGRATION ====================

@api_router.post("/payments/create-order")
async def create_razorpay_order(data: Dict[str, Any]):
    """Create a Razorpay order for payment"""
    # Get payment settings
    settings = await db.payment_settings.find_one({"setting_id": "payment_settings_main"}, {"_id": 0})
    
    if not settings or not settings.get("razorpay_key_id"):
        # Use environment variables as fallback
        key_id = os.environ.get("RAZORPAY_KEY_ID")
        key_secret = os.environ.get("RAZORPAY_KEY_SECRET")
    else:
        key_id = settings.get("razorpay_key_id")
        key_secret = settings.get("razorpay_key_secret")
    
    if not key_id or not key_secret:
        raise HTTPException(status_code=400, detail="Payment gateway not configured. Please contact support.")
    
    try:
        rp_client = razorpay.Client(auth=(key_id, key_secret))
        
        amount_paise = int(data["amount"] * 100)  # Convert to paise
        
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": data.get("booking_id") or f"rcpt_{uuid.uuid4().hex[:10]}",
            "notes": {
                "booking_id": data.get("booking_id", ""),
                "offer_id": data.get("offer_id", ""),
                "guest_email": data.get("guest_email", ""),
                "payment_type": data.get("payment_type", "full")  # full, advance, balance
            }
        }
        
        order = rp_client.order.create(data=order_data)
        
        return {
            "order_id": order["id"],
            "amount": data["amount"],
            "currency": "INR",
            "key_id": key_id,  # Safe to expose - needed for frontend
            "notes": order_data["notes"]
        }
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment order creation failed: {str(e)}")

@api_router.post("/payments/verify")
async def verify_razorpay_payment(data: Dict[str, Any]):
    """Verify Razorpay payment signature"""
    settings = await db.payment_settings.find_one({"setting_id": "payment_settings_main"}, {"_id": 0})
    
    key_secret = settings.get("razorpay_key_secret") if settings else os.environ.get("RAZORPAY_KEY_SECRET")
    
    if not key_secret:
        raise HTTPException(status_code=400, detail="Payment verification not configured")
    
    # Verify signature
    try:
        message = data["razorpay_order_id"] + "|" + data["razorpay_payment_id"]
        generated_signature = hmac.new(
            key_secret.encode(),
            message.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != data["razorpay_signature"]:
            raise HTTPException(status_code=400, detail="Invalid payment signature")
        
        # Update booking payment status
        booking_id = data.get("booking_id")
        offer_id = data.get("offer_id")
        payment_type = data.get("payment_type", "full")
        
        if booking_id:
            update_data = {
                "razorpay_order_id": data["razorpay_order_id"],
                "razorpay_payment_id": data["razorpay_payment_id"],
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if payment_type == "full":
                update_data["payment_status"] = "paid"
            elif payment_type == "advance":
                update_data["payment_status"] = "partial"
                update_data["advance_received"] = True
                update_data["advance_received_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            
            await db.bookings.update_one(
                {"booking_id": booking_id},
                {"$set": update_data}
            )
        
        return {"success": True, "message": "Payment verified successfully"}
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(status_code=500, detail=f"Payment verification failed: {str(e)}")

@api_router.post("/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhooks"""
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    
    settings = await db.payment_settings.find_one({"setting_id": "payment_settings_main"}, {"_id": 0})
    webhook_secret = settings.get("razorpay_webhook_secret") if settings else os.environ.get("RAZORPAY_WEBHOOK_SECRET")
    
    if webhook_secret:
        # Verify webhook signature
        expected_signature = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()
        
        if expected_signature != signature:
            logger.warning("Invalid Razorpay webhook signature")
            raise HTTPException(status_code=400, detail="Invalid signature")
    
    try:
        import json
        payload = json.loads(body)
        event = payload.get("event")
        
        if event == "payment.captured":
            payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
            order_id = payment.get("order_id")
            payment_id = payment.get("id")
            notes = payment.get("notes", {})
            
            booking_id = notes.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": {
                        "payment_status": "paid",
                        "razorpay_order_id": order_id,
                        "razorpay_payment_id": payment_id,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Payment captured for booking {booking_id}")
        
        elif event == "payment.failed":
            payment = payload.get("payload", {}).get("payment", {}).get("entity", {})
            notes = payment.get("notes", {})
            booking_id = notes.get("booking_id")
            if booking_id:
                await db.bookings.update_one(
                    {"booking_id": booking_id},
                    {"$set": {
                        "payment_status": "failed",
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.warning(f"Payment failed for booking {booking_id}")
        
        elif event == "refund.processed":
            refund = payload.get("payload", {}).get("refund", {}).get("entity", {})
            payment_id = refund.get("payment_id")
            # Find booking by payment_id and update
            await db.bookings.update_one(
                {"razorpay_payment_id": payment_id},
                {"$set": {
                    "payment_status": "refunded",
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            logger.info(f"Refund processed for payment {payment_id}")
        
        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return {"status": "error", "message": str(e)}

# ==================== PAYMENT SETTINGS (ADMIN) ====================

@api_router.get("/admin/payment-settings")
async def get_payment_settings(user: User = Depends(require_admin)):
    """Get payment gateway settings"""
    settings = await db.payment_settings.find_one({"setting_id": "payment_settings_main"}, {"_id": 0})
    
    if not settings:
        # Return defaults with env vars (masked)
        return {
            "razorpay_key_id": os.environ.get("RAZORPAY_KEY_ID", "")[:10] + "..." if os.environ.get("RAZORPAY_KEY_ID") else "",
            "razorpay_key_secret_set": bool(os.environ.get("RAZORPAY_KEY_SECRET")),
            "razorpay_webhook_secret_set": bool(os.environ.get("RAZORPAY_WEBHOOK_SECRET")),
            "is_live_mode": False,
            "partial_payment_enabled": True,
            "min_advance_percent": 30.0,
            "source": "environment"
        }
    
    # Mask secrets
    return {
        "razorpay_key_id": settings.get("razorpay_key_id", "")[:10] + "..." if settings.get("razorpay_key_id") else "",
        "razorpay_key_secret_set": bool(settings.get("razorpay_key_secret")),
        "razorpay_webhook_secret_set": bool(settings.get("razorpay_webhook_secret")),
        "is_live_mode": settings.get("is_live_mode", False),
        "partial_payment_enabled": settings.get("partial_payment_enabled", True),
        "min_advance_percent": settings.get("min_advance_percent", 30.0),
        "source": "database"
    }

@api_router.post("/admin/payment-settings")
async def update_payment_settings(data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update payment gateway settings"""
    update_data = {
        "setting_id": "payment_settings_main",
        "updated_by": user.user_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if "razorpay_key_id" in data:
        update_data["razorpay_key_id"] = data["razorpay_key_id"]
    if "razorpay_key_secret" in data:
        update_data["razorpay_key_secret"] = data["razorpay_key_secret"]
    if "razorpay_webhook_secret" in data:
        update_data["razorpay_webhook_secret"] = data["razorpay_webhook_secret"]
    if "is_live_mode" in data:
        update_data["is_live_mode"] = data["is_live_mode"]
    if "partial_payment_enabled" in data:
        update_data["partial_payment_enabled"] = data["partial_payment_enabled"]
    if "min_advance_percent" in data:
        update_data["min_advance_percent"] = data["min_advance_percent"]
    
    await db.payment_settings.update_one(
        {"setting_id": "payment_settings_main"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Payment settings updated successfully"}

# ==================== OWNER PAYOUTS ====================

@api_router.get("/admin/payouts")
async def list_payouts(
    status: Optional[str] = None,
    owner_id: Optional[str] = None,
    user: User = Depends(require_admin)
):
    """List all owner payouts"""
    query = {}
    if status:
        query["status"] = status
    if owner_id:
        query["owner_id"] = owner_id
    
    payouts = await db.payouts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Calculate totals
    total_pending = sum(p["net_payable"] for p in payouts if p["status"] == "pending")
    total_paid = sum(p["net_payable"] for p in payouts if p["status"] == "paid")
    
    return {
        "payouts": payouts,
        "summary": {
            "total_pending": total_pending,
            "total_paid": total_paid,
            "count": len(payouts)
        }
    }

@api_router.post("/admin/payouts/generate")
async def generate_payouts_from_bookings(user: User = Depends(require_admin)):
    """Generate payout records from completed bookings"""
    # Find confirmed bookings without payout records
    bookings = await db.bookings.find({
        "booking_status": {"$in": ["confirmed", "completed"]},
        "payment_status": "paid"
    }, {"_id": 0}).to_list(1000)
    
    generated = 0
    for booking in bookings:
        # Check if payout already exists
        existing = await db.payouts.find_one({"booking_id": booking["booking_id"]})
        if existing:
            continue
        
        # Get villa and owner info
        villa = await db.villas.find_one({"villa_id": booking["villa_id"]}, {"_id": 0})
        if not villa or not villa.get("owner_id"):
            continue
        
        owner = await db.users.find_one({"user_id": villa["owner_id"]}, {"_id": 0, "hashed_password": 0})
        if not owner:
            continue
        
        payout = {
            "payout_id": f"payout_{uuid.uuid4().hex[:12]}",
            "owner_id": villa["owner_id"],
            "owner_name": owner.get("name", "Unknown"),
            "owner_email": owner.get("email", ""),
            "villa_id": booking["villa_id"],
            "villa_name": booking["villa_name"],
            "booking_id": booking["booking_id"],
            "booking_check_in": booking["check_in"],
            "booking_check_out": booking["check_out"],
            "gross_amount": booking.get("subtotal", booking.get("base_amount", 0)),
            "commission_percent": booking.get("commission_percent", 30.0),
            "commission_amount": booking.get("commission_amount", 0),
            "net_payable": booking.get("owner_payout", 0),
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.payouts.insert_one(payout)
        generated += 1
    
    return {"message": f"Generated {generated} payout records"}

@api_router.put("/admin/payouts/{payout_id}")
async def update_payout(payout_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Mark payout as paid or update status"""
    update_data = {
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if "status" in data:
        update_data["status"] = data["status"]
        if data["status"] == "paid":
            update_data["paid_date"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if "payment_reference" in data:
        update_data["payment_reference"] = data["payment_reference"]
    if "payment_mode" in data:
        update_data["payment_mode"] = data["payment_mode"]
    if "notes" in data:
        update_data["notes"] = data["notes"]
    
    result = await db.payouts.update_one({"payout_id": payout_id}, {"$set": update_data})
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payout not found")
    
    return {"message": "Payout updated successfully"}

@api_router.get("/admin/payouts/export")
async def export_payouts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    owner_id: Optional[str] = None,
    user: User = Depends(require_admin)
):
    """Export payouts as CSV data"""
    query = {}
    if owner_id:
        query["owner_id"] = owner_id
    if start_date and end_date:
        query["booking_check_in"] = {"$gte": start_date, "$lte": end_date}
    
    payouts = await db.payouts.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Generate CSV content
    csv_lines = ["Payout ID,Owner,Villa,Booking ID,Check-in,Check-out,Gross Amount,Commission %,Commission,Net Payable,Status,Paid Date,Reference"]
    for p in payouts:
        csv_lines.append(
            f"{p['payout_id']},{p['owner_name']},{p['villa_name']},{p['booking_id']},"
            f"{p['booking_check_in']},{p['booking_check_out']},{p['gross_amount']},"
            f"{p['commission_percent']},{p['commission_amount']},{p['net_payable']},"
            f"{p['status']},{p.get('paid_date', '')},{p.get('payment_reference', '')}"
        )
    
    return {"csv_data": "\n".join(csv_lines), "count": len(payouts)}

# ==================== EVENT & SEASONAL PRICING ====================

@api_router.get("/admin/event-pricing")
async def list_event_pricing(user: User = Depends(require_admin)):
    """List all event pricing rules"""
    events = await db.event_pricing.find({}, {"_id": 0}).sort("start_date", 1).to_list(1000)
    return {"events": events}

@api_router.post("/admin/event-pricing")
async def create_event_pricing(data: Dict[str, Any], user: User = Depends(require_admin)):
    """Create event pricing rule"""
    event = {
        "event_id": f"event_{uuid.uuid4().hex[:12]}",
        "name": data["name"],
        "villa_id": data.get("villa_id"),  # None = all villas
        "start_date": data["start_date"],
        "end_date": data["end_date"],
        "price_multiplier": data.get("price_multiplier", 1.5),
        "min_nights": data.get("min_nights", 3),
        "is_active": True,
        "created_by": user.user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.event_pricing.insert_one(event)
    return {"event_id": event["event_id"], "message": "Event pricing created"}

@api_router.delete("/admin/event-pricing/{event_id}")
async def delete_event_pricing(event_id: str, user: User = Depends(require_admin)):
    """Delete event pricing rule"""
    result = await db.event_pricing.delete_one({"event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event pricing deleted"}

# ==================== BLOG MANAGEMENT ====================

@api_router.get("/blog/posts")
async def get_blog_posts(status: Optional[str] = None, category: Optional[str] = None, limit: int = 50):
    """Get blog posts (public endpoint - only returns published posts)"""
    query = {"status": "published"}
    if category:
        query["category"] = category
    
    posts = await db.blog_posts.find(query, {"_id": 0}).sort("published_date", -1).limit(limit).to_list(limit)
    return {"posts": posts, "total": len(posts)}

@api_router.get("/blog/posts/{slug}")
async def get_blog_post(slug: str):
    """Get single blog post by slug (public)"""
    post = await db.blog_posts.find_one({"slug": slug, "status": "published"}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Get related villas if any
    related_villas = []
    if post.get("related_villa_ids"):
        related_villas = await db.villas.find(
            {"villa_id": {"$in": post["related_villa_ids"]}},
            {"_id": 0, "villa_id": 1, "name": 1, "slug": 1, "thumbnail": 1, "location": 1, "base_price": 1}
        ).to_list(10)
    
    # Get more posts in same category
    related_posts = await db.blog_posts.find(
        {"category": post["category"], "slug": {"$ne": slug}, "status": "published"},
        {"_id": 0, "post_id": 1, "slug": 1, "title": 1, "featured_image": 1, "category": 1}
    ).limit(3).to_list(3)
    
    return {"post": post, "related_villas": related_villas, "related_posts": related_posts}

@api_router.get("/blog/categories")
async def get_blog_categories():
    """Get all blog categories with post counts"""
    pipeline = [
        {"$match": {"status": "published"}},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.blog_posts.aggregate(pipeline).to_list(100)
    return {"categories": [{"name": c["_id"], "count": c["count"]} for c in categories]}

# Admin blog endpoints
@api_router.get("/admin/blog/posts")
async def admin_list_blog_posts(user: User = Depends(require_admin)):
    """List all blog posts (admin - includes drafts)"""
    posts = await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"posts": posts, "total": len(posts)}

@api_router.post("/admin/blog/posts")
async def create_blog_post(post_data: BlogPostCreate, user: User = Depends(require_admin)):
    """Create a new blog post"""
    # Check for duplicate slug
    existing = await db.blog_posts.find_one({"slug": post_data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="A post with this slug already exists")
    
    post = BlogPost(
        slug=post_data.slug,
        title=post_data.title,
        excerpt=post_data.excerpt,
        content=post_data.content,
        featured_image=post_data.featured_image,
        category=post_data.category,
        tags=post_data.tags,
        meta_title=post_data.meta_title or post_data.title,
        meta_description=post_data.meta_description or post_data.excerpt,
        meta_keywords=post_data.meta_keywords,
        author=post_data.author,
        published_date=post_data.published_date,
        read_time=post_data.read_time,
        status=post_data.status,
        is_featured=post_data.is_featured,
        related_villa_ids=post_data.related_villa_ids
    )
    
    doc = post.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.blog_posts.insert_one(doc)
    
    return {"post_id": post.post_id, "slug": post.slug, "message": "Blog post created"}

@api_router.put("/admin/blog/posts/{post_id}")
async def update_blog_post(post_id: str, data: Dict[str, Any], user: User = Depends(require_admin)):
    """Update a blog post"""
    # Check if post exists
    existing = await db.blog_posts.find_one({"post_id": post_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # If slug is being changed, check for duplicates
    if "slug" in data and data["slug"] != existing["slug"]:
        duplicate = await db.blog_posts.find_one({"slug": data["slug"]})
        if duplicate:
            raise HTTPException(status_code=400, detail="A post with this slug already exists")
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.blog_posts.update_one({"post_id": post_id}, {"$set": data})
    
    return {"message": "Blog post updated"}

@api_router.delete("/admin/blog/posts/{post_id}")
async def delete_blog_post(post_id: str, user: User = Depends(require_admin)):
    """Delete a blog post"""
    result = await db.blog_posts.delete_one({"post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Blog post deleted"}

@api_router.post("/admin/blog/posts/{post_id}/publish")
async def publish_blog_post(post_id: str, user: User = Depends(require_admin)):
    """Publish a draft blog post"""
    result = await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Blog post published"}

@api_router.post("/admin/blog/posts/{post_id}/unpublish")
async def unpublish_blog_post(post_id: str, user: User = Depends(require_admin)):
    """Unpublish a blog post (set to draft)"""
    result = await db.blog_posts.update_one(
        {"post_id": post_id},
        {"$set": {"status": "draft", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Blog post unpublished"}

# ==================== COUPON MANAGEMENT ====================

@api_router.get("/admin/coupons")
async def get_coupons(user: User = Depends(require_admin)):
    """Get all coupons (admin only)"""
    coupons = await db.coupons.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"coupons": coupons, "total": len(coupons)}

@api_router.post("/admin/coupons")
async def create_coupon(coupon_data: CouponCreate, user: User = Depends(require_admin)):
    """Create a new coupon (admin only)"""
    # Check if code already exists
    existing = await db.coupons.find_one({"code": coupon_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    coupon = Coupon(
        code=coupon_data.code.upper(),
        description=coupon_data.description,
        discount_type=coupon_data.discount_type,
        discount_value=coupon_data.discount_value,
        min_booking_value=coupon_data.min_booking_value,
        max_discount=coupon_data.max_discount,
        valid_from=coupon_data.valid_from,
        valid_to=coupon_data.valid_to,
        usage_limit=coupon_data.usage_limit,
        per_user_limit=coupon_data.per_user_limit,
        applicable_villas=coupon_data.applicable_villas,
        is_active=coupon_data.is_active
    )
    
    await db.coupons.insert_one(coupon.model_dump())
    return {"message": "Coupon created successfully", "coupon_id": coupon.coupon_id}

@api_router.put("/admin/coupons/{coupon_id}")
async def update_coupon(coupon_id: str, coupon_data: CouponCreate, user: User = Depends(require_admin)):
    """Update a coupon (admin only)"""
    # Check if new code conflicts with another coupon
    existing = await db.coupons.find_one({"code": coupon_data.code.upper(), "coupon_id": {"$ne": coupon_id}})
    if existing:
        raise HTTPException(status_code=400, detail="Coupon code already exists")
    
    update_data = {
        "code": coupon_data.code.upper(),
        "description": coupon_data.description,
        "discount_type": coupon_data.discount_type,
        "discount_value": coupon_data.discount_value,
        "min_booking_value": coupon_data.min_booking_value,
        "max_discount": coupon_data.max_discount,
        "valid_from": coupon_data.valid_from,
        "valid_to": coupon_data.valid_to,
        "usage_limit": coupon_data.usage_limit,
        "per_user_limit": coupon_data.per_user_limit,
        "applicable_villas": coupon_data.applicable_villas,
        "is_active": coupon_data.is_active
    }
    
    result = await db.coupons.update_one({"coupon_id": coupon_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon updated successfully"}

@api_router.delete("/admin/coupons/{coupon_id}")
async def delete_coupon(coupon_id: str, user: User = Depends(require_admin)):
    """Delete a coupon (admin only)"""
    result = await db.coupons.delete_one({"coupon_id": coupon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coupon not found")
    return {"message": "Coupon deleted successfully"}

@api_router.post("/coupons/validate")
async def validate_coupon(request: CouponValidateRequest):
    """Validate a coupon code and calculate discount (public)"""
    coupon = await db.coupons.find_one({"code": request.code.upper(), "is_active": True}, {"_id": 0})
    
    if not coupon:
        raise HTTPException(status_code=404, detail="Invalid or expired coupon code")
    
    # Check validity dates
    now = datetime.now(timezone.utc)
    if coupon.get("valid_from"):
        valid_from = datetime.fromisoformat(coupon["valid_from"].replace("Z", "+00:00"))
        if now < valid_from:
            raise HTTPException(status_code=400, detail="Coupon is not yet valid")
    
    if coupon.get("valid_to"):
        valid_to = datetime.fromisoformat(coupon["valid_to"].replace("Z", "+00:00"))
        if now > valid_to:
            raise HTTPException(status_code=400, detail="Coupon has expired")
    
    # Check usage limit
    if coupon.get("usage_limit") and coupon.get("used_count", 0) >= coupon["usage_limit"]:
        raise HTTPException(status_code=400, detail="Coupon usage limit reached")
    
    # Check applicable villas
    if coupon.get("applicable_villas") and len(coupon["applicable_villas"]) > 0:
        if request.villa_id not in coupon["applicable_villas"]:
            raise HTTPException(status_code=400, detail="Coupon not valid for this villa")
    
    # Check minimum booking value
    if request.subtotal < coupon.get("min_booking_value", 0):
        min_val = coupon.get("min_booking_value", 0)
        raise HTTPException(status_code=400, detail=f"Minimum booking value of ₹{min_val:,.0f} required")
    
    # Calculate discount
    discount_type = coupon.get("discount_type", "percentage")
    discount_value = coupon.get("discount_value", 0)
    
    if discount_type == "percentage":
        discount_amount = request.subtotal * (discount_value / 100)
        # Apply max discount cap if set
        if coupon.get("max_discount"):
            discount_amount = min(discount_amount, coupon["max_discount"])
    else:
        discount_amount = min(discount_value, request.subtotal)  # Can't exceed subtotal
    
    return {
        "valid": True,
        "coupon_code": coupon["code"],
        "discount_type": discount_type,
        "discount_value": discount_value,
        "discount_amount": round(discount_amount, 2),
        "description": coupon.get("description", f"{discount_value}{'%' if discount_type == 'percentage' else ''} off"),
        "min_booking_value": coupon.get("min_booking_value", 0),
        "max_discount": coupon.get("max_discount")
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
    
    # Add blog posts
    blog_posts = await db.blog_posts.find({"status": "published"}, {"slug": 1, "updated_at": 1, "_id": 0}).to_list(1000)
    for post in blog_posts:
        xml_content += f'''  <url>
    <loc>{base_url}/blog/{post["slug"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
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
