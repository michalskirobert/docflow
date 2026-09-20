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
