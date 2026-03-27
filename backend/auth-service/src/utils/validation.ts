import z from "zod";

export const registrationValidation = z.object({
  email: z.string({ error: "Email is required" }).email("Invalid email format"),

  username: z
    .string({ error: "Username is required" })
    .min(3, { error: "Username must be at least 3 characters" })
    .max(15, { error: "Username cannot exceed 15 characters" }),

  password: z
    .string({ error: "Password is required" })
    .min(8, { error: "Password must be at least 8 characters" })
    .max(16, { error: "Password cannot exceed 16 characters" }),
});

export const loginValdation = z.object({
  email: z.string({ error: "Email is required" }),
  password: z
    .string({ error: "password is required" })
    .min(2, { error: "Password must be at least 2 characters" }),
});
