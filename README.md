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

---

## Historical notes and migrations

### README-v1.3.md

# DocFlow v1.3 UX / Annual License

This iteration consolidates the agreed product direction:

- Free license: 0 PLN, 10 generated documents per month.
- Annual license: 500 PLN gross by default (`YEARLY_PRICE_GROSS_GROSZ=50000`), 100 documents per month, 365 days.
- Annual checkout supports PayU or bank transfer. Until payment is confirmed the organization remains on Free.
- PayU activates Annual from the verified webhook. Bank transfers can be approved by a platform admin at `/admin/payments`.
- Company billing data can be fetched by Polish NIP through the official Ministry of Finance VAT whitelist API. Users can always edit the returned fields.
- Template editor has paragraph/headings/subtitle/quote, px font sizes, text alignment, image modal (upload as Base64 or URL), tables, lists and variable modal. Variables can also be typed manually as `{{variable}}`.
- Generated documents can be deleted with confirmation.
- Dashboard uses license terminology, shows monthly usage/remaining limit and a payment-verification state.
- Registration has a visible route back to sign-in.

## Invoice model

Billing data and billing e-mail are already collected. Production invoicing should generate an immutable invoice snapshot after a completed payment and send the PDF to `billingEmail`. This ZIP deliberately does not fabricate a tax invoice PDF: connect the completed-payment event to the chosen invoicing/KSeF-compatible provider before production invoicing is enabled.

## Setup

Copy `.env.example` to `.env`, keep secrets out of Git, then run:

```bash
yarn install
yarn prisma generate
yarn prisma db push
yarn typecheck
yarn dev
```

The NIP lookup uses the official MF VAT whitelist search API and is subject to the Ministry's API limits.

### README-v1.4.md

# DocFlow v1.4.0

Editor/security UX update:

- translated PL/EN/ID editor UI
- link modal with http/https validation
- image modal with drag & drop, URL validation, width and placement
- local image MIME + magic-byte validation; SVG is not accepted
- server-side rich HTML sanitization blocks scriptable elements, event handlers and unsafe URL protocols
- selected-image toolbar supports resizing and inline/left-wrap/center/right-wrap placement
- mobile editor returns to a full-width editing surface instead of a scaled-down A4 sheet

Security note: client validation is UX only; template HTML is sanitized again in template POST/PUT API routes. Remote image URLs remain external resources and should be proxied/allowlisted if stricter privacy or SSRF controls are added later.

### README-v1.5.md

# DocFlow v1.5.0

Editor UX iteration:

- real A4 workspace remains A4 at every viewport size;
- mobile defaults to a fit-to-page zoom and supports 25% zoom steps;
- workspace scrolls independently instead of clipping the document;
- selected images expose a direct bottom-right drag handle as well as numeric width and placement controls;
- document history Preview opens HTML preview while PDF downloads a generated PDF;
- bank-transfer registrations receive a unique `DF-...` transfer reference, stored uniquely on `Payment` and shown in transfer instructions;
- registration errors that already have inline feedback no longer duplicate the same message in a toast.

## Upgrade

`Payment.transferReference` was added, so update the database and generated client:

```bash
yarn install
yarn prisma generate
yarn prisma db push
yarn typecheck
yarn dev
```

PDF download uses Puppeteer/Chromium. Verify your production host supports a Chromium runtime before deployment.

For bank transfer instructions set the public display-only values in `.env` (never put secrets in `NEXT_PUBLIC_*`):

```env
NEXT_PUBLIC_BANK_TRANSFER_RECIPIENT="NurByte"
NEXT_PUBLIC_BANK_TRANSFER_IBAN="..."
```

### README-v1.6.md

# DocFlow v1.6.0

UX/editor architecture iteration.

## Highlights

- Template search and improved scaled previews.
- Searchable template picker for document generation.
- Document history search + sorting.
- Standard confirmation modals for destructive actions; native browser confirm/prompt/alert removed from app code.
- Typed template variables: text (optional mask), date (format), image placeholder (width/height), select options, required flag and custom required message.
- Generated-document form recreates the variable controls.
- Friendly localized-route document preview; PDF remains a download endpoint.
- Settings expanded with license/payment overview, payment method continuation/change, transactions/invoice links and account deletion.
- Fixed Puppeteer `waitUntil` typing (`load`) and locale mutation generic ordering.
- Shared constants moved to `src/utils/constants.ts`; editor and document UI split into smaller components/helpers/services.

## Upgrade

```bash
yarn install
yarn prisma generate
yarn typecheck
yarn dev
```

No `.env`, `.next` or `node_modules` is included in the archive.

### README-v1.7.1.md

# DocFlow v1.7.1

Refactor edytora szablonów i poprawka zmiennych IMAGE.

