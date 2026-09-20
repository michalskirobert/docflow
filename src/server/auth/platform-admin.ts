import type { SessionUser } from "@/types/auth";
export function isPlatformAdmin(user:SessionUser){const configured=(process.env.PLATFORM_ADMIN_EMAILS??process.env.SEED_ADMIN_EMAIL??"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean);return configured.includes(user.email.toLowerCase())}
