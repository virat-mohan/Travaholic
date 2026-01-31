# Travaholic Stays - Product Requirements Document

## Project Overview
**Product**: Ultra-luxury villa booking platform for Travaholic Stays  
**Location**: North Goa, India  
**Stack**: React (Frontend) + FastAPI (Backend) + MongoDB (Database)

## Original Requirements
- Ultra-luxury, minimalist website inspired by `naluvillas.com`
- Mobile-first design with pages: Home, Villas, Villa Details, Experiences, About, Blog, Contact, List Your Villa
- Dynamic booking engine with live calendar, seasonal/weekend pricing, add-ons
- Razorpay payment integration (full or partial payments)
- Admin Panel for managing villas, pricing, bookings, leads, owners
- Villa Owner Portal for calendar management and earnings view
- Variable per-villa commission system (default 30%)
- Lead capture forms with WhatsApp/Email notifications
- SEO-friendly URLs, meta tags, schema markup, sitemap
- 18% GST automatic calculation on all bookings

---

## What's Been Implemented

### Phase 1: Core Platform (Completed)
- [x] Homepage with hero slideshow (6 luxury images with Ken Burns effect)
- [x] "The Travaholic Experience" lifestyle gallery section
- [x] Villas listing page with filters
- [x] Villa detail page with gallery, calendar, booking form
- [x] About, Contact, Blog, List Your Villa pages
- [x] Google Auth integration for Admin/Owner roles
- [x] Admin Dashboard with full CRUD operations
- [x] Villa Owner Portal with calendar and earnings

### Phase 2: Advanced Features (Jan 30, 2026)
- [x] **GST Calculation**: Automatic 18% GST on all bookings with breakdown display
- [x] **Private Offers System**: Time-limited negotiated pricing with secure payment links
- [x] **Dynamic Pricing Engine**:
  - Weekend price multipliers
  - Event/holiday pricing rules (NYE, Diwali, etc.)
  - Long-stay discounts (7/14/30+ nights)
  - Cleaning fee support
- [x] **Razorpay Integration**: Full payment flow structure with webhook handling
- [x] **Owner Payouts Management**: Generate, track, and mark payouts as paid
- [x] **Razorpay Setup Guide**: Step-by-step instructions in admin panel
- [x] **Event Pricing Admin**: Manage special pricing periods with quick presets
- [x] **Private Offer Page**: Guest-facing payment acceptance page
- [x] **Blog Management System**: Full CRUD with dynamic public pages and sitemap integration

### Phase 3: Bug Fixes & UI Polish (Jan 31, 2026)
- [x] **Logo Update**: New triangular "TRAYAHOLIC" logo with dynamic color inversion (white on dark, black on light backgrounds)
- [x] **Villa Filter Fix**: Fixed Select component crash (empty string values replaced with "all"/"any" placeholders)
- [x] **Navbar Logo**: Conditional CSS filter for dark/light navbar states
- [x] **Footer Logo**: Inverted logo for visibility on dark footer
- [x] **WhatsApp Floating Button**: Quick contact button with pre-filled message, appears on all public pages
- [x] **Coupon System**: Full discount coupon management with admin CRUD and booking page integration

### UI/UX Enhancements
- [x] Hero slideshow with smooth transitions
- [x] "Travaholic Experience" lifestyle gallery
- [x] Lucide icons (replaced emoji icons)
- [x] Google Reviews section with 6 real reviews
- [x] Long-stay discount banners
- [x] House Rules & Policies section

---

## Data Models

### Villa (Enhanced)
```
- is_off_market: Boolean (private/invite-only)
- weekend_multiplier: Float (default 1.2)
- long_stay_discount_7/14/30: Float (percentage)
- cleaning_fee: Float
- instant_book: Boolean
- commission_percent: Float (default 30%)
```

### PrivateOffer
```
- offer_id, villa_id, guest_name/email/phone
- check_in, check_out, num_guests, num_nights
- base_amount, discount_percent/amount, subtotal
- gst_amount, security_deposit, total_amount
- commission_percent/amount, owner_payout
- expires_at, payment_link, status
```

### EventPricing
```
- event_id, name, villa_id (optional)
- start_date, end_date
- price_multiplier, min_nights
- is_active
```

### OwnerPayout
```
- payout_id, owner_id/name/email
- villa_id/name, booking_id
- gross_amount, commission_percent/amount
- net_payable, status, paid_date
- payment_reference, payment_mode
```

---

## Key API Endpoints

### Private Offers
- `POST /api/admin/private-offers` - Create negotiated offer
- `GET /api/admin/private-offers` - List all offers
- `GET /api/offer/{offer_id}` - Public offer details
- `POST /api/offer/{offer_id}/accept` - Accept and create booking

### Razorpay
- `POST /api/payments/create-order` - Create payment order
- `POST /api/payments/verify` - Verify payment signature
- `POST /api/webhooks/razorpay` - Handle payment webhooks
- `GET/POST /api/admin/payment-settings` - Manage gateway settings

### Payouts
- `GET /api/admin/payouts` - List all payouts
- `POST /api/admin/payouts/generate` - Generate from bookings
- `PUT /api/admin/payouts/{payout_id}` - Update status
- `GET /api/admin/payouts/export` - Export CSV

### Event Pricing
- `GET /api/admin/event-pricing` - List pricing rules
- `POST /api/admin/event-pricing` - Create rule
- `DELETE /api/admin/event-pricing/{event_id}` - Delete rule

---

## Pending / Upcoming Tasks

### P0 - Critical
- [ ] **Razorpay Keys**: Waiting for user to provide API keys
- [ ] **Resend Email Integration**: Automated booking confirmations

### P1 - Important
- [ ] **WhatsApp Automation**: Discuss paid service (Twilio) vs manual links
- [ ] **SEO Schema Markup**: LodgingBusiness + Product schema

### P2 - Enhancement
- [ ] Concierge marketplace & add-ons catalog
- [ ] Lead hub with Gmail/Instagram integration
- [ ] Editorial destination content pages
- [ ] VIP/NDA verification flows
- [ ] Full analytics dashboard

### Backlog
- [ ] Add content for remaining 18+ villas
- [ ] Refactor AdminDashboard.jsx (split components)
- [ ] Refactor server.py (modularize routes)
- [ ] Staff scheduling system

---

## Technical Notes

### Environment Variables
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `RAZORPAY_KEY_ID` - Razorpay API Key (optional, can be set in admin)
- `RAZORPAY_KEY_SECRET` - Razorpay Secret
- `RAZORPAY_WEBHOOK_SECRET` - Webhook verification

### Dependencies Added
- Backend: `razorpay==2.0.0`
- Frontend: `react-helmet-async`

### Credentials
- Login via Google Auth
- "Become Admin/Owner" buttons on first login for setup
