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

export const updateProfileValidation = z
  .object({
    username: z
      .string()
      .min(3, { error: "Username must be at least 3 characters" })
      .max(15, { error: "Username cannot exceed 15 characters" })
      .optional(),
    bio: z
      .string()
      .max(160, { error: "Bio cannot exceed 160 characters" })
      .optional(),
    avatar: z.string().url({ error: "Avatar must be a valid URL" }).optional(),
    headerPhoto: z
      .string()
      .url({ error: "Header photo must be a valid URL" })
      .optional(),
    location: z
      .string()
      .max(120, { error: "Location cannot exceed 120 characters" })
      .optional(),
  })
  .refine(
    (data) =>
      data.username !== undefined ||
      data.bio !== undefined ||
      data.avatar !== undefined ||
      data.headerPhoto !== undefined ||
      data.location !== undefined,
    {
      error: "At least one profile field is required",
    },
  );
