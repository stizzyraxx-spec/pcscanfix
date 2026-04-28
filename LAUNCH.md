# PCFixScan — Launch Checklist

The codebase now runs on **Supabase** (Auth + Postgres + Edge Functions) for the backend, with a static frontend you can host anywhere.

---

## 1. Rotate the secrets that have been pasted in chat

These exist in your project right now and have been transmitted in plaintext. Roll them when you have a minute:

- Stripe secret key — https://dashboard.stripe.com/apikeys
- Stripe webhook signing secret — https://dashboard.stripe.com/webhooks → your endpoint
- Resend API key — https://resend.com/api-keys
- Supabase secret key — https://supabase.com/dashboard/project/oojakaydnadjuaxqjgvc/settings/api

After rolling, paste the new values into `.env.local` and into Supabase's Edge Function env (step 4).

## 2. Apply the database schema

1. Open https://supabase.com/dashboard/project/oojakaydnadjuaxqjgvc/sql/new
2. Open `supabase/migrations/001_init.sql` from this repo, copy the whole file
3. Paste into the SQL editor → **Run**
4. Verify in **Database → Tables**: you should see `licenses` and `events` tables. (`auth.users` already exists.)

## 3. Configure Supabase Auth email templates

Supabase sends the verification + password-reset emails. By default they use Supabase's domain — you'll want them branded.

1. Supabase dashboard → **Authentication → Email Templates**
2. Set the redirect URLs to:
   - **Confirm signup** → `https://pcfixscan.com/verify-email`
   - **Reset password** → `https://pcfixscan.com/reset-password`
3. (Optional but recommended) **Auth → SMTP settings** → switch to Resend so emails come from `noreply@pcfixscan.com` instead of `noreply@mail.app.supabase.io`. Use your Resend SMTP credentials.

## 4. Deploy the Edge Functions

You need the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
brew install supabase/tap/supabase
supabase login                    # one-time browser auth
supabase link --project-ref oojakaydnadjuaxqjgvc

# Set function secrets
supabase secrets set \
  STRIPE_SECRET_KEY=sk_live_... \
  STRIPE_WEBHOOK_SECRET=whsec_... \
  STRIPE_PRICE_ID=price_... \
  RESEND_API_KEY=re_... \
  RESEND_FROM_EMAIL='PCFixScan <noreply@pcfixscan.com>' \
  PUBLIC_URL=https://pcfixscan.com \
  ADMIN_EMAILS=admin@pcfixscan.com

# Deploy all functions
supabase functions deploy checkout
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy license-validate --no-verify-jwt
supabase functions deploy admin-data
supabase functions deploy admin-revoke-license
supabase functions deploy support --no-verify-jwt
```

`--no-verify-jwt` is required for endpoints that are called by external services (Stripe webhook) or unauthenticated visitors (license-validate, support form).

After deploy, your endpoints live at:

- `https://oojakaydnadjuaxqjgvc.supabase.co/functions/v1/checkout`
- `https://oojakaydnadjuaxqjgvc.supabase.co/functions/v1/stripe-webhook`
- `https://oojakaydnadjuaxqjgvc.supabase.co/functions/v1/license-validate`
- etc.

## 5. Stripe — create the product and webhook

```bash
npm run stripe:setup
```

This creates the "PCFixScan License" product at $19.99 and prints a `price_…` ID. Add it to:
- Local `.env.local` as `STRIPE_PRICE_ID=price_…`
- Supabase function secrets: `supabase secrets set STRIPE_PRICE_ID=price_…`

Then in Stripe → **Developers → Webhooks → Add endpoint**:
- URL: `https://oojakaydnadjuaxqjgvc.supabase.co/functions/v1/stripe-webhook`
- Events: `checkout.session.completed`
- Copy the new signing secret → update `STRIPE_WEBHOOK_SECRET` in Supabase secrets

## 6. Host the static frontend

The `dist/` folder from `npm run build` is a plain static site. Recommended host: **Cloudflare Pages** (your DNS is already on Cloudflare).

