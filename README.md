# Bookr — Booking Platform

Commission-based booking platform. Businesses get free websites, you earn 8% on every booking via Stripe Connect.

## Stack
- **Next.js 14** (App Router, TypeScript)
- **Supabase** (Postgres, Auth, RLS)
- **Stripe Connect** (Express accounts, automatic commission split)
- **Vercel** (hosting)

## Setup

### 1. Supabase
```bash
npx supabase init
npx supabase start          # local dev
npx supabase db push        # push migrations
```

### 2. Stripe
1. Create Stripe platform account
2. Enable Connect in dashboard → Settings → Connect
3. Set redirect URI: `https://yourdomain.com/api/stripe/connect/callback`
4. Create webhook endpoint pointing to `/api/stripe/webhook`
5. Add events:
   - `checkout.session.completed`
   - `charge.refunded`
   - `payment_intent.payment_failed`
   - `account.updated`

### 3. Environment variables
```bash
cp .env.example .env.local
# Fill in all values
```

### 4. Run
```bash
npm install
npm run dev
```

## Commission flow

```
Customer pays £100
  → Stripe charges £100
  → £8 (8%) goes to YOUR platform account (application_fee_amount)
  → £92 goes to business's Stripe Express account
  → No manual invoicing needed
```

**Square Terminal** (in-person): Square charges ~1.75% per transaction.
Net commission on Square bookings ≈ **6.25%** unless you gross up to 8.69%.

## Key files

| File | Purpose |
|---|---|
| `supabase/migrations/001_initial_schema.sql` | Full DB schema |
| `src/types/index.ts` | All TypeScript types |
| `src/lib/supabase.ts` | Browser + server + admin clients |
| `src/lib/stripe.ts` | Checkout, Connect OAuth, webhooks |
| `src/lib/availability.ts` | Slot generation + conflict detection |
| `src/middleware.ts` | Auth guard for /platform/* routes |
| `src/app/api/bookings/route.ts` | Create booking + Stripe Checkout |
| `src/app/api/stripe/webhook/route.ts` | Stripe event handler |
| `src/app/api/stripe/connect/callback/route.ts` | Connect OAuth callback |

## Route structure

```
/                              → Marketing / sign up
/login                         → Business login
/platform/dashboard            → Business dashboard (auth gated)
/platform/onboarding           → New business setup wizard
/platform/connect-stripe       → Stripe Connect flow
/b/[slug]                      → Public booking page
/b/[slug]/book                 → Booking flow (guest or logged in)
/b/[slug]/confirm              → Post-payment confirmation
```

## Next steps (not yet built)

- [ ] Onboarding wizard UI (`/platform/onboarding`)
- [ ] Dashboard UI (bookings list, earnings, service editor)
- [ ] Public booking page (`/b/[slug]`)
- [ ] Email confirmations (Resend)
- [ ] Cancellation / refund flow
- [ ] Square Terminal webhook integration
- [ ] Admin dashboard (your view of all businesses + commission earnings)
