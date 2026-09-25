const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ] ?? char,
  );

function shell(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body bgcolor="#f5f7fb" style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="560" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:100%;max-width:560px;background:#fff;border:1px solid #e7eaf0;border-radius:16px"><tr><td bgcolor="#eef2ff" style="padding:24px 32px;border-radius:16px 16px 0 0"><table role="presentation" border="0" cellspacing="0" cellpadding="0"><tr><td valign="middle" style="padding-right:10px"><table role="presentation" width="38" height="42" border="0" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:38px;height:42px;border:2px solid #111827;border-radius:7px"><tr><td align="center" valign="top" style="padding:7px 4px 0;font-size:0"><span style="display:inline-block;width:17px;height:3px;background:#111827;border-radius:3px"></span><br><span style="display:inline-block;width:22px;height:3px;margin-top:4px;background:#111827;border-radius:3px"></span><div style="height:8px;margin:5px -6px 0;background:#fbbf24;border-radius:8px 2px 8px 2px;transform:skewY(8deg)"></div></td></tr></table></td><td valign="middle"><div style="font-size:24px;line-height:28px;font-weight:800;letter-spacing:-1px;color:#111827"><span>Doc</span><span style="color:#f59e0b">Flow</span></div><div style="margin-top:2px;font-size:11px;line-height:16px;color:#64748b">by NurByte</div></td></tr></table></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 18px;font-size:24px">${escapeHtml(title)}</h1>${body}</td></tr><tr><td style="padding:18px 32px;border-top:1px solid #eef2f7;color:#64748b;font-size:12px">DocFlow · NurByte</td></tr></table></td></tr></table></body></html>`;
}

const row = (label: string, value: string) =>
  `<tr><td style="padding:7px 12px 7px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td style="padding:7px 0;font-weight:600">${escapeHtml(value)}</td></tr>`;
const message = (value: string) =>
  `<div style="margin-top:20px;padding:16px;background:#f8fafc;border:1px solid #e7eaf0;border-radius:10px;white-space:pre-wrap;line-height:1.6">${escapeHtml(value)}</div>`;

export function renderSupportOwnerEmail(input: {
  caseNumber: string;
  type: string;
  email: string;
  name: string;
  message: string;
}) {
  return shell(
    `New support request ${input.caseNumber}`,
    `<table role="presentation" cellspacing="0" cellpadding="0">${row("Case", input.caseNumber)}${row("Type", input.type)}${row("User", input.name)}${row("Email", input.email)}</table>${message(input.message)}`,
  );
}

export function renderSupportConfirmationEmail(input: {
  caseNumber: string;
  type: string;
  message: string;
}) {
  return shell(
    `We received your request`,
    `<p style="color:#475569;line-height:1.7">Your request has been sent successfully. Keep the case number below when contacting DocFlow support.</p><table role="presentation" cellspacing="0" cellpadding="0">${row("Case", input.caseNumber)}${row("Type", input.type)}</table><p style="margin:22px 0 6px;color:#64748b">Your message:</p>${message(input.message)}`,
  );
}
