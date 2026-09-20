import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/server/auth/require-session";
export default async function DocumentPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const doc = await prisma.document.findFirst({
    where: { id, organizationId: session.organizationId },
  });
  if (!doc) notFound();
  return (
    <main className="friendly-preview">
      <header>
        <div>
          <span>Document preview</span>
          <h1>{doc.name}</h1>
        </div>
        <a className="btn" href={`/api/documents/${doc.id}/pdf`} download>
          Download PDF
        </a>
      </header>
      <article
        className="preview-paper"
        dangerouslySetInnerHTML={{ __html: doc.renderedContent }}
      />
    </main>
  );
}
