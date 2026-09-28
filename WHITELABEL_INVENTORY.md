# Travaholic Stays — White-Label Inventory for DevShop Retail OS

**Model: MARKETPLACE.** This codebase is a two-sided marketplace, not a subscription business and not a pure D2C store. Villas ("listings") belong to individual "owners" (`villa.owner_id` → a `User` with `role="owner"`), each listing carries its own `commission_percent`, guests ("buyers") book against a specific owner's property, and the platform (Travaholic) takes a commission that is calculated and tracked per booking (`commission_amount`, `owner_payout`). There is no subscription billing, no recurring mandate, no plan/tier model anywhere in the code.

**What it sells: bookings/stays**, specifically date-range villa rentals (nightly, calendar-based availability), not physical products and not services-as-appointments. It is closer to a boutique Airbnb-for-villas than an Etsy-style goods marketplace.

**Caveat that matters for the white-label spec:** although the data model is genuinely multi-seller, the *money flow* is not a true split-payment marketplace. There is exactly one Razorpay account and one bank account for the whole platform (Travaholic's own — hardcoded, see §5). Guests never pay a seller directly, and "owner payouts" are bookkeeping records the admin settles manually outside the app (NEFT/UPI) — see §6 and §10 for the full explanation. A new operator inherits a real multi-seller catalog/booking model but a single-merchant-of-record payment model.

---

## 1. FEATURE INVENTORY

| Feature | Routes/pages | Key lib files | DB tables | What it does (1 line) | Classification |
|---|---|---|---|---|---|
| Villa catalog browse/search | `/villas`, `VillasPage.jsx` | `server.py` `GET /villas` | `villas`, `blocked_dates` | Filter listings by location, region, dates, guests, bedrooms, pool, price | CORE |
| Villa detail page | `/villas/:slug`, `VillaDetailPage.jsx` | `server.py` `GET /villas/slug/{slug}` | `villas` | Gallery, amenities, pricing, booking widget for one listing | CORE |
| Availability calendar (date-range) | villa detail + admin calendar | `calculate_booking_price`, `blocked_dates` collection | `blocked_dates` | Blocks/unblocks date ranges per villa; booking creation checks overlap | MODEL (date-range bookings) |
| Dynamic pricing engine | booking calc | `calculate_booking_price()` | `villas`, `pricing_overrides`, `event_pricing` | Weekday/weekend/override/event pricing, long-stay discounts, cleaning fee, GST | MODEL |
| Seasonal/event pricing | Admin → Event Pricing | `AdminEventPricing` | `event_pricing` | Multiplier + min-nights rule for date ranges (NYE, Diwali, etc.) | VERTICAL/CATEGORY-SPECIFIC (stays) |
| Pricing overrides (per-date) | villa admin | `pricing-override` endpoint | `pricing_overrides` | Admin sets an explicit price for specific dates | VERTICAL-SPECIFIC (stays) |
| Coupons | checkout, Admin → Coupons | `Coupon` model, `/coupons/validate` | `coupons` | % or fixed discount code, usage limits, per-villa scoping | CORE (generic discount codes) — but **never actually applied** in `create_booking`/pricing (see §8) |
| Online booking + checkout | `VillaDetailPage.jsx` | `POST /bookings`, `calculate_booking_price` | `bookings` | Guest submits a booking, gets a proposal PDF/email, pays via Razorpay | CORE |
| Manual/offline booking (admin) | Admin → Bookings → New | `POST /admin/manual-booking` | `bookings` | Admin creates a booking for phone/WhatsApp-sourced guests, incl. off-catalog villas | MODULE |
| Private offers (negotiated pricing) | `/offer/:id`, `PrivateOfferPage.jsx` | `PrivateOffer` model, `/admin/private-offers*` | `private_offers` | Admin builds a custom-priced, time-limited offer link a guest can pay | MODULE |
| Payment collection (Razorpay Checkout) | checkout / offer page | `payments/create-order`, `/verify`, webhook | `bookings` | Single-merchant card/UPI collection via Razorpay | CORE (but see §5/§10 — no split payments) |
| Manual payment recording | Admin → Bookings | `POST /admin/bookings/{id}/mark-payment` | `bookings`, `blocked_dates` | Admin marks advance/full payment received (bank transfer/UPI/cash); this is what actually blocks the calendar | MODEL |
| Booking PDF (proposal/confirmation/offer) | multiple | `generate_booking_confirmation_pdf()` | — | 2-page branded PDF: stay details, pricing, bank details, house rules, cancellation policy | CORE (mechanism) / content is BRAND-ONLY |
| Booking confirmation & receipt emails | booking/payment flows | `generate_*_email_html()` | — | HTML emails at proposal, payment-received, full-confirmation stages | CORE (mechanism) |
| WhatsApp notifications (buyer-facing) | booking/payment/offer flows | `send_whatsapp_*()`, Twilio | — | Proposal, advance-received, full-confirmation, private-offer WhatsApp messages | MODULE (Twilio optional, no-ops if unconfigured) |
| Airbnb iCal sync (import) | Admin → villa | `sync_airbnb_calendar`, cron script | `blocked_dates` | Pulls Airbnb's booked dates in as blocks so Travaholic won't double-book | VERTICAL-SPECIFIC (stays) |
| Airbnb iCal export | `/villas/{id}/calendar.ics` | `_generate_ical_feed()` | `blocked_dates` | Publishes Travaholic's blocks as a feed Airbnb can import | VERTICAL-SPECIFIC (stays) |
| Seller ("owner") lead capture / apply-to-list | `/list-your-villa`, `ListYourVillaPage.jsx` | `POST /list-villa` | `homeowner_listings`, `leads` | Public form: prospective owner submits property details + photos | MODULE (seller onboarding intake) |
| Seller listing review (approve/reject) | Admin → Listings | `AdminListings`, `PUT /homeowner-listings/{id}` | `homeowner_listings` | Admin flips status; **does not create a Villa or invite the owner** — fully manual follow-up (see §8) | MODULE — **incomplete workflow** |
| Seller (owner) account invite | Admin → Owners | `POST /admin/invite-owner` | `users` | One-time invite link; owner sets own password | MODEL (marketplace seller onboarding) |
| Seller (owner) agreement upload | Admin → Owners | `owners/{id}/agreement` | `owner_agreements` | Admin uploads a file URL (no e-sign, no upload UI found for it) | MODULE — thin |
| Seller dashboard (Owner Portal) | `/owner/*`, `OwnerDashboard.jsx` | `GET /owner/dashboard` | `villas`, `bookings`, `blocked_dates` | Overview, "My Villas" (read-only), Calendar (block/unblock own dates), Earnings | MODEL |
| Seller-side commission/earnings view | Owner → Earnings | `GET /financials/owner/{id}` | `bookings` | Table of bookings with commission deducted and net payout, "how earnings work" explainer | MODEL |
| Villa CRUD (create/edit/deactivate) | Admin → Villas | `VillaForm`, `/villas` CRUD | `villas` | Admin-only; owners **cannot** create or edit their own listings (see §6) | CORE, but seller-side listing creation is **missing** |
| Image upload | Admin/listing form | `/admin/upload-image`, `/list-villa/upload-image` | `images` | Resizes to ≤1920px, stores base64 JPEG **in MongoDB** (no S3/CDN) | CORE (mechanism) — storage choice is a scale limitation |
| Owner payout ledger | Admin → Payouts | `AdminPayouts`, `MarkPaidForm` | `payouts` | Generates payout records from paid bookings; admin manually marks "paid" with a bank ref | MODEL — **entirely manual, no payout API** (§5/§10) |
| Financial reporting (platform-wide, per-villa, per-owner) | Admin → Dashboard, Owner → Earnings | `/financials/*` | `bookings` | Revenue, commission, owner payout, security-deposit totals | CORE |
| Leads/CRM (guest & homeowner enquiries) | Admin → Leads | `Lead` model | `leads` | Callback requests, general enquiries, listing enquiries, status tracking | MODULE |
| Blog / content marketing | `/blog`, Admin → Blog | `BlogPost` model | `blog_posts` | SEO articles, categories, related villas | MODULE |
| Team management (admin users) | Admin → Team | `/admin/invite-admin`, `/admin/team` | `users` | Invite/remove co-admins, min. 1 admin enforced | CORE |
| First-admin bootstrap | `POST /make-admin` | — | `users` | Claims admin role for the first logged-in user only | OPERATOR-ONLY / **security risk if left live** (§8) |
| Debug "become an owner" endpoint | `POST /make-owner` | — | `users`, `villas` | Any authed user can self-promote to owner and grabs 2 unassigned villas "for testing" | **DON'T CARRY OVER** — see §8 |
| Sitemap/SEO | `/sitemap.xml` | `generate_sitemap()` | `villas`, `blog_posts` | XML sitemap; hardcoded domain and a stale `/experiences` route (site actually uses `/services`) | CORE (mechanism), content is BRAND-ONLY |
| Airbnb sync cron | Render cron job | `scripts/sync_airbnb_calendars.py` | `villas`, `blocked_dates` | Runs every 4h, standalone script (bypasses API auth) | VERTICAL-SPECIFIC background job |
| Splash/intro animation | Homepage only | `SplashScreen.jsx` | — | Chessboard-grid intro animation using villa photography | BRAND-ONLY presentation layer |
| Reviews (of listings or of sellers) | — | — | — | **Not implemented anywhere** — no review/rating model, field, or UI exists | MISSING — would need to be built |
| Disputes / refund arbitration | — | — | — | **Not implemented.** `cancel_booking` just flips status and frees the calendar block; no refund amount is computed, no dispute record, no arbitration state machine | MISSING — would need to be built |
| Buyer↔seller messaging | — | — | — | **Not implemented.** All communication is guest↔Travaholic-admin (WhatsApp/email); owners never message guests through the platform | MISSING — would need to be built |
| KYC / seller verification | — | — | — | **Not implemented.** Owner onboarding collects name/email/phone/address/company name only; no PAN/GST/bank-account capture, no verification step | MISSING — would need to be built for real payouts |

---

## 2. TERMINOLOGY

| Term | Where (files, count) | What it means | Generic config key to replace it with |
|---|---|---|---|
| "Travaholic" / "Travaholic Stays" | ~20 frontend files, ~40+ backend strings (emails, PDFs, sitemap, `FastAPI(title=...)`, `app_name`-style constants) | The marketplace's own brand name | `OPERATOR_BRAND_NAME` |
| "Villa" | Throughout `server.py` model names (`Villa`, `VillaCreate`), all frontend pages, nav labels ("My Villas", "List Your Villa") | The listing/inventory unit | `LISTING_TYPE_LABEL` (singular/plural) |
| "Owner" / "Homeowner" | `User.role="owner"`, `HomeownerListing`, `OwnerPayout`, `OwnerDashboard.jsx`, "Villa Owners" admin page | The seller/host role | `SELLER_ROLE_LABEL` |
| "Guest" | `User.role="guest"` (default), booking fields `guest_name/email/phone`, house-rules copy ("pax") | The buyer role | `BUYER_ROLE_LABEL` |
| "Booking" | `Booking` model, all endpoints, "Booking Confirmed/Proposal" documents | The order/reservation unit | `ORDER_TYPE_LABEL` |
| "Private Offer" | `PrivateOffer` model, `/offer/{id}` page, admin "Offers" nav (route exists at `admin/offers` but the nav array in the grepped section doesn't list it — verify at ship time) | Negotiated, time-limited, admin-built custom quote | `NEGOTIATED_OFFER_LABEL` |
| "Commission" | `commission_percent`, `commission_amount`, everywhere in financials/payouts UI | Platform's take-rate | already generic — keep, or `TAKE_RATE_LABEL` |
| "Security Deposit" | `Villa.security_deposit`, booking fields, PDF/email copy | Refundable deposit collected outside the app (cash/UPI at check-in) | `DEPOSIT_LABEL` (vertical-specific concept — see §3) |
| "pax" | House rules / WhatsApp copy | Slang for guest count | plain-language, not a config concern but flag for copy replacement |
| "Travaholic Caps" / "Travaholic Treks" / "Travaholic Realty" | `AboutPage.jsx` founder-story copy | Sister brands under the same personal founder's umbrella — entirely this operator's personal narrative | delete/replace wholesale, not configurable |
| Ishan Seth (founder name/photo) | `AboutPage.jsx`, `frontend/public/founder-ishan.png` | This operator's specific founder bio | remove; if a new operator wants a founder story it's free-text content, not a config key |
| "25,000+ happy guests" | `AboutPage.jsx` meta description | Unverifiable/operator-specific traction claim | remove; a new operator has zero guests at go-live |
| Region/location vocabulary: Goa, Anjuna, Vagator, Morjim, Mussoorie, Himachal Pradesh | `Villa.location/region` defaults, `ListYourVillaPage.jsx` dropdown, `Footer.jsx` "Destinations" links, sitemap/meta copy | Hardcoded geography this operator serves | `OPERATOR_SERVICE_REGIONS` (list) |
| "Team Travaholic" | PDF footer, email sign-offs | Sign-off name | `SUPPORT_TEAM_SIGNOFF` |
| Instagram handle `@travaholicstays` | Footer, Navbar, emails | Operator's social handle | `OPERATOR_INSTAGRAM_URL` |
| Phone `+91 99588 71283` | ~15 files (Navbar, Footer, Contact, Terms, Privacy, PDFs, emails, WhatsApp CTAs, WhatsApp Button component) | Operator's WhatsApp/support number | `OPERATOR_SUPPORT_PHONE` |
| Second phone `+91 97303 66534` | `ServicesPage.jsx` (yacht charter contact) | A *different* number for one service line — inconsistent even within this one operator | fold into a generic per-service contact config, or drop |
| Email `Travaholicstays@gmail.com` | Footer, admin lead-notification fallback (`ADMIN_EMAIL` default) | Operator's inbox — notably a personal Gmail, not a branded domain address | `OPERATOR_NOTIFICATION_EMAIL` |
| `bookings@travaholicstays.com` / `onboarding@travaholicstays.com` | Hardcoded `"from"` addresses in `server.py` (multiple `resend.Emails.send` calls) — **not** driven by `SENDER_EMAIL` env var, inconsistent with it | Sending identity | `OPERATOR_SENDER_EMAIL` (needs a real fix: today two different email identities are used depending on code path — see §8) |
| Bank details (Standard Chartered / TRAVAHOLIC / a/c `52105900326` / IFSC `SCBL0036033` / GK-1 Delhi branch) | Hardcoded in `generate_booking_confirmation_pdf()` and `generate_booking_received_email()`, duplicated in two places | Where guests wire money for bank-transfer payment | `OPERATOR_BANK_ACCOUNT_NAME/NUMBER/IFSC/BRANCH` — **currently a secret-adjacent value baked into code**, must become settings |
| "TRAVAHOLIC STAYS" wordmark, tagline "Ultra-Luxury Villas in Goa & Beyond" | PDF header, `design_guidelines.json`, meta tags | Brand identity | `OPERATOR_TAGLINE` |
| `travaholicstays.com` domain | `FRONTEND_URL` default fallback, sitemap `base_url`, OG/canonical tags throughout, `EMAIL_LOGO_URL` fallback | Operator's live domain | `OPERATOR_DOMAIN` |

---

## 3. BUSINESS RULES & NUMBERS

| Key or constant | Current value | Where | What it controls | Who decides for a new operator |
|---|---|---|---|---|
| `Villa.commission_percent` | 30.0 (default, per-villa override) | `Villa` model, `VillaForm`, booking/offer pricing | Platform take-rate, can vary per listing | TOGETHER |
| Manual-booking/private-offer default commission | 30.0 | `ManualBookingCreate`, `_resolve_offer_villa` | Fallback take-rate when no villa/commission given | TOGETHER |
| Per-booking commission override | admin can type any % on edit (`update_booking`) | `PUT /bookings/{id}` | One-off deal commission | TOGETHER |
| GST | 18.0% hardcoded | `calculate_booking_price()`, `_price_offer()`, 3 email templates | Tax added to every booking subtotal | OPERATOR (tax rate is jurisdiction/product dependent — should never be hardcoded at all) |
| Security deposit default | ₹20,000 | `Villa.security_deposit`, booking defaults, PDF/email fallback text (also literally hardcoded as `20000` in ~6 separate call sites, not just the villa field) | Refundable deposit shown to guest, collected out-of-band | TOGETHER |
| Weekend price multiplier | 1.2x (default, per-villa override) | `Villa.weekend_multiplier` | Fri/Sat pricing bump when no explicit weekend_price set | OPERATOR |
| Long-stay discounts | 0% default at 7/14/30 nights (`long_stay_discount_7/14/30`), per-villa | `calculate_booking_price()` | Automatic discount tiers | OPERATOR |
| Event pricing multiplier | 1.5x default | `EventPricing.price_multiplier` | NYE/Diwali-style surge pricing | OPERATOR |
| Event minimum nights | 3 default | `EventPricing.min_nights` | Forces a longer minimum stay during a marked event | OPERATOR |
| `Villa.minimum_nights` | 1 default, per-villa | `Villa` model | Shortest bookable stay | OPERATOR |
| Cleaning fee | 0 default, per-villa | `Villa.cleaning_fee` | One-time add-on to subtotal | OPERATOR |
| Cancellation/refund tiers | **Hardcoded PDF copy only**: 100% refund ≥30 days, 50% refund 15–30 days, 0% <15 days | `generate_booking_confirmation_pdf()` house-rules text | Guest-facing policy text — **not enforced in code anywhere**; `cancel_booking()` never computes a refund | TOGETHER — and must actually be wired into logic, not just printed |
| Extra-pax charge | ₹2,000/person beyond 6 pax (hardcoded PDF copy) | PDF house rules | Extra-guest surcharge — separately, `ManualBookingCreate.extra_pax_charge` exists as a real field for manual bookings, but the "6 pax base / ₹2,000" rule itself is not enforced for online bookings, only printed | TOGETHER |
| Smoking-indoors fee | ₹10,000 (hardcoded PDF copy) | PDF house rules | Penalty fee mentioned in policy — never charged/enforced in code | OPERATOR |
| Check-in / check-out times | 2:00 PM / 11:00 AM (hardcoded, repeated in ~8 places: PDF, 3 email templates, WhatsApp message, WhatsApp function) | multiple | Guest-facing operational times | OPERATOR |
| Coupon discount rules | `discount_type` (%/fixed), `discount_value`, `min_booking_value`, `max_discount`, `usage_limit`, `per_user_limit`, `applicable_villas` | `Coupon` model, `/coupons/validate` | Fully data-driven per coupon | OPERATOR — but note: validated coupons are never actually deducted anywhere in the booking-creation flow (dead feature, see §8) |
| `min_advance_percent` | 30.0, stored in `payment_settings`, editable in admin UI | `PaymentSettings` model | **Intended** to gate minimum advance payment % — **never read/enforced anywhere in booking or payment code** | TOGETHER — must be wired in or removed |
| `partial_payment_enabled` | true, stored, editable | `PaymentSettings` | Toggle for allowing advance/partial payment — not actually read anywhere else either | TOGETHER |
| Max image upload size | 10MB raw | `MAX_UPLOAD_BYTES` | Upload cap before compression | DEVSHOP (infra limit) |
| Max upload image dimension | 1920px, JPEG quality 85 | `upload_image()` | Compression settings | DEVSHOP |
| Max listing photos (seller intake form) | 8 | `ListYourVillaPage.jsx` `MAX_LISTING_IMAGES` | Owner-application photo cap | DEVSHOP/OPERATOR |
| Invite link expiry | 7 days | `invite_admin`, `invite_owner` | Admin/owner invite token validity | DEVSHOP |
| Session token expiry | 7 days | `_create_session_response()` | Login session lifetime | DEVSHOP |
| Private offer default expiry | 48 hours | `PrivateOfferCreate.expiry_hours` | How long a negotiated offer link stays valid | OPERATOR |
| Airbnb sync cadence | every 4 hours (`0 */4 * * *`) | `render.yaml` cron schedule | How often Airbnb calendars are pulled | OPERATOR/DEVSHOP |
| Razorpay test-card numbers | hardcoded in `/admin/razorpay-setup` response | `get_razorpay_setup_guide()` | Reference info shown to admin during setup | DEVSHOP (static help content, fine to keep generic) |

---

## 4. BRAND/OPERATOR ASSETS & CONTENT

| Asset | Where | Must be replaced / can be generated / generic already |
|---|---|---|
| Logo (color) | `frontend/public/Travaholic_color_logo-removebg-preview.png`, `Travaholic_color_logo_splash.png`, `backend/assets/travaholic-logo-color.png` | Must be replaced |
| Logo (mono/white, for dark footer) | `frontend/public/travaholic-logo.png`, `backend/assets/travaholic-logo.png` | Must be replaced |
| Founder photo | `frontend/public/founder-ishan.png` | Must be replaced (or the whole founder-story section removed for operators without one) |
| Splash screen thumbnails | `frontend/public/splash-thumbs/*` | Must be replaced (villa photography used for the chessboard-grid intro) |
| Stock villa/destination imagery | `frontend/public/villas/*`, `frontend/public/destinations/*`, `frontend/public/cruises/*`, `frontend/public/images/*` | Must be replaced with the new operator's actual listing photography |
| About-page hero | `frontend/public/about-hero.png` | Must be replaced |
| Fonts: Playfair Display (heading), Manrope (body), Cormorant Garamond (accent) | `design_guidelines.json`, `index.css` | Can be generalized — token, but this specific pairing is this brand's aesthetic choice |
| Color palette (ink #1A1A1A, gold accent #C9A876/#C6A87C, cream #F9F8F6) | `design_guidelines.json`, `index.css`, PDF constants (`PDF_INK`, `PDF_GOLD`, etc. — duplicated separately from the CSS tokens), email inline-CSS constants (`EMAIL_GOLD` etc. — duplicated a *third* time) | Must be replaced — and structurally should be **one** source of truth; today the same brand palette is hand-copied into 3 places (CSS, PDF generator, email templates) so a rebrand requires editing 3 files in sync |
| Bank details block | PDF + received-booking email (2 hardcoded copies) | Must be replaced — should become a payment-settings field, not code |
| PDF footer contact line | `generate_booking_confirmation_pdf()` | Must be replaced |
| Email header/footer (logo, phone, Instagram, tagline) | 5 separate `generate_*_email_html()` functions, each with the same header/footer HTML hand-duplicated | Must be replaced — and consolidated (today a rebrand means editing the same footer HTML 5 times) |
| WhatsApp message copy (5 functions: proposal, advance, full-confirmation, private-offer, admin-preview) | `server.py` | Must be replaced (brand name, phone, sign-off, emoji style) |
| Terms of Service copy | `TermsOfServicePage.jsx` | Must be replaced (operator legal entity name, contact) |
| Privacy Policy copy | `PrivacyPolicyPage.jsx` | Must be replaced |
| Cancellation policy text | PDF house rules section only (no standalone policy page) | Must be replaced/formalized — currently only exists as PDF copy, not a page or enforced rule |
| House rules (no-drugs, no-smoking, guest registration, 10PM quiet hours, extra-pax) | PDF `house_rules` list | Must be replaced (property-type and jurisdiction specific) |
| ID-requirements copy ("PAN cards not accepted") | PDF | Must be replaced (India-specific, hardcoded) |
| SEO meta/OG tags per page | every page's `<Helmet>` block | Must be replaced (title, description, canonical/OG URLs all hardcode `travaholicstays.com`) |
| Sitemap base URL + static page list | `generate_sitemap()` | Must be replaced — also currently buggy (`/experiences` isn't a real route) |
| About-page brand story (founder bio, sister-brand narrative) | `AboutPage.jsx` | Must be replaced wholesale — not configurable, free-text |
| "25,000+ happy guests" / traction claims | `AboutPage.jsx` meta | Must be removed |
| Blog seed content | `backend/scripts/blog_posts_data.json` (18.7KB, imported via `/admin/seed-blog-posts`) | Operator-specific seed data — do not carry over, or offer as optional example content |
| Villa seed data (12 real villas) | `backend/scripts/real_villas_data.json` (32.6KB), `import_real_villas.py` | Must not be carried over — real production data from this operator |
| `design_guidelines.json` | repo root | Structurally reusable as a "design token spec" pattern for new operators, but its actual values are this brand's | Can be generated from operator inputs (if DevShop builds an intake → token generator) |

---

## 5. INTEGRATIONS & CREDENTIALS

| Service | Env vars / settings keys | What it's used for | Setup steps for a new operator | Automatable or needs a human |
|---|---|---|---|---|
| MongoDB Atlas | `MONGO_URL`, `DB_NAME` | Primary datastore (Motor/PyMongo) | Create cluster, DB user, connection string, network access list | Mostly automatable via Atlas API; network/IP allowlist may need a human |
| Razorpay (Checkout — buyer collection only) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (also duplicated as DB-stored settings via `/admin/payment-settings`, which take precedence over env vars in the second `/payments/*` route set — see §8 duplicate-routes note) | Order creation, signature verification, webhook (`payment.captured`/`failed`, `refund.processed`) | Sign up, **complete KYC (2–3 business days, human step)**, generate API keys, configure webhook URL | **Needs a human** (KYC) — the rest (keys, webhook URL) is copy-paste/automatable |
| **Razorpay Route / split settlements — NOT integrated** | — | **This is the gap flagged in the brief.** The code collects 100% of every payment into Travaholic's own single Razorpay account. There is no linked-account creation, no automatic split at capture time, and no payout API call anywhere in the codebase. "Owner payout" is purely a calculated ledger row (`payouts` collection) that an admin marks `paid` by hand after wiring money manually outside Razorpay (NEFT/UPI/cash, with a free-text reference field) | For a real multi-seller marketplace, this needs Razorpay Route (or Stripe Connect equivalent) — linked seller accounts, KYC per seller, automatic transfer-on-capture. **This is new build, not configuration.** | Needs both engineering (integration) and a human step per seller (their own KYC with the payment processor) |
| Resend (transactional email) | `RESEND_API_KEY`, `SENDER_EMAIL` (default `onboarding@resend.dev` — but several send sites hardcode `bookings@travaholicstays.com`/`onboarding@travaholicstays.com` instead of reading `SENDER_EMAIL`, so the env var doesn't fully control sender identity today — see §8) | All guest/owner/admin transactional email | Create Resend account, verify sending domain (DNS), generate API key | DNS domain verification needs a human; key generation is automatable |
| Twilio (WhatsApp Business API) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM`, `TWILIO_TEMPLATE_BOOKING_PROPOSAL`, `TWILIO_TEMPLATE_ADVANCE_PAYMENT`, `TWILIO_TEMPLATE_BOOKING_CONFIRMED`, `TWILIO_TEMPLATE_PRIVATE_OFFER` | Buyer-facing WhatsApp notifications (proposal, payment receipt, confirmation, private offer) | Twilio account, WhatsApp Business sender approval (Meta), submit Content templates for approval, get Content SIDs | **Needs a human** — Meta/WhatsApp Business approval and template approval are manual review processes that can take days |
| Google Maps (link-based, no API key) | none — just parses pasted Google Maps URLs for lat/lng via regex | Villa location display/directions link | Admin pastes a Maps URL when creating a villa | No integration/credential needed — this is a nice, zero-cost pattern worth keeping generic |
| Airbnb (iCal, not an API partnership) | none — just a URL field (`Villa.airbnb_ical_url`) pasted by admin | One-way calendar sync (import Airbnb's blocked dates; export Travaholic's own feed) | Admin copies the "export calendar" link from each Airbnb listing's settings | Needs a human per listing (copy-paste the iCal URL); the sync itself is automatable/scheduled |
| Instagram | none (just a static profile link) | Footer/Navbar social link only — **no API integration, no feed pull, no ads integration** despite the brief's checklist expecting one | Just the operator's handle/URL | Config only |
| Analytics | **None found** — no GA4/Segment/Mixpanel/PostHog snippet anywhere in `frontend/src` or `public/index.html` | — | If DevShop wants analytics per operator, this needs to be added, not configured | N/A — missing entirely |
| Storage/CDN | **None** — images are base64-encoded directly into MongoDB documents (`images` collection) | Villa/listing photo hosting | This does not scale well multi-tenant (Mongo document/storage bloat, no CDN edge caching); a real white-label needs S3/Cloudinary/R2 | This is new build, not configuration |
| Hosting | Render (backend web service + cron job, see `render.yaml`), implied Vercel for frontend (referenced in earlier session context, no explicit config file in this repo) | App hosting | Standard PaaS deploy | Automatable via Render/Vercel APIs; DNS/custom-domain step needs a human |
| CORS | `CORS_ORIGINS` (comma-separated, defaults to `*`) | Which frontend origins can call the API | Set to the operator's real frontend domain(s) | Config only |

---

## 6. DATA MODEL

All collections are implicit (no formal MongoDB schema/migrations — Motor/PyMongo, Pydantic validates only at the API boundary).

| Collection | Operator-specific/seed data? | Notes |
|---|---|---|
| `users` | Yes (real people) | Single collection for guest/owner/admin, discriminated by `role` string. No separate `sellers` table — a seller **is** a `User` row with `role="owner"`, joined to listings only via `Villa.owner_id`. |
| `villas` | **Yes — 12 real production listings** (`real_villas_data.json`) | The listing table. Carries `owner_id`, `commission_percent`, and all pricing rules per listing (see §3). Multi-seller support is real here: `GET /bookings` and `GET /financials/owner/{id}` correctly scope by `owner_id`. |
| `bookings` | Yes (real guest PII) | Captures **both sides** of a transaction in one flat document: buyer fields (`guest_name/email/phone`), seller-economics fields (`commission_percent`, `commission_amount`, `owner_payout`), and platform fields (`payment_status`, `booking_status`). There is no separate "order" vs "seller settlement" object — commission math is computed once at creation/offer-acceptance and frozen into the booking row (admin can later override it per-booking). |
| `blocked_dates` | Operational, not seed | The **only** availability mechanism — calendar-based (date ranges), not unit-count-based (no concept of "N units of the same SKU"; each `Villa` is a unique, singular piece of inventory, which fits stays/services but would not fit a marketplace selling stocked physical goods). `reason` discriminates booking-holds vs owner-blocks vs Airbnb-sync vs maintenance. |
| `pricing_overrides`, `event_pricing` | Operator config | Per-date/per-range price rules, see §3. |
| `private_offers` | Real customer data | Self-contained pricing snapshot (doesn't reference `bookings` until accepted). |
| `owner_agreements` | Real docs | Just `{owner_id, file_url, file_name}` — no signature/audit trail. |
| `payouts` | Real financial records | **This is a ledger, not a payment rail.** Generated on-demand from paid bookings (`POST /admin/payouts/generate`), then hand-marked `paid` with a free-text reference. No linkage to an actual bank/Razorpay transfer object. |
| `payment_settings` | Operator config (single document, `setting_id="payment_settings_main"`) | Razorpay keys + `min_advance_percent`/`partial_payment_enabled` toggles that are **stored but never read by the booking/pricing code** (dead settings — see §8). |
| `homeowner_listings` | Real applicant data | Seller-intake form submissions. Not linked to `villas` at all — approving one does not create a `Villa` row (manual gap, see §8). |
| `leads` | Real data | Generic CRM inbox for both guest and homeowner enquiries. |
| `coupons` | Operator config | Fully modeled (types, caps, usage limits, per-villa scoping) but **never deducted in the actual booking price calc** — `calculate_booking_price()` has no coupon parameter at all (dead feature, see §8). |
| `blog_posts` | Content | Generic CMS-lite; reusable as-is. |
| `images` | Real binary data | Base64 JPEGs embedded in Mongo documents — a scaling/architecture concern for a multi-tenant platform, not just a config concern. |
| `user_sessions` | Operational | Simple bearer-token sessions, 7-day expiry. |

**Does the model actually support multiple independent sellers?** Partially, and unevenly:
- **Yes** for catalog/inventory: each `Villa` has its own `owner_id` and `commission_percent`; bookings, financials, and the owner dashboard all correctly scope data to "this seller's villas only."
- **No** for money movement: there is one platform bank account and one Razorpay account for every seller combined (see §5). A real multi-seller marketplace needs per-seller settlement (Razorpay Route linked accounts or equivalent) — right now "payout" is 100% a manual, off-platform wire transfer that the admin reconciles by hand in a ledger table.
- **No** for seller self-service on the catalog side: sellers cannot create, edit, price, or photograph their own listings — only admins can (`require_admin` on all `villas` CUD endpoints). The owner dashboard is read + calendar-block only. This is closer to "admin manages inventory on behalf of consignors" than a self-serve marketplace like Etsy/Airbnb-for-hosts.

---

## 7. QUESTIONS A NEW MARKETPLACE OPERATOR MUST ANSWER

**Platform Intake** (before build)
- Operator/brand name, tagline, legal entity name → `OPERATOR_BRAND_NAME`, `OPERATOR_TAGLINE`, legal-entity fields for ToS/invoices
- Domain name → `OPERATOR_DOMAIN`, used in CORS, sitemap, OG tags, email links
- Support phone, support email, Instagram/social handles → `OPERATOR_SUPPORT_PHONE/EMAIL`, `OPERATOR_SOCIAL_LINKS`
- What is being listed (property type / service / vertical)? This governs whether the date-range calendar model even applies, or whether a unit-count model is needed instead → architecture decision, before build

**Seller Onboarding Flow Design** (before build)
- Self-serve seller signup, or admin-mediated (current: 100% admin-mediated — apply → admin reviews → admin manually creates listing → admin manually invites owner)? → decides whether the "approve listing → auto-create Villa + auto-invite owner" gap (§8) needs fixing before launch
- What KYC/legal info must a seller provide (current: none beyond name/email/phone/address/company)? Needed if real payouts (Razorpay Route) are in scope → before launch if split payments are required
- Seller agreement: e-signature flow, or admin-uploaded PDF (current)? → before launch
- Default commission rate for new sellers, and whether it's negotiable per-seller → `DEFAULT_COMMISSION_PERCENT` — before build

**Listing/Catalog rules** (before build)
- Can sellers create/edit their own listings, or admin-only (current: admin-only)? → before build, this is an architecture decision, not a flag
- Listing approval workflow: auto-publish, or admin review gate? (current: admin review gate exists for the *application*, but there's no review gate on `Villa` records themselves — any admin-created villa is instantly live) → before launch
- Minimum-stay / availability-unit model: calendar date-range (current) vs stock-count? → before build, architectural

**Commission & Payouts** (before build)
- Flat commission for all sellers, or per-seller/per-category? (current: per-villa, admin-set) → before launch
- Real split-payment settlement (Razorpay Route) vs manual bank-transfer payouts (current)? → before launch if the operator has real sellers expecting timely payout, since manual reconciliation doesn't scale past a handful of sellers
- Payout schedule/hold period (current: none — payouts are "generated" ad hoc, no schedule, no hold period enforced) → before launch
- Who bears GST/TDS/TCS compliance, and at what rate (current: 18% GST hardcoded, added to buyer's total, never itemized as seller income tax handling)? → before launch, legal/compliance decision

**Design** (can come later, but before go-live)
- Brand colors/fonts/logo → `OPERATOR_*` tokens (§4)
- Whether to keep the "editorial luxury" aesthetic or use a different design language entirely

**Payments** (before launch)
- Buyer collection: Razorpay (current) or another PSP?
- Advance/partial payment: allowed at what minimum %? (setting exists but is dead code — must be wired in or removed, before launch)
- Bank-transfer fallback details (current: hardcoded operator bank account) → `OPERATOR_BANK_DETAILS` — before launch

**Booking/Fulfilment rules** (before launch)
- Check-in/check-out times, minimum-nights default, security-deposit default and collection method (current: cash/UPI in person, not through the app) → operator settings
- Instant-book vs request-to-book (field exists on `Villa.instant_book` but confirm it's actually enforced in the booking-creation path before relying on it) → before launch

**Trust & Safety** (before launch if marketplace credibility matters)
- Reviews of listings/sellers: not built — needed before/later? → new build decision
- Dispute/refund process: not built, only marketing copy exists → new build decision, before launch if cancellations are expected
- Cancellation policy tiers: currently print-only text, not enforced — decide the real refund percentages and wire them into `cancel_booking()` → before launch

**Ads/Marketing** — no Meta/Instagram ad integration exists at all; this is a later, separate build item if in scope.

**WhatsApp** (can come later — the whole feature gracefully no-ops without it)
- Twilio WhatsApp Business number, Meta template approval (multi-day human process) → before launch if WhatsApp is a required channel, can slip to post-launch otherwise

**Content** (before/at launch)
- Blog seed content, About/Team story, Terms/Privacy/Cancellation policy pages — all currently bespoke prose, none templated

**Go-live**
- Domain DNS, hosting env vars (§5), first-admin bootstrap then **lock/remove `/make-admin` and delete `/make-owner` entirely** (§8) → before launch, security-critical
- Seed/import scripts (`import_real_villas.py`, blog importer) should not run against a new operator's DB with this operator's data — before launch

---

## 8. DON'T CARRY OVER

- **`POST /make-owner`** (`server.py`) — lets *any* authenticated user self-promote to `role="owner"` and auto-assigns up to 2 unassigned villas to themselves. Comment literally says "for testing." This is a privilege-escalation bug, not just leftover scaffolding — delete before any multi-tenant use.
- **`POST /make-admin`** — intentionally locks after the first admin exists, which is reasonable as a bootstrap mechanism, but must be confirmed disabled/removed (or gated behind an infra-level one-time setup flag) once an operator has gone live, so a second race-condition admin-claim isn't possible on a fresh but already-seeded database.
- **Duplicate `/payments/create-order`, `/payments/verify`, and duplicate `/payments/webhook` vs `/webhooks/razorpay`** — `server.py` defines these routes twice (once ~line 2888, again ~line 4338), with materially different logic (env-var keys vs DB-stored `payment_settings` keys, different HMAC/verify approaches). FastAPI resolves to the *first* registered match, so the second definitions are dead code today — but this is fragile (reordering imports/routers would silently swap which implementation runs). Needs consolidation into one implementation, not two near-duplicates.
- **Dead settings**: `PaymentSettings.min_advance_percent` and `partial_payment_enabled` are stored and editable in the admin UI but never read anywhere in booking/pricing/payment logic. Either wire them in or remove the fake control.
- **Dead feature: coupons** — fully modeled and validatable (`/coupons/validate`) but `calculate_booking_price()` has no coupon parameter, so a "valid" coupon is never actually applied to a real booking total. Frontend/backend disagreement to resolve before relying on this.
- **Broken workflow: approving a homeowner listing does nothing operationally** — `AdminListings`'s Approve button only flips `homeowner_listings.status`; it does not create a `Villa`, does not invite the owner, does not link the two records at all. Admin must separately re-key everything into the Villas form. Either automate this handoff or document it as a manual step explicitly (today it looks automated but isn't).
- **Sender-email inconsistency** — `SENDER_EMAIL` env var exists and defaults to `onboarding@resend.dev`, but several `resend.Emails.send()` calls hardcode `"Travaholic Stays <bookings@travaholicstays.com>"` or `SENDER_EMAIL` inconsistently across the ~6 email-sending call sites. Pick one source of truth.
- **Hardcoded bank account details baked into PDF/email generator code** (not a settings/env value) — beyond being brand-specific, this is operationally risky: rotating a bank account requires a code change and redeploy today.
- **Sitemap references a dead route** (`/experiences`) that doesn't exist in `App.js`'s router (the real route is `/services`) — stale copy-paste from an earlier iteration.
- **`.emergent/`, `memory/PRD.md`, `test_reports/`, `tests/__init__.py`, `backend_test.py`** — scaffolding/artifacts from the original AI-builder platform (Emergent) this app was bootstrapped on. `backend_test.py` even hardcodes a defunct `*.preview.emergentagent.com` URL. None of this belongs in a template repo.
- **`test_result.md`** — a hand/agent-maintained testing-status log specific to this build's history; not reusable.
- **`backend/scripts/real_villas_data.json`, `import_real_villas.py`** — real production villa data for this specific operator (12 listings). Must never ship as "seed data" for a new operator.
- **`backend/scripts/blog_posts_data.json`** — this operator's actual blog content, imported via a one-click admin endpoint (`/admin/seed-blog-posts`). Fine as an *optional* example-content pack, dangerous as default seed data.
- **Two near-identical `/list-villa/upload-image` and `/admin/upload-image` endpoints** — same body, same compression pipeline, differ only in auth requirement and `uploaded_by` tag. Reasonable to keep separate for audit purposes, but worth deduplicating the actual image-processing code into one shared function (right now it's copy-pasted).
- **Brand palette hand-duplicated three times** (CSS tokens, `PDF_*` constants in `server.py`, `EMAIL_*` constants in `server.py`) — not a bug, but a maintainability trap for white-labeling: a rebrand today requires synchronized edits in three unrelated places or the PDF/emails silently drift from the live site's colors.
- **Email header/footer HTML duplicated across 5 separate `generate_*_email_html()` functions** — same structural risk as above.

---

## 9. SUMMARY — Top 10 things that make white-labelling this hard

1. **No real split-payment/payout rail (Razorpay Route or equivalent) — highest-impact gap.** Every dollar collected goes to one Travaholic-owned account; "owner payout" is a spreadsheet-style ledger settled by hand outside the app. A real multi-seller marketplace at any scale beyond a handful of trusted sellers needs linked-account settlement, per-seller KYC, and automatic transfer-on-capture. **Estimate: 3–5 weeks** (Razorpay Route integration, seller KYC intake, payout scheduling, refund-from-seller-balance logic, reconciliation UI).
2. **Sellers can't self-serve their own catalog.** Only admins can create/edit/price/photograph listings; the owner dashboard is read + calendar-block only. This is a fundamentally different operating model than "sellers manage their own storefront," and going the other way (giving sellers CRUD on their own listings with appropriate guardrails/approval) is a real feature build, not a permission flip. **Estimate: 1.5–2 weeks** (seller-facing listing form + moderation queue + image upload UX for that role).
3. **Brand identity and copy are hardcoded in ~6 independent places that all need to move in lockstep**: CSS tokens, `PDF_*` constants, `EMAIL_*` constants, ~5 duplicated email header/footer blocks, PDF bank-details block (×2), and per-page SEO meta tags. There is no single "brand config" object anywhere. **Estimate: 1–1.5 weeks** to introduce one `OperatorSettings`/branding object and refactor every consumer to read from it.
4. **Cancellation/refund policy is marketing copy, not code.** The 100%/50%/0% refund tiers and extra-pax/smoking fees only exist as printed PDF text; `cancel_booking()` computes no refund and applies no fee. A new operator who actually wants their policy enforced (not just displayed) needs this built. **Estimate: 3–5 days** for a straightforward tiered-refund calculator, more if refunds must also call back to Razorpay.
5. **No reviews, no disputes, no buyer↔seller messaging** — three features the brief specifically calls out as marketplace trust infrastructure, and none exist in this codebase in any form (no model, no field, no UI). **Estimate: 2–3 weeks combined** for a minimal version of all three (reviews of listing+seller, a lightweight dispute/ticket state machine, and a basic in-app or email-relay message thread).
6. **Image storage doesn't scale multi-tenant.** Photos are base64-encoded directly into MongoDB documents with no CDN/object storage. Fine for one operator's 12 villas; will not hold up as a shared platform serving many operators' full catalogs. **Estimate: 3–5 days** to swap in S3/R2/Cloudinary with signed uploads.
7. **Seller-listing-application → live-listing pipeline is a manual dead end.** Approving a homeowner's application in the admin UI does not create a bookable `Villa` or invite the owner — an admin has to notice the approval and manually redo the data entry elsewhere. Needs an actual handoff (auto-create draft villa + trigger owner invite on approve). **Estimate: 2–3 days.**
8. **GST is hardcoded at 18% and deeply embedded** (pricing function, offer pricing function, 3 email templates) rather than being a jurisdiction/operator setting — a problem for any operator outside India's current villa-rental GST treatment, or any non-INR/non-India operator at all (currency is hardcoded to INR/₹ throughout: Razorpay `currency: "INR"`, every price format string). **Estimate: 1 week** to generalize tax and currency handling.
9. **Two live, unremoved privilege-escalation/debug endpoints** (`/make-owner`, and the bootstrap risk around `/make-admin`) — not a "nice to configure away," a security fix required before this can be multi-tenant at all. **Estimate: 1 day** to remove/gate, but must not be skipped.
10. **Two duplicate, silently-shadowed implementations of the entire payment flow** (`/payments/create-order`, `/payments/verify`, plus two differently-secured webhook handlers) sitting in the same file, where the second copy is currently unreachable dead code but reads settings differently (DB-stored keys vs env vars) than the first. This is a correctness/maintainability landmine for whoever next touches payments, and should be resolved (pick one, delete the other) before this becomes a template others build on. **Estimate: 2–3 days**, mostly for careful testing of whichever implementation is kept.

---

## 10. MODEL MECHANICS — MARKETPLACE

**Sellers/hosts — onboarding**
- Entry point: public `/list-your-villa` form → `POST /list-villa` → creates a `HomeownerListing` (pending) + a `Lead`. Fields collected: name, email, phone, Instagram (optional), villa name/location, bedrooms/bathrooms/pool, amenities, free-text description, up to 8 photos.
- **KYC/verification: none.** No PAN/GST/bank-account/ID capture, no automated or manual verification step beyond a human admin reading the application.
- Approval: admin flips `status` to `approved`/`rejected` in `AdminListings`. This does **not** create a `Villa` record or invite the owner — see §8, this is a manual dead-end today.
- Actual account creation: separately, admin uses "Add a villa owner" (`AdminOwners` → `POST /admin/invite-owner`) to create a `User(role="owner")` and send a one-time invite link (7-day expiry) the owner uses to set their own password. Admin then manually assigns villas to this owner via the villa edit form's `owner_id` field.
- Agreement: `POST /owners/{id}/agreement` just stores a `{file_url, file_name}` pointer an admin uploads on the owner's behalf — no e-signature flow, no visible upload UI was found wired to this endpoint in the admin dashboard's grepped structure (verify before relying on it).
- **Their own dashboard** (`/owner/*`, `OwnerDashboard.jsx`): Overview (villa count, bookings, revenue, earnings stats + upcoming bookings), My Villas (read-only cards — pricing, commission %, active/inactive status), Calendar (owner can **block/unblock their own dates**, cannot see or edit guest details beyond what admin exposes, cannot edit pricing), Earnings (booking history with commission deducted and net payout shown, plus a static "how earnings work" 3-step explainer). **Owners cannot create, edit, price, or delete their own listings** — every `villas` CUD endpoint is `require_admin`.

**Listings**
- Creation/editing: admin-only (`VillaForm` in `AdminDashboard.jsx`, backed by `POST/PUT /villas`).
- Approval/moderation of the *villa record itself*: none — an admin-created villa is instantly live (`is_active: true` by default). The only "approval" step in the whole system is on the separate, disconnected `HomeownerListing` application object.
- Per-seller catalogues: yes, functionally — `owner_id` scopes a villa to its seller, and `/bookings`, `/financials/owner/{id}`, `/owner/dashboard` all filter correctly by it.
- Search/filters: `GET /villas` supports location, region, min/max guests, min bedrooms, has_pool, min/max price, and check-in/check-out (which excludes villas with an overlapping `blocked_dates` range). Purely attribute filtering — **no ranking/relevance/boost logic** of any kind (no "featured seller," no popularity sort, results come back in natural Mongo order).
- Discovery ranking: none.

**Money flow**
- **Merchant of record: Travaholic (the platform), not individual sellers.** Every guest payment — whether via Razorpay Checkout or manual bank transfer — goes to Travaholic's own account.
- Buyer collection: Razorpay Checkout (order → client-side checkout.js → signature verification), or a manual bank-transfer/UPI screenshot flow, or admin-recorded cash/UPI/cheque (`mark_payment_received`).
- Commission/take-rate: percentage, set per-villa (default 30%), overridable per-booking or per-offer by an admin. No flat-fee or tiered-by-category structure exists.
- Platform fees charged to buyer vs seller: only GST (18%, charged to the buyer, added on top of subtotal) — no separate "buyer service fee" or "seller listing fee" line item exists anywhere.
- **Split settlements: not implemented** (see §5, §9 #1). Commission math (`commission_amount`, `owner_payout`) is computed and frozen into the booking/offer record at creation/payment time, purely as bookkeeping.
- Payout schedule/method: none scheduled — an admin clicks "Generate Payouts" on demand (pulls any paid/confirmed booking without an existing payout row), then separately marks each `pending` payout `paid` with a free-text payment mode (bank transfer/UPI/cash/cheque) and reference. No hold period, no automatic timing.
- Refunds/chargebacks from seller balances: not modeled at all — there's no concept of clawing back a payout if a booking is later refunded/cancelled after payout was marked paid.
- GST/TCS/TDS: only GST is handled, as a flat add-on to the buyer's total; no TCS (marketplace-specific Indian tax-collection-at-source obligation) or TDS-on-seller-payout logic exists, which a real Indian marketplace operator would likely need.

**Fulfilment**
- Not applicable in the shipping sense — "fulfilment" here means the guest's stay itself. There's no shipping/tracking/SLA model. Check-in/check-out are informational fields with hardcoded default times (2 PM/11 AM) shown across documents/emails.

**Bookings/stays specifics**
- Availability calendar: date-range based (`blocked_dates`), per villa, not unit-count.
- Pricing rules: weekday/weekend split, per-villa weekend multiplier or explicit `weekend_price`, per-date manual overrides, event-based multipliers with their own min-nights rule, long-stay discount tiers at 7/14/30 nights, plus flat cleaning fee and addon add-ons (chef, spa, transfers, etc., independently priced/managed via `AddOn`).
- Holds: **none** — a submitted online booking or manual booking does not hold/block the calendar; only an actual recorded payment (advance or full) blocks dates. This means two guests can simultaneously receive a proposal for the same dates until one of them pays.
- Instant vs request-to-book: `Villa.instant_book` field exists but its enforcement in the actual booking-creation code path was not confirmed in this read — verify before relying on it as a real gate.
- Cancellation/refund tiers: policy text only (see §3, §8, §9 #4) — not computed or enforced.
- Security deposits: fixed amount per villa (default ₹20,000), explicitly **collected outside the app** (cash/UPI to the caretaker at check-in per the PDF copy) — the platform tracks the number but never processes this payment.
- Check-in/out info: static, hardcoded times; no dynamic property-specific instructions field beyond the free-text `address`/`map_link`.
- Guest verification: none in-app (PDF just states ID is required at physical check-in).
- Calendar sync with other channels: one-way-in-both-directions-but-manually-linked Airbnb iCal (import Airbnb's blocks in, export Travaholic's blocks out) — no OTA channel-manager integration (no Booking.com, no VRBO), no two-way real-time sync (Airbnb doesn't offer that to non-channel-manager-certified partners, which the code comments explicitly acknowledge).

**Trust**
- Two-sided reviews: not built.
- Disputes: not built.
- Buyer↔seller messaging: not built — all communication is guest↔admin only (WhatsApp/email), never guest↔owner.
- Fraud/abuse controls: none beyond standard auth (bcrypt password hashing, bearer session tokens, admin-only mutation endpoints). No rate limiting, no CAPTCHA, no suspicious-booking flagging found.

*(SUBSCRIPTION section of the requested template is intentionally omitted — nothing in this codebase implements or touches recurring billing, plans, subscriber delivery, or churn/MRR metrics.)*

---

## 11. P&L AND BUSINESS PLAN

**No formal P&L, reporting dashboard beyond raw totals, or business-plan logic exists in this codebase.** What exists is transactional bookkeeping, not a business-planning tool. The actual formulas the business runs on, as implemented:

**Revenue (platform's view — `GET /financials/summary`, `/financials/villa/{id}`, `/financials/owner/{id}`)**
```
total_revenue      = Σ booking.subtotal          (over bookings where payment_status ∈ {"paid","full_received"})
total_commission   = Σ booking.commission_amount  (same filter)  ← this is the platform's actual take-home / net revenue
total_owner_payout = Σ booking.owner_payout       (same filter)  ← pass-through to sellers, not platform revenue
total_security_deposits = Σ booking.security_deposit (same filter)  ← tracked but never actually processed by the platform (collected in person)
```
Note: `booking.subtotal` is **pre-GST, pre-security-deposit** (base rental + addons + cleaning fee, after long-stay discount). GST is buyer-side tax pass-through, not platform revenue, and correctly excluded from these sums. This means "total_revenue" here is actually **GMV of the rental line item**, and the platform's true net revenue is `total_commission`, not `total_revenue` — the field naming in the API (`total_revenue`) is a little misleading for anyone building a P&L view on top of it, since it isn't the platform's revenue, it's the combined GMV owed to all sellers before the platform's cut.

**Per-booking economics (computed once, at booking/offer creation, and frozen)**
```
base_amount   = Σ per-night price across the stay (weekday/weekend/override/event-adjusted)
              − long_stay_discount_amount (if 7/14/30+ night tiers apply)
addons_total  = Σ (addon.price × quantity [× nights if is_per_day])
subtotal      = base_amount + addons_total + cleaning_fee
gst_amount    = subtotal × 18%
total_amount  = subtotal + gst_amount + security_deposit   ← what the guest actually pays
commission_amount = subtotal × villa.commission_percent    ← platform's cut (NOT computed on total_amount — GST and deposit are excluded from the commission base)
owner_payout  = subtotal − commission_amount                ← what's owed to the seller
```
This confirms: **commission is charged on the rental+addons subtotal only** — never on GST (correct, since GST isn't the platform's money) and never on the security deposit (also correct, since the deposit isn't rental revenue and is collected/returned outside the app entirely).

**Cost lines: none modeled.** There is no cost-of-goods, no payment-processing-fee line (Razorpay's own transaction fee is never subtracted anywhere), no marketing-spend tracking, no operational-cost input of any kind. "Net revenue" as commonly meant in a P&L (platform commission minus its own costs) is not computed — only gross commission is.

**Assumptions vs actuals:** everything summarized above is **actuals** — computed from real `bookings` documents with a real `payment_status`. There is no forecasting, no projection, no assumption-driven modeling (e.g., no occupancy-rate forecast, no seasonal-demand model, no CAC/LTV, no target-vs-actual tracking) anywhere in the codebase. Any P&L or business-plan view a new operator wants beyond "sum of actual past bookings, split into commission vs payout" would need to be built from scratch — this is a booking ledger, not a financial-planning tool.
