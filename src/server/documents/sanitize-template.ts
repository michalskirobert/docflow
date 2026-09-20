const SAFE_PROTOCOLS = ["http:", "https:", "mailto:"];
const SAFE_IMAGE_DATA = /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=\s]+$/i;

function safeUrl(raw: string, image = false) {
  if (image && SAFE_IMAGE_DATA.test(raw)) return raw;
  try {
    const url = new URL(raw);
    return SAFE_PROTOCOLS.includes(url.protocol) && (!image || ["http:", "https:"].includes(url.protocol)) ? raw : "";
  } catch { return ""; }
}

// Defense in depth for rich HTML. The editor also validates input client-side.
export function sanitizeTemplateHtml(input: string) {
  let html = input
    .replace(/<\s*(script|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|iframe|object|embed|svg|math|form|input|button|textarea|select|meta|link|style)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(srcdoc|formaction)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  html = html.replace(/\shref\s*=\s*(["'])(.*?)\1/gi, (_m, q, value) => {
    const safe = safeUrl(value, false); return safe ? ` href=${q}${safe}${q}` : "";
  });
  html = html.replace(/\ssrc\s*=\s*(["'])(.*?)\1/gi, (_m, q, value) => {
    const safe = safeUrl(value, true); return safe ? ` src=${q}${safe}${q}` : "";
  });
  html = html.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q, style) => {
    const clean = String(style)
      .replace(/expression\s*\([^)]*\)/gi, "")
      .replace(/url\s*\([^)]*\)/gi, "")
      .replace(/@import/gi, "")
      .replace(/javascript\s*:/gi, "");
    return `style=${q}${clean}${q}`;
  });
  return html;
}
