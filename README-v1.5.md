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
