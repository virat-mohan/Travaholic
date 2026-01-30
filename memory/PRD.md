# Travaholic Stays - Product Requirements Document

## Original Problem Statement
Build a fully functional, SEO-optimised, ultra-luxury villa booking platform for Travaholic Stays, a villa rental and management company operating in North Goa, India. The platform includes frontend website, backend APIs, admin panel, owner portal, booking engine, and payment integration.

## User Personas
1. **Guests**: Affluent travelers seeking luxury villa rentals in Goa, Mussoorie, Himachal Pradesh
2. **Villa Owners**: Property owners looking to list and manage their villas
3. **Admin Team**: Travaholic staff managing bookings, villas, leads, and finances

## Core Requirements (Static)
- Ultra-luxury, minimal, editorial design aesthetic
- Villa discovery with filters (location, guests, pool, price)
- Individual villa pages with galleries, amenities, calendar
- Dynamic pricing (weekday/weekend/seasonal)
- Booking engine with date selection and add-ons
- Razorpay payment integration
- Commission-based financial ledger
- Admin dashboard for villa/booking/lead management
- Villa owner portal with calendar and earnings
- Lead capture (callback requests, homeowner inquiries)
- SEO-friendly architecture

## Tech Stack
- **Frontend**: React 18, Tailwind CSS, Framer Motion, Shadcn UI
- **Backend**: FastAPI (Python), MongoDB
- **Auth**: Emergent Google OAuth
- **Payments**: Razorpay (test mode with setup guide)
- **Email**: Resend (placeholder)
- **Storage**: Google Drive (placeholder)

## What's Been Implemented (Jan 30, 2026)

### Frontend Pages
- [x] Homepage with hero, featured villas, destinations, testimonials
- [x] Villas listing page with filters
- [x] Villa detail page with gallery, calendar, booking form
- [x] About page
- [x] Contact page with form
- [x] Blog/Travel Guide page
- [x] List Your Villa page (2-step form)
- [x] Login page with Google OAuth
- [x] Admin Dashboard (overview, villas, bookings, leads, owners, financials, listings, Razorpay setup)
- [x] Owner Portal (dashboard, villas, calendar, earnings)

### Backend APIs
- [x] Villa CRUD (/api/villas)
- [x] Villa availability & blocked dates
- [x] Dynamic pricing calculation
- [x] Booking creation and management
- [x] Razorpay order creation and verification
- [x] Lead capture (/api/leads)
- [x] Homeowner listing applications (/api/list-villa)
- [x] Owner management and agreements
- [x] Financial ledger with commission tracking
- [x] Auth session management

### Design Features
- [x] Playfair Display + Manrope typography
- [x] Luxury color palette (stone, sand, charcoal, muted gold)
- [x] Smooth animations with Framer Motion
- [x] Mobile-responsive design
- [x] Editorial layout patterns

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Complete Razorpay live integration (requires API keys)
- [ ] Email notifications via Resend (requires API key)
- [ ] Google Drive image upload integration (requires credentials)

### P1 - High Priority
- [ ] Villa image upload in admin panel
- [ ] Owner agreement PDF upload
- [ ] Booking confirmation emails
- [ ] Payment receipt generation
- [ ] Seasonal pricing overrides UI

### P2 - Medium Priority
- [ ] Reviews/ratings system
- [ ] Advanced search (amenity filters)
- [ ] Interactive location maps
- [ ] Blog CMS integration
- [ ] Newsletter subscription

### P3 - Nice to Have
- [ ] Multi-language support
- [ ] Currency conversion
- [ ] Wishlist functionality
- [ ] Social sharing
- [ ] Guest dashboard

## Database Collections
- `users` - User accounts with roles (admin, owner, guest)
- `user_sessions` - Auth sessions
- `villas` - Villa listings with pricing
- `bookings` - Booking records with financial data
- `addons` - Add-on services (chef, spa, transfers)
- `leads` - Callback and inquiry leads
- `blocked_dates` - Villa availability blocks
- `pricing_overrides` - Date-specific pricing
- `homeowner_listings` - New villa applications
- `owner_agreements` - Agreement documents

## Environment Variables Required
```
# Backend (.env)
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
RESEND_API_KEY=
SENDER_EMAIL=onboarding@resend.dev
ADMIN_EMAIL=admin@travaholicstays.com
```

## Next Tasks
1. Configure Razorpay live keys for production
2. Set up Resend API for email notifications
3. Implement Google Drive for villa images
4. Add villa creation form in admin panel
5. Build owner onboarding approval workflow
