import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";

export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const t = await getTranslations("documents");
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!doc) notFound();

  return (
    <main className="friendly-preview pdf-preview-page">
      <header>
        <div>
          <span>{t("preview")}</span>
          <h1>{doc.name}</h1>
        </div>
        <a className="btn" href={`/api/documents/${doc.id}/pdf`} download>
          {t("downloadPdf")}
        </a>
      </header>
      <iframe
        className="pdf-preview-frame"
        src={`/api/documents/${doc.id}/pdf?inline=1#view=FitH`}
        title={`${t("preview")}: ${doc.name}`}
      />
    </main>
  );
}
