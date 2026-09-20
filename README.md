# DocFlow

DocFlow is a multilingual SaaS foundation by **NurByte – Robert Michalski Software Lab** for document workflows and reusable templates.

## Included

- Next.js App Router + TypeScript, React Query, Axios, React Hook Form + Zod, next-intl (PL/EN/ID)
- PostgreSQL + Prisma
- Registration with individual/business billing profile, billing address, FREE/MONTHLY/YEARLY plan selection and math CAPTCHA
- FREE plan defaults to 10 documents/month
- Business prices display net + VAT; private prices display gross (VAT included)
- Email verification tokens; console email provider for local development and optional Resend delivery
- Login blocked until email verification; remember-me session support
- Global toast feedback and reusable confirmation dialog
- PayU REST 2.1 sandbox client, OAuth client_credentials, order creation, continueUrl, notifyUrl and notification signature verification
- Payment/subscription models designed so PayU notification is the source of truth for payment completion
- Billing/payment/sales-document data models ready for an invoicing/fiscal provider

## Setup

1. Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, `CAPTCHA_SECRET`.
2. `yarn install`
3. `yarn db:generate`
4. `yarn db:push`
5. `yarn dev`

Generate secrets with `openssl rand -hex 32`.

### Email verification locally

`EMAIL_PROVIDER=console` prints the verification email/link in the Next.js terminal. For actual delivery set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, and `EMAIL_FROM`.

### Pricing

Paid plans are intentionally disabled until `MONTHLY_PRICE_NET_GROSZ` and `YEARLY_PRICE_NET_GROSZ` are configured. Amounts are integer grosz to avoid floating-point money errors. FREE is always 0 PLN / 10 documents per month.

### PayU

The integration defaults to sandbox. Configure your own PayU sandbox POS credentials in `.env`. For production, replace credentials and set `PAYU_ENV=production`. The webhook verifies `OpenPayu-Signature` using `PAYU_SECOND_KEY`; never activate a paid plan only from the browser return URL.

### Sales documents

The project stores billing profiles, payments and sales-document records, but does **not** pretend to be a Polish fiscal/accounting system. Connect your chosen invoicing/fiscal provider before production issuance of invoices/receipts and email delivery.

## Production checklist

- Use production PayU credentials and a public HTTPS `NEXT_PUBLIC_APP_URL`.
- Configure a real email provider and verified sending domain.
- Add rate limiting/Turnstile around auth endpoints.
- Connect invoicing/fiscal provider and implement jurisdiction-specific VAT rules (the current pricing helper defaults to Polish 23% VAT and is not an EU VAT engine).
- Run Prisma migrations rather than `db push` for production releases.
