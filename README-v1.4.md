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