1. Create a GitHub repo for this project, push the code
2. Cloudflare dashboard → Workers & Pages → **Create → Pages → Connect to Git**
3. Pick the repo. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output: `dist`
4. Environment variables to add:
   - `VITE_SUPABASE_URL` = `https://oojakaydnadjuaxqjgvc.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_w4RHau8YT8TWEUIRIDbeqQ_zjXrmMeU`
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_live_…`
   - `VITE_ADMIN_EMAILS` = `admin@pcfixscan.com`
5. Deploy. You'll get a `*.pages.dev` URL. Test it.
6. **Custom domain**: Cloudflare Pages → your project → **Custom domains** → add `pcfixscan.com`. Cloudflare auto-creates the DNS records since you're already in their DNS.

## 7. Create your admin user

Sign up at `pcfixscan.com/signup` using `admin@pcfixscan.com` (or whatever you put in `ADMIN_EMAILS`). Verify the email link. That account is now an admin — log into `pcfixscan.com/admin` with the same credentials.

## 8. Test the buy flow end-to-end

1. Visit `pcfixscan.com/buy`
2. Click "Buy now" → completes a real Stripe charge (use a real card; refund yourself after)
3. Verify the email arrives with a license key + "Set password" link
4. Click "Set password" → set one
5. `pcfixscan.com/login` → sign in → `/account` shows your license
6. In the desktop app: click Login → enter the license key → "Licensed — full version active" banner shows

## 9. Code-sign the desktop app (REQUIRED for distribution)

Without code-signing, macOS shows "PCFixScan can't be opened" and Windows SmartScreen blocks the installer.

### macOS — Apple Developer Program ($99/yr)
- Enroll: https://developer.apple.com/programs/enroll
- Create a "Developer ID Application" certificate
- Export as .p12, base64-encode: `base64 -i cert.p12 | pbcopy`
- App-specific password: https://appleid.apple.com → Sign-In and Security
- Add GitHub repo secrets: `MAC_CSC_LINK`, `MAC_CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
- Uncomment `notarize:` in `electron-builder.yml` and the cert lines in `.github/workflows/build.yml`

### Windows — EV code-signing cert (~$200-400/yr)
- Buy from DigiCert / Sectigo / SSL.com
- Add `WIN_CSC_LINK` (base64 .pfx) + `WIN_CSC_KEY_PASSWORD` to GitHub secrets
- Uncomment cert lines in the Windows job

## 10. Auto-update flow

Already wired up via `electron-updater` + GitHub Releases. To ship a new version:

```bash
# bump version in package.json
git tag v1.0.1 && git push origin v1.0.1
```

CI builds & publishes to GitHub Releases. Existing installs check on launch + every 6 hours and prompt to update.

---

## Architecture summary

| Layer        | What runs there                                              |
|--------------|--------------------------------------------------------------|
| **Frontend** | Cloudflare Pages — static Vite build; calls Supabase + Edge |
| **Auth**     | Supabase Auth — signup, login, email verify, password reset |
| **DB**       | Supabase Postgres — `licenses`, `events`, `auth.users`       |
| **Server**   | Supabase Edge Functions — Stripe webhook/checkout, license validate, admin endpoints, support form |
| **Email**    | Resend — license delivery, signup verify, password reset (via Supabase SMTP integration) |
| **Desktop**  | Electron app — calls `/functions/v1/license-validate` to gate features |

## File map

```
supabase/
  migrations/001_init.sql            # tables + RLS + auto-link trigger
  functions/
    _shared/                         # CORS, license key gen, admin auth helpers
    checkout/                        # POST → Stripe Checkout session URL
    stripe-webhook/                  # POST ← Stripe → generates license + emails
    license-validate/                # POST ← desktop app → { valid }
    admin-data/                      # GET ?resource=users|licenses|events|stats
    admin-revoke-license/            # POST { key, status }
    support/                         # POST contact form

src/
  lib/supabase.js                    # client singleton
  utils/auth.js                      # signup/login/forgot/reset/etc — all Supabase
  utils/license.js                   # checkout + validate + trial state
  pages/                             # Home, Buy, BuySuccess, Download, Support, Privacy, Terms,
                                     # Login (customer), Signup, Forgot, Reset, VerifyEmail, Account,
                                     # AdminLogin, AdminPanel, LicenseGate
                                     # plus desktop: Dashboard, Scanner, Results, etc.
```
