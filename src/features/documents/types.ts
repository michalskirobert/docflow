export type Document = {
  id: string;
  name: string;
  templateId?: string | null;
  renderedContent: string;
  renderedHeader?: string | null;
  renderedFooter?: string | null;
  pageNumbers?: boolean;
  payloadJson?: string;
  createdAt: string;
  template: { name: string } | null;
};
