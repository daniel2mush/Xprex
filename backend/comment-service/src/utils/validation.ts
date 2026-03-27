import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(500).trim(),
  parentId: z.cuid().optional(), // for replies
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const validateComment = (body: unknown) => {
  const result = createCommentSchema.safeParse(body);
  if (result.success) return { data: result.data, error: null };
  return { data: null, error: result.error };
};
