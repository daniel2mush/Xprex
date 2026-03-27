import { z } from "zod";

export const createPostSchema = z.object({
  content: z
    .string()
    .min(1, "Content cannot be empty")
    .max(500, "Content cannot exceed 500 characters")
    .trim(),
  mediaUrls: z
    .array(z.string().url("Invalid media URL"))
    .max(4, "Maximum 4 media items allowed")
    .optional()
    .default([]),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

export const validatePost = (body: unknown) => {
  const result = createPostSchema.safeParse(body);
  if (result.success) {
    return { data: result.data, error: null };
  }
  return { data: null, error: result.error };
};
