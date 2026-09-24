export type DocumentSummary = {
  id: string;
  name: string;
  templateId?: string | null;
  createdAt: string;
  template: { name: string } | null;
};

export type Document = DocumentSummary & {
  renderedContent: string;
  renderedHeader?: string | null;
  renderedFooter?: string | null;
  pageNumbers?: boolean;
  payloadJson?: string;
};
