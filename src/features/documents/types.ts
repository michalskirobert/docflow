export type Document = {
  id: string;
  name: string;
  renderedContent: string;
  createdAt: string;
  template: { name: string } | null;
};
