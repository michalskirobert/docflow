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
