const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] ?? char,
  );

type EmailTemplateInput = {
  preheader?: string;
  title: string;
  intro: string;
  actionLabel: string;
  actionUrl: string;
  footer?: string;
};

export function renderEmailTemplate(input: EmailTemplateInput) {
  const title = escapeHtml(input.title);
  const intro = escapeHtml(input.intro);
  const actionLabel = escapeHtml(input.actionLabel);
  const actionUrl = escapeHtml(input.actionUrl);
  const preheader = escapeHtml(input.preheader ?? input.title);
  const footer = escapeHtml(input.footer ?? "DocFlow · NurByte");

  return `<!doctype html><html><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#111827"><div style="display:none;max-height:0;overflow:hidden">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7fb;padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e7eaf0;border-radius:20px;overflow:hidden"><tr><td style="padding:28px 32px;background:#0b1020;color:#fff"><div style="font-size:24px;font-weight:800">DocFlow</div><div style="margin-top:4px;color:#94a3b8;font-size:12px">by NurByte</div></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${title}</h1><p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7">${intro}</p><a href="${actionUrl}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:700">${actionLabel}</a><p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.6">${actionUrl}</p></td></tr><tr><td style="padding:18px 32px;border-top:1px solid #eef2f7;color:#94a3b8;font-size:12px">${footer}</td></tr></table></td></tr></table></body></html>`;
}
