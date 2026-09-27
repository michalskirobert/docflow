import { z } from "zod";
import { isValidPostalCode } from "@/lib/countries";

const required = (min = 1) => z.string().trim().min(min, "required");

export const loginSchema = z.object({
  email: z.string().trim().min(1, "required").email("invalidEmail"),
  password: z.string().min(1, "required").min(8, "passwordTooShort"),
  rememberMe: z.boolean(),
});

export const registerSchema = z
  .object({
    firstName: required(2).max(60, "max60"),
    lastName: required(2).max(80, "max80"),
    organizationName: required(2).max(120, "max120"),
    email: z.string().trim().min(1, "required").email("invalidEmail"),
    password: z
      .string()
      .min(10, "passwordRequirements")
      .max(128, "max128")
      .regex(/[A-Z]/, "passwordRequirements")
      .regex(/[a-z]/, "passwordRequirements")
      .regex(/[0-9]/, "passwordRequirements"),
    confirmPassword: z.string().min(1, "required"),
    customerType: z.enum(["INDIVIDUAL", "BUSINESS"]),
    billingEmail: z.string().trim().min(1, "required").email("invalidEmail"),
    companyName: z.string().trim().max(120, "max120").optional(),
    taxId: z.string().trim().max(32, "max32").optional(),
    vatId: z.string().trim().max(32, "max32").optional(),
    countryCode: z.string().trim().length(2, "countryCode"),
    street: required(2).max(120, "max120"),
    buildingNumber: required().max(20, "max20"),
    apartmentNumber: z.string().trim().max(20, "max20").optional(),
    postalCode: required(2).max(20, "max20"),
    city: required(2).max(100, "max100"),
    plan: z.enum(["FREE", "YEARLY"]),
    paymentMethod: z.enum(["PAYU", "BANK_TRANSFER"]),
    locale: z.enum(["pl", "en", "id"]),
    captchaToken: z.string().min(1, "captchaUnavailable"),
    captchaAnswer: z
      .string()
      .trim()
      .min(1, "required")
      .regex(/^\d+$/, "captchaNumber"),
  })
  .superRefine((data, ctx) => {
    if (!isValidPostalCode(data.countryCode, data.postalCode))
      ctx.addIssue({
        code: "custom",
        message: "invalidPostalCode",
        path: ["postalCode"],
      });
    if (data.password !== data.confirmPassword)
      ctx.addIssue({
        code: "custom",
        message: "passwordMismatch",
        path: ["confirmPassword"],
      });
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

export type LoginFormValues = z.input<typeof loginSchema>;
export type RegisterFormValues = z.input<typeof registerSchema>;
