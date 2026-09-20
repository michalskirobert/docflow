import { z } from "zod";
const required = (min = 1) => z.string().trim().min(min, "required");
export const accountSchema = z
  .object({
    firstName: required(2).max(60),
    lastName: required(2).max(80),
    organizationName: required(2).max(120),
    email: z.string().trim().min(1, "required").email("invalidEmail"),
    customerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    billingEmail: z.string().trim().email("invalidEmail"),
    companyName: z.string().trim().optional(),
    taxId: z.string().trim().optional(),
    vatId: z.string().trim().optional(),
    countryCode: z.string().trim().length(2, "countryCode"),
    street: required(2).max(120),
    buildingNumber: required().max(20),
    apartmentNumber: z.string().trim().max(20).optional(),
    postalCode: required(2).max(20),
    city: required(2).max(100),
  })
  .superRefine((data, ctx) => {
    if (data.customerType === "BUSINESS") {
      if (!data.companyName?.trim())
        ctx.addIssue({
          code: "custom",
          message: "required",
          path: ["companyName"],
        });
      if (!data.taxId?.trim() && !data.vatId?.trim())
        ctx.addIssue({
          code: "custom",
          message: "taxRequired",
          path: ["taxId"],
        });
    }
  });
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "required"),
    newPassword: z
      .string()
      .min(10, "passwordRequirements")
      .max(128)
      .regex(/[A-Z]/, "passwordRequirements")
      .regex(/[a-z]/, "passwordRequirements")
      .regex(/[0-9]/, "passwordRequirements"),
    confirmPassword: z.string().min(1, "required"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword)
      ctx.addIssue({
        code: "custom",
        message: "passwordMismatch",
        path: ["confirmPassword"],
      });
  });
export type AccountFormValues = z.input<typeof accountSchema>;
export type PasswordFormValues = z.input<typeof passwordSchema>;
