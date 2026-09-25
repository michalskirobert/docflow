import { EXAMPLE_TEMPLATES } from "./examples";

export const DEFAULT_TEMPLATE_PREFIX = "default:";

export type DefaultTemplate = {
  id: string;
  name: string;
  description: string;
  emailSubject: string | null;
  content: string;
  headerContent: null;
  footerContent: null;
  pageNumbers: false;
  variablesJson: string;
  isExample: true;
  createdAt: string;
  updatedAt: string;
};

const epoch = "2000-01-01T00:00:00.000Z";

export const DEFAULT_TEMPLATES: DefaultTemplate[] = EXAMPLE_TEMPLATES.map(
  (template, index) => ({
    id: `${DEFAULT_TEMPLATE_PREFIX}${index}`,
    name: template.name,
    description: template.description,
    emailSubject: "emailSubject" in template ? template.emailSubject : null,
    content: template.content,
    headerContent: null,
    footerContent: null,
    pageNumbers: false,
    variablesJson: JSON.stringify(template.variables),
    isExample: true,
    createdAt: epoch,
    updatedAt: epoch,
  }),
);

export const getDefaultTemplate = (id: string) =>
  DEFAULT_TEMPLATES.find((template) => template.id === id) ?? null;
export const isDefaultTemplateId = (id: string) =>
  id.startsWith(DEFAULT_TEMPLATE_PREFIX);
