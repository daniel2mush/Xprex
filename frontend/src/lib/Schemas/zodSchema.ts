import z from "zod";

export const mediaSchema = z
  .instanceof(File)
  .refine((f) => f.size <= 10 * 1024 * 1024, "Image must be less than 10MB")
  .refine(
    (f) =>
      [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/avif",
        "image/mp4",
      ].includes(f.type),
    "Invalid format — JPG, PNG, WEBP or AVIF, MP4 only",
  );



export const postSchema = z.object({
  content: z
    .string()
    .min(5, "Must be at least 5 characters")
    .max(500, "Cannot exceed 500 characters")
    .trim(),
  files: z.array(mediaSchema).max(4, "Maximum 4 images"),
});


