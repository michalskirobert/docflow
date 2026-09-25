import { z } from "zod";
import { isValidPostalCode } from "@/lib/countries";
const required = (min = 1) => z.string().trim().min(min, "required");
export const accountSchema = z
  .object({
    firstName: required(2).max(60),
    lastName: required(2).max(80),
    organizationName: required(2).max(120),
    customerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    email: z.string().trim().min(1, "required").email("invalidEmail"),
    billingEmail: z.string().trim().min(1, "required").email("invalidEmail"),
    companyName: z.string().trim().max(120),
    taxId: z.string().trim().max(32),
    vatId: z.string().trim().max(32),
    countryCode: required(2).max(3),
    street: required(2).max(120),
    buildingNumber: required(1).max(20),
    apartmentNumber: z.string().trim().max(20),
    postalCode: required(2).max(20),
    city: required(2).max(100),
  })
  .superRefine((data, ctx) => {
    if (!isValidPostalCode(data.countryCode, data.postalCode))
      ctx.addIssue({
        code: "custom",
        message: "invalidPostalCode",
        path: ["postalCode"],
      });
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
