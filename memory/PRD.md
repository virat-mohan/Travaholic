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
- Lead capture forms
- SEO-friendly URLs, meta tags, schema markup, sitemap

---

## What's Been Implemented (Jan 30, 2026)

### Frontend Pages
- [x] Homepage with hero, featured villas, destinations, Google Reviews, Concierge USP
- [x] Villas listing page with filters
- [x] Villa detail page with gallery, calendar, booking form, long-stay discount banner, house rules
- [x] About page
- [x] Contact page with form
- [x] Blog/Travel Guide page
- [x] List Your Villa page (2-step form)
- [x] Login page with Google OAuth + role selection (Admin/Owner)
- [x] **Admin Dashboard** - Full functionality:
  - Dashboard overview with stats
  - Villas management (CRUD, status toggle)
  - Bookings management (confirm/cancel/complete)
  - Leads management (status updates)
  - Owners list
  - Financials summary with CSV export
  - Homeowner listing applications
  - Razorpay setup guide
- [x] **Villa Owner Portal** - Full functionality:
  - Dashboard with stats and upcoming bookings
  - My Villas view with details
  - Calendar with date range blocking/unblocking
  - Earnings history with breakdown

### Features Implemented (Session 2 - Jan 30, 2026)
- [x] Transparent logo in Navbar and Footer
- [x] Instagram link in Navbar and Footer
- [x] Google Reviews section (6 real 5-star reviews) on Homepage
- [x] Testimonials section removed
- [x] Personal Concierge USP under About Us
- [x] Long-stay discount banner on booking page (40% off 28+ days, 20% off 7+ nights)
- [x] Chef service add-on with BHK-based pricing
- [x] Services on request (Spa, BBQ, Decoration)
- [x] House Rules & Policies section with:
  - Cancellation policy (100%/50%/No refund tiers)
  - No Drugs / No Smoking rules
  - Security deposit requirement
  - Check-in/Check-out times
  - ID & Indemnity requirements
- [x] Image captions below images (extracted from filename)
- [x] Full Admin Panel functionality
- [x] Full Villa Owner Portal functionality
- [x] SEO improvements:
  - Meta tags (title, description, Open Graph, Twitter)
  - Organization schema markup
  - LodgingBusiness schema markup
  - Product schema on villa pages
  - Auto-generated XML sitemap (`/api/sitemap.xml`)
  - Canonical URLs

### Backend API
- [x] Villas CRUD endpoints
- [x] Bookings management
- [x] Leads management
- [x] User authentication (Google OAuth)
- [x] Owner dashboard endpoint
- [x] Financials endpoints
- [x] Block/unblock dates
- [x] Pricing calculation
- [x] Sitemap generation
- [x] Make admin/owner endpoints (for setup)

### Database
- 20 villas seeded with varying commission rates
- La Morena and La Selva villas have detailed content
- Collections: users, villas, bookings, leads, blocked_dates, addons, pricing_overrides

---

## Pending / Future Tasks

### P1 - High Priority
- [ ] **Razorpay Integration** - Wire up payment flow (requires user API keys for live mode)
- [ ] **Resend Email Integration** - Booking confirmations, owner notifications (requires API key)

### P2 - Medium Priority  
- [ ] Add unique content/images for remaining 18 villas
- [ ] Blog content management
- [ ] Experiences page content

### P3 - Backlog
- [ ] Multi-image upload in admin
- [ ] Booking modification by guests
- [ ] Review/rating system
- [ ] Promo codes and discounts
- [ ] Analytics dashboard
- [ ] Mobile app (React Native)

---

## Key Technical Details

### Environment Variables
- Frontend: `REACT_APP_BACKEND_URL`
- Backend: `MONGO_URL`, `DB_NAME`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RESEND_API_KEY`

### API Endpoints
- `GET /api/villas` - List all villas
- `GET /api/villas/slug/{slug}` - Get villa by slug
- `POST /api/bookings` - Create booking
- `POST /api/leads/callback` - Submit callback request
- `GET /api/owner/dashboard` - Owner dashboard data
- `GET /api/sitemap.xml` - XML sitemap
- `POST /api/make-admin` - Set user as admin
- `POST /api/make-owner` - Set user as owner (demo)

### Authentication
- Emergent-managed Google OAuth
- Roles: admin, owner, guest
- Protected routes for admin/owner dashboards

---

## How to Test

### Admin Panel
1. Go to `/login`
2. Sign in with Google
3. Click "Become Admin (First-time Setup)"
4. Access admin at `/admin`

### Owner Portal
1. Go to `/login`
2. Sign in with Google
3. Click "Become Villa Owner (Demo)"
4. Access portal at `/owner`

---

## Project Health
- ✅ Frontend: Fully functional
- ✅ Backend: Fully functional
- ✅ Admin Panel: Complete
- ✅ Owner Portal: Complete
- ⚠️ Razorpay: Placeholder (needs live keys)
- ⚠️ Resend: Placeholder (needs API key)
- ⚠️ 18 villas: Placeholder content
