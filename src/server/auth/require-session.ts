import { getSession } from "./session";
export async function requireSession() {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
