import { z } from "zod";

/**
 * Reusable pagination query schema.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

/**
 * Reusable date range filter.
 */
export const dateRangeSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

/**
 * Password confirmation for destructive operations.
 */
export const confirmDeleteSchema = z.object({
  confirm_password: z.string().min(1, "Senha de confirmacao necessaria"),
});

/**
 * Reusable sort schema.
 */
export const sortSchema = z.object({
  sort_by: z.string().optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});

/**
 * Validates a Zod schema against input data.
 * Returns parsed data or throws with formatted errors.
 */
export function validateDto<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string[]> = {};
    result.error.issues.forEach((issue) => {
      const path = issue.path.join(".");
      if (!errors[path]) errors[path] = [];
      errors[path].push(issue.message);
    });

    const error = new Error("Dados invalidos");
    (error as Error & { statusCode: number; errors: Record<string, string[]> }).statusCode = 422;
    (error as Error & { errors: Record<string, string[]> }).errors = errors;
    throw error;
  }

  return result.data;
}

export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;
