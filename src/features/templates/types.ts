export type Template = {
  id: string;
  name: string;
  description: string | null;
  content: string;
  variablesJson: string;
  isExample: boolean;
  createdAt: string;
};
