import { z } from "zod";

export const supportTypes = ["BUG", "FEATURE", "SUPPORT"] as const;

export const supportSchema = z.object({
  type: z.enum(supportTypes),
  message: z.string().trim().min(20, "messageTooShort").max(5000, "messageTooLong"),
  captchaToken: z.string().min(1, "captchaRequired"),
  captchaAnswer: z.string().trim().min(1, "captchaRequired"),
});

export type SupportFormValues = z.infer<typeof supportSchema>;
