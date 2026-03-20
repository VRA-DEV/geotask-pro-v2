import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Titulo obrigatorio"),
  description: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  status: z.string().default("A Fazer"),
  priority: z.string().optional().nullable(),
  sector_id: z.number().int().positive().optional().nullable(),
  responsible_id: z.number().int().positive().optional().nullable(),
  contract_id: z.number().int().positive().optional().nullable(),
  city_id: z.number().int().positive().optional().nullable(),
  neighborhood_id: z.number().int().positive().optional().nullable(),
  nucleus: z.string().optional().nullable(),
  quadra: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  created_by_id: z.number().int().positive().optional(),
  team_id: z.number().int().positive().optional().nullable(),
  parent_id: z.number().int().positive().optional().nullable(),
  coworkers: z.array(z.number().int().positive()).optional(),
  subtasks: z
    .array(
      z.object({
        title: z.string().min(1),
        sector_id: z.number().int().positive().optional().nullable(),
        responsible_id: z.number().int().positive().optional().nullable(),
      })
    )
    .optional(),
});

export const updateStatusSchema = z.object({
  id: z.number().int().positive(),
  action: z.literal("update_status"),
  status: z.string(),
  user_id: z.number().int().positive(),
});

export const updateFieldsSchema = z.object({
  id: z.number().int().positive(),
  action: z.literal("update_fields"),
  user_id: z.number().int().positive(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  priority: z.string().optional().nullable(),
  type: z.string().optional().nullable(),
  sector_id: z.number().int().positive().optional().nullable(),
  responsible_id: z.number().int().positive().optional().nullable(),
  contract_id: z.number().int().positive().optional().nullable(),
  city_id: z.number().int().positive().optional().nullable(),
  neighborhood_id: z.number().int().positive().optional().nullable(),
  nucleus: z.string().optional().nullable(),
  quadra: z.string().optional().nullable(),
  lote: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  started_at: z.string().optional().nullable(),
  completed_at: z.string().optional().nullable(),
  coworkers: z.array(z.number().int().positive()).optional(),
});

export const toggleSubtaskSchema = z.object({
  id: z.number().int().positive(),
  action: z.literal("toggle_subtask"),
  subtask_id: z.number().int().positive(),
  done: z.boolean(),
  user_id: z.number().int().positive(),
});

export const managePausesSchema = z.object({
  id: z.number().int().positive(),
  action: z.literal("manage_pauses"),
  user_id: z.number().int().positive(),
  pauses: z.array(
    z.object({
      started_at: z.string(),
      ended_at: z.string().optional().nullable(),
    })
  ),
});

export const resetStatusSchema = z.object({
  id: z.number().int().positive(),
  action: z.literal("reset_status"),
  user_id: z.number().int().positive(),
  password: z.string().min(1),
});

export const taskQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
  sector_id: z.coerce.number().int().optional(),
  responsible_id: z.coerce.number().int().optional(),
  team_id: z.coerce.number().int().optional(),
  created_by_id: z.coerce.number().int().optional(),
  created_by_me: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  summary: z.enum(["true", "false"]).optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  contract_id: z.coerce.number().int().optional(),
  city_id: z.coerce.number().int().optional(),
  parent_id: z.coerce.number().int().optional(),
  show_subtasks: z.enum(["true", "false"]).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type TaskQueryInput = z.infer<typeof taskQuerySchema>;
