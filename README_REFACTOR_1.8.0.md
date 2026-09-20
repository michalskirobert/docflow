# DocFlow 1.8.0 refactor notes

- Variable shelf reorder uses Pointer Events and displays a floating drag preview plus an expanded target slot.
- Settings now include editable registration/account data and password change.
- Account email changes are checked for uniqueness; changed emails are marked unverified and receive a new verification message.
- Shared form controls live in `src/components/shared/form` and shared buttons in `src/components/shared/button`.
- Global styling moved from `src/app/globals.css` to Sass under `src/styles`, with base, component, layout and feature partials.
- `sass` was added to dependencies. Run `yarn install` after unpacking so Yarn can update the lockfile for the new direct dependency.
