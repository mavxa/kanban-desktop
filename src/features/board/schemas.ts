import { z } from "zod";

export const createTaskFormSchema = z.object({
  columnId: z.number().int().positive("Column is required."),
  title: z.string().trim().min(1, "Title is required."),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  tags: z.string(),
});

export type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;
