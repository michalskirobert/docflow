"use client";

import DocumentGenerator from "./document-generator";

export default function DocumentEditor({ id }: { id: string }) {
  return <DocumentGenerator documentId={id} />;
}
