export function extractVariables(content: string) {
  return [...content.matchAll(/{{\s*([\w.]+)\s*}}/g)]
    .map((m) => m[1])
    .filter((v, i, a) => a.indexOf(v) === i);
}
export function renderTemplate(
  content: string,
  data: Record<string, string | number>,
) {
  return content.replace(/{{\s*([\w.]+)\s*}}/g, (_, key) =>
    String(data[key] ?? `{{${key}}}`),
  );
}
