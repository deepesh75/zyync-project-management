# Billing & Invites — Manual Test Checklist

This document lists manual test steps and expected results for the invites and billing flows implemented in the app.

Prerequisites
- Set environment variables locally or in your staging environment:
  - `NEXTAUTH_URL` (e.g. `http://localhost:3000` or production URL)
  - `NEXTAUTH_SECRET`
  - `DATABASE_URL`
  - `STRIPE_SECRET_KEY` (test key for Stripe CLI testing)
  - `STRIPE_WEBHOOK_SECRET` (for verifying webhooks when running behind stripe CLI)
  - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (optional — if not set, invite emails will not be sent but inviteLink will be returned)

Tools
- Stripe CLI: https://stripe.com/docs/stripe-cli
  - Useful commands:
    - `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
    - `stripe trigger checkout.session.completed` (useful for simulating events)

Quick endpoints reference
- POST `/api/organizations/:id/invite` — create an invitation (admin-only)
  - body: `{ email: string, role?: 'member' | 'admin' }`
  - returns the `invitation` object and `inviteLink` (if email sending is configured you'll also receive an email)

- POST `/api/billing/create-checkout-session` — start Stripe Checkout (admin-only)
  - body: `{ orgId: string, priceId: string, successUrl?: string, cancelUrl?: string }`
  - returns `{ url, id }` for redirecting to Stripe Checkout

- POST `/api/billing/portal` — create a Stripe Billing Portal session (admin-only)
  - body: `{ orgId: string, returnUrl?: string }`
  - returns `{ url }`

- POST `/api/invitations/accept` — accept an invitation (public)
  - body: `{ token: string }` or via `GET /auth/accept-invite?token=...` depending on UI

Manual test steps

1) Test: Create invitation (admin)
- Steps:
  1. Sign in as an org admin user in the app.
  2. POST to `/api/organizations/:id/invite` with the target email. Example:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b "$(cat .next/your_session_cookie)" \
  -d '{"email":"invitee@example.com","role":"member"}' \
  http://localhost:3000/api/organizations/<ORG_ID>/invite
```

- Expected:
  - Response 201 with `invitation` object and `inviteLink`.
  - If `RESEND_API_KEY` is set, email is sent to the address with the invite link.
  - If invitee already exists and is a member, API returns 400.
  - Non-admin user receives 403.

2) Test: Accept invitation
- Steps:
  1. Copy `inviteLink` from previous response (or from email).
  2. Visit the link in a private browser or use the accept endpoint.
  3. Follow sign-up or sign-in flow to complete accepting the invite.

- Expected:
  - After accept, user is added to `OrganizationMember` with the role from the invite.
  - `invitation.acceptedAt` is set.
  - `Organization.seats` increments by one (if your implementation updates this on accept).
  - If `stripeSubscriptionId` exists for the org, the webhook or the accept flow tries to update Stripe quantity. Verify in Stripe Dashboard or via API that subscription item quantity changed accordingly.

3) Test: Prevent invite by non-admin
- Steps:
  - Sign in as a non-admin user and attempt POST to `/api/organizations/:id/invite`.
- Expected:
  - API returns 403 and no invitation created.

4) Test: Create Checkout session (admin)
- Steps:
  1. As an admin, POST `/api/billing/create-checkout-session` with `{ orgId, priceId }`.
  2. Use test `priceId` from your Stripe test products.
  3. Redirect the browser to `url` returned by the API.

- Expected:
  - Only admins can call this endpoint (403 for non-admins).
  - Stripe Checkout opens and allows creating a subscription in test mode.
  - On successful checkout, Stripe triggers `checkout.session.completed` webhook. The webhook handler should set `organization.stripeSubscriptionId` (and customer) and update price/plan fields.

5) Test: Billing portal (admin)
- Steps:
  1. As an admin, POST `/api/billing/portal` with `{ orgId }`.
  2. Redirect to returned `url`.
- Expected:
  - Only admins can call the endpoint.
  - Returned portal url opens Stripe Billing Portal. Actions performed in portal (cancel subscription, update payment method) reflect in Stripe and are captured by webhooks.

6) Test: Webhooks
- Steps:
  1. Run `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
  2. Trigger events: `stripe trigger checkout.session.completed`, `stripe trigger invoice.payment_failed`, `stripe trigger customer.subscription.updated`.

- Expected:
  - The webhook endpoint verifies the Stripe signature and updates organization rows accordingly.
  - Log and inspect `next` server logs for webhook processing results.

7) Edge cases and error flows
- Expired invite token: Ensure `invitation.expiresAt` prevents acceptance and returns a helpful error.
- Duplicate invites: Creating an invite for an email that already has a pending invite should return 400.
- Accepting an invite that is already accepted should return a suitable error or 400.
- If Stripe customer/subscription is missing, the billing endpoints should return 400 with a clear message.

Manual verification queries (Prisma/psql)
- Verify invitation created and accepted:

```sql
SELECT id, email, organization_id, accepted_at, expires_at FROM invitations WHERE email = 'invitee@example.com';
```

- Verify membership:

```sql
SELECT * FROM organization_members WHERE user_id = '<USER_ID>' AND organization_id = '<ORG_ID>';
```

- Verify organization billing fields:

```sql
SELECT id, stripe_customer_id, stripe_subscription_id, plan_id, seats FROM organizations WHERE id = '<ORG_ID>';
```

Notes / Troubleshooting
- If emails aren't being delivered, ensure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set. If unset, API still returns `inviteLink` so you can continue testing by copying the link.
- Webhook signature: When using the Stripe CLI `stripe listen`, use the `--print-secret` flag to obtain the webhook secret and set `STRIPE_WEBHOOK_SECRET` accordingly for local testing.
- For seat sync, the implementation currently attempts a best-effort update to subscription quantity. For complex subscriptions (multi-item), you may need to adjust the code to find the correct subscription item to update.

Optional: Quick curl examples

Create invite (admin):

```bash
curl -X POST -H "Content-Type: application/json" -H "Cookie: <auth_cookie>" \
  -d '{"email":"invitee@example.com","role":"member"}' \
  http://localhost:3000/api/organizations/<ORG_ID>/invite
```

Create checkout session (admin):

```bash
curl -X POST -H "Content-Type: application/json" -H "Cookie: <auth_cookie>" \
  -d '{"orgId":"<ORG_ID>","priceId":"<PRICE_ID>"}' \
  http://localhost:3000/api/billing/create-checkout-session
```

Create billing portal session (admin):

```bash
curl -X POST -H "Content-Type: application/json" -H "Cookie: <auth_cookie>" \
  -d '{"orgId":"<ORG_ID>"}' \
  http://localhost:3000/api/billing/portal
```

---

If you'd like, I can also:
- Add automated integration tests around the webhook handler using the Stripe SDK (requires test keys in CI).
- Implement the small Billing admin UI next (`src/pages/organizations/[id]/billing.tsx`).
