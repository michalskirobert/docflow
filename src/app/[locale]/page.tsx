import { redirect } from "@/i18n/navigation";
import { getSession } from "@/server/auth/session";
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getSession();
  redirect({ href: session ? "/dashboard" : "/login", locale });
}