- Zmienna IMAGE jest zapisywana jako prawdziwy element `<img>` z `data-variable-name`.
- IMAGE korzysta z tego samego zaznaczania, szerokości, resize i układu inline / left+wrap / center / right+wrap co zwykłe zdjęcie.
- Generator dokumentu podmienia `src` placeholdera i zachowuje jego `style`, więc layout ustawiony w szablonie przechodzi do dokumentu/PDF.
- Editor został rozbity na EditorToolbar, VariableShelf, ImageContextBar, DocumentOptions, ZoomBar, ImageDialog i LinkDialog.
- Wspólne funkcje obrazu, URL-i i variable HTML są w `template-editor/utils.ts`.

Po aktualizacji uruchom:

```bash
yarn install
yarn prisma generate
yarn typecheck
yarn dev
```

### README-v1.7.md

# DocFlow v1.7.0

This iteration adds reusable typed variable chips, image-variable placement, header/footer editing, optional PDF page numbering, secure image drop zones, template deletion without deleting historical generated documents, improved select option builder, mobile editor back navigation, and annual-license expiry reminders.

## Database

Run `yarn prisma migrate dev` in development or `yarn prisma migrate deploy` against a managed environment. The migration makes `Document.templateId` nullable with `ON DELETE SET NULL`, so deleting a template keeps historical documents intact.

## License reminder email

Set `CRON_SECRET` and call `POST /api/cron/license-reminders` daily with `Authorization: Bearer <CRON_SECRET>`. It emails owners whose YEARLY license expires within seven days. Configure SMTP as before.

## Notes

- Template name: max 250 chars; description: max 400 chars.
- Image variables retain width, height, fit and placement/wrapping metadata.
- Header/footer are template-level rich HTML and are snapshotted into generated documents.
- Page numbering is off by default.

### MIGRATION-v1.7.2.md

# DocFlow migration recovery (v1.7.2)

The previous archive contained only `20260920161000_template_layout`, so Prisma could not replay it in a fresh shadow DB: there was no historical migration that created `Template`/`Document` first.

For the existing Neon database, do not recreate tables. Mark the baseline as applied, then apply the layout migration if it has not already been applied:

```bash
yarn prisma migrate resolve --applied 20260920150000_baseline
yarn prisma migrate dev
```

If this is a disposable local database with no data, initialize it from the current schema first:

```bash
yarn prisma db push
yarn prisma migrate resolve --applied 20260920150000_baseline
yarn prisma migrate resolve --applied 20260920161000_template_layout
```

The long-term correct solution is to recover the original pre-v1.7 Prisma migration history from source control. A no-op baseline is intentionally used here instead of inventing CREATE TABLE statements that could conflict with the live Neon schema.

---

## v1.7.3

Editor fixes: variables can be dropped into body/header/footer at the pointer position; toolbar formatting buttons reflect the current selection state; image sizing supports width, height, or both with contain/cover/fill; generated-document image inputs can be cleared; variables can be edited from the variable shelf; image-variable placeholders use a stable transparent data image and a visible variable label; historical README and migration notes are consolidated in this file.

## v1.7.4

- Consistent pending UX for login/registration and destructive document/template actions: controls are blocked while requests are in flight and buttons show progress.
- Selected ordinary images and IMAGE-variable instances can be removed with the context X button or Backspace/Delete without deleting the variable definition.
- Variable definitions keep their insertion order; editing replaces in place. The variable shelf supports explicit drag reordering plus keyboard/mobile up/down controls.
- IMAGE-variable placeholders are normalized after editor hydration to a stable transparent editor image and exactly one visible `{{variable}}` label, preventing broken-image icons after reopening saved templates.
- Image layout metadata continues to survive generated-document replacement.

## v1.7.5

- Skeleton loading states for template, document and admin-payment lists.
- Variable shelf drag-and-drop now has explicit drop gaps, including before the first variable, plus improved left spacing.
- Selected images have an in-workspace delete control in addition to the context-bar action and Delete/Backspace.
- Mobile template create/edit keeps an explicit back action; save uses an icon and pending spinner.
- Document date variables display and accept the template-defined format instead of the browser-specific native date presentation.
- Select-variable option builder has a fixed scrollable height so the modal no longer grows for every new option.

## v1.7.6

- Native date picker restored for document generation; output still respects the variable date format.
- Added `datetime` and `time` variable types with configurable output formats.
- Required markers are rendered inline with labels and invalid generation focuses/scrolls to the first invalid field.
- Selecting the active template again deselects it and clears the generation form.
- Variable select-option builder uses a fixed scrollable height; variable modal is viewport constrained.
- Editor toolbar now reflects paragraph/heading, computed font size and line height, and supports line-height values 1–2.
- Improved selection preservation around toolbar controls.
- Removed the unconditional non-breaking-space insertion after moving images and prevent headings from wrapping around floated images.
