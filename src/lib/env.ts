import { z } from "zod";
const schema = z.object({
  AUTH_SECRET: z.string().min(32),
  DEFAULT_TRIAL_DAYS: z.coerce.number().default(30),
  DEFAULT_MONTHLY_DOCUMENT_LIMIT: z.coerce.number().default(100),
});
export const env = () => schema.parse(process.env);
