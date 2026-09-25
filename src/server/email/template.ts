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
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light;supported-color-schemes:light}body,table,td{font-family:Arial,Helvetica,sans-serif}@media only screen and (max-width:600px){.email-shell{padding:16px 10px!important}.email-card{width:100%!important}.email-pad{padding-left:22px!important;padding-right:22px!important}.email-title{font-size:23px!important}}</style></head><body bgcolor="#f5f7fb" style="margin:0;padding:0;background-color:#f5f7fb;color:#111827;-webkit-text-size-adjust:100%"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div><table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f7fb" style="width:100%;background-color:#f5f7fb"><tr><td class="email-shell" align="center" style="padding:32px 16px"><table class="email-card" role="presentation" width="560" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #e7eaf0;border-collapse:separate;border-spacing:0;border-radius:16px"><tr><td class="email-pad" bgcolor="#eef2ff" style="padding:24px 32px;background-color:#eef2ff;border-radius:16px 16px 0 0"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td valign="middle" style="padding-right:10px"><table role="presentation" width="38" height="42" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:38px;height:42px;border:2px solid #111827;border-radius:7px"><tr><td align="center" valign="top" style="padding:7px 4px 0;font-size:0"><span style="display:inline-block;width:17px;height:3px;background:#111827;border-radius:3px"></span><br><span style="display:inline-block;width:22px;height:3px;margin-top:4px;background:#111827;border-radius:3px"></span><div style="height:8px;margin:5px -6px 0;background:#fbbf24;border-radius:8px 2px 8px 2px;transform:skewY(8deg)"></div></td></tr></table></td><td valign="middle"><div style="font-size:24px;line-height:28px;font-weight:800;letter-spacing:-1px;color:#111827"><span>Doc</span><span style="color:#f59e0b">Flow</span></div><div style="margin-top:2px;font-size:11px;line-height:16px;color:#64748b">by NurByte</div></td></tr></table></td></tr><tr><td class="email-pad" bgcolor="#ffffff" style="padding:32px;background-color:#ffffff;color:#111827"><h1 class="email-title" style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:800;color:#111827">${title}</h1><p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569">${intro}</p><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td bgcolor="#4f46e5" style="border-radius:10px;background-color:#4f46e5"><a href="${actionUrl}" style="display:inline-block;padding:13px 20px;font-size:15px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none">${actionLabel}</a></td></tr></table><p style="margin:24px 0 6px;font-size:12px;line-height:1.55;color:#64748b">If the button does not work, copy this link:</p><p style="margin:0;font-size:12px;line-height:1.55;word-break:break-all"><a href="${actionUrl}" style="color:#4f46e5;text-decoration:underline">${actionUrl}</a></p></td></tr><tr><td class="email-pad" bgcolor="#ffffff" style="padding:18px 32px;border-top:1px solid #eef2f7;background-color:#ffffff;border-radius:0 0 16px 16px;font-size:12px;line-height:18px;color:#64748b">${footer}</td></tr></table></td></tr></table></body></html>`;
}
