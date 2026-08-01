# WhatsApp Message Templates (Twilio / Meta submission)

Twilio's WhatsApp Business sends fall into two buckets:

- **Session messages** — free-form text, only allowed within 24 hours of the
  guest last messaging you. Nothing here qualifies, since every send below is
  business-initiated (guest hasn't necessarily messaged first).
- **Template messages** — pre-approved by Meta, required for every
  business-initiated send outside that 24-hour window. These are what need
  to be submitted.

All four templates below are **UTILITY** category (transactional — booking
and payment confirmations), not MARKETING. Utility templates have a
lighter-touch Meta review and don't require the recipient to have
opted in to marketing.

## How to submit these

1. Twilio Console → Messaging → Content Editor → Create new → **WhatsApp**.
2. Paste the body text, add the variables as `{{1}}`, `{{2}}`, etc.
   (Twilio auto-detects them from the body).
3. Fill in the sample values for each variable (required for Meta review).
4. Submit for WhatsApp approval. Utility templates are typically approved
   within a few hours to a day.
5. Once approved, copy the template's **Content SID** (starts with `HX...`)
   from the Content Editor and set it as the matching env var in Render
   (see `backend/server.py` — each function below reads its SID from an
   env var and only sends via the template once that var is set; until
   then it falls back to today's free-text send, so nothing breaks while
   waiting on approval).

---

## 1. Booking Proposal (booking just created, pending payment)

**Template name:** `travaholic_booking_proposal`
**Category:** Utility · **Language:** English

```
Thank you for your booking request at {{1}}, Travaholic Stays!

This is subject to receipt of payment.

Check-in: {{2}}
Check-out: {{3}}
Guests: {{4}}
Total: Rs. {{5}}
Security Deposit: Rs. {{6}} (refundable, payable separately)
Booking ID: {{7}}

Your full proposal - tariff breakdown, payment details, amenities and
house rules - has been emailed to you.
```

| Var | Meaning | Sample value |
|-----|---------|---------------|
| {{1}} | Villa name | La Sierra 12 |
| {{2}} | Check-in date | 12 Aug 2026 |
| {{3}} | Check-out date | 15 Aug 2026 |
| {{4}} | Guest count | 8 |
| {{5}} | Total amount (no commas needed, Meta strips them) | 135000 |
| {{6}} | Security deposit | 20000 |
| {{7}} | Booking ID | booking_a1b2c3d4e5f6 |

**Env var:** `TWILIO_TEMPLATE_BOOKING_PROPOSAL`
**Code:** `send_whatsapp_booking_confirmation()` in `server.py`

---

## 2. Advance Payment Received

**Template name:** `travaholic_advance_payment_received`
**Category:** Utility · **Language:** English

```
Hi {{1}}, we've received your advance payment of Rs. {{2}} for {{3}}.

Balance due: Rs. {{4}}
Check-in: {{5}}
Check-out: {{6}}

Thank you for choosing Travaholic Stays!
```

| Var | Meaning | Sample value |
|-----|---------|---------------|
| {{1}} | Guest first name | Rohan |
| {{2}} | Advance amount received | 50000 |
| {{3}} | Villa name | La Sierra 12 |
| {{4}} | Balance due | 85000 |
| {{5}} | Check-in date | 12 Aug 2026 |
| {{6}} | Check-out date | 15 Aug 2026 |

**Env var:** `TWILIO_TEMPLATE_ADVANCE_PAYMENT`
**Code:** `send_whatsapp_payment_update()` in `server.py`, called from
`POST /admin/bookings/{id}/mark-payment` when `payment_type == "advance"`.

---

## 3. Booking Confirmed (full payment received)

**Template name:** `travaholic_booking_confirmed`
**Category:** Utility · **Language:** English

```
Hi {{1}}, your booking at {{2}} is now confirmed!

Full payment of Rs. {{3}} received.
Check-in: {{4}}
Check-out: {{5}}
Booking ID: {{6}}

We can't wait to host you. Full details have been emailed to you.
```

| Var | Meaning | Sample value |
|-----|---------|---------------|
| {{1}} | Guest first name | Rohan |
| {{2}} | Villa name | La Sierra 12 |
| {{3}} | Amount received | 135000 |
| {{4}} | Check-in date | 12 Aug 2026 |
| {{5}} | Check-out date | 15 Aug 2026 |
| {{6}} | Booking ID | booking_a1b2c3d4e5f6 |

**Env var:** `TWILIO_TEMPLATE_BOOKING_CONFIRMED`
**Code:** `send_whatsapp_payment_update()` in `server.py`, called from
the same endpoint when `payment_type == "full"`.

---

## 4. Private Offer Sent

**Template name:** `travaholic_private_offer`
**Category:** Utility · **Language:** English

```
Hi {{1}}, we've put together a private offer for {{2}}.

Check-in: {{3}}
Check-out: {{4}}
Total: Rs. {{5}}

View and confirm your offer: {{6}}
This offer expires on {{7}}.
```

| Var | Meaning | Sample value |
|-----|---------|---------------|
| {{1}} | Guest first name | Priya |
| {{2}} | Villa name | La Selva 6 |
| {{3}} | Check-in date | 20 Sep 2026 |
| {{4}} | Check-out date | 24 Sep 2026 |
| {{5}} | Total amount | 98000 |
| {{6}} | Offer link (payment_link) | https://travaholicstays.com/offer/offer_abc123 |
| {{7}} | Expiry date/time | 05 Sep 2026, 06:00 PM |

**Env var:** `TWILIO_TEMPLATE_PRIVATE_OFFER`
**Code:** `send_whatsapp_private_offer()` in `server.py`, called from
`POST /admin/private-offers/{id}/send-email`.

**Note on the link ({{6}}):** Twilio also supports a dedicated
"Website URL" button component instead of a plain-text link in the body,
which renders as a tappable button and is generally better UX. If you'd
rather use that, register {{6}} as the button's dynamic URL suffix (just
`offer/{offer_id}`) instead of a body variable — either form works with
the code as written, since it just fills `content_variables` by number.

---

## What's still free-text (no template needed)

The "New Lead" notification email/WhatsApp-equivalent is sent to **you**
(the admin), not a guest, so it isn't subject to the 24-hour/template rule
the same way — Meta's restriction is specifically about messaging
consumers. Nothing to change there.
