import { prisma } from "@/lib/prisma";
import { NotFoundError, AppError, ForbiddenError } from "@/lib/errors";
import type { CreateTaskInput, TaskQueryInput } from "@/lib/dto/task.dto";
import type { TokenPayload } from "@/lib/auth/jwt";
import { getTaskVisibilityMode } from "@/lib/permissions";
import { VisibilityService } from "@/lib/services/visibility.service";

// ============================================================
// INCLUDES & SELECTS
// ============================================================

const TASK_INCLUDE = {
  sector: { select: { id: true, name: true } },
  responsible: {
    select: {
      id: true,
      name: true,
      email: true,
      team_id: true,
      avatar: true,
      role: { select: { name: true } },
      sector: { select: { name: true } },
    },
  },
  created_by: { select: { id: true, name: true } },
  team: { select: { id: true, name: true } },
  task_contract: { select: { id: true, name: true } },
  city: { select: { id: true, name: true } },
  neighborhood: { select: { id: true, name: true } },
  subtasks: {
    select: {
      id: true,
      title: true,
      done: true,
      done_at: true,
      sector_id: true,
      responsible_id: true,
      responsible: { select: { id: true, name: true } },
      sector: { select: { id: true, name: true } },
    },
  },
  coworkers: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: { select: { name: true } },
          sector: { select: { name: true } },
        },
      },
    },
  },
  pauses: { select: { id: true, started_at: true, ended_at: true } },
  children: {
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      time_spent: true,
      responsible: { select: { id: true, name: true } },
    },
  },
  attachments: {
    select: {
      id: true,
      filename: true,
      original_name: true,
      mime_type: true,
      size: true,
      url: true,
      uploaded_by: { select: { id: true, name: true } },
      created_at: true,
    },
  },
  _count: { select: { subtasks: true, comments: true, children: true } },
};

const TASK_SUMMARY_SELECT = {
  id: true,
  title: true,
  status: true,
  priority: true,
  type: true,
  deadline: true,
  created_at: true,
  sector_id: true,
  responsible_id: true,
  team_id: true,
  parent_id: true,
  created_by_id: true,
  time_spent: true,
  sector: { select: { id: true, name: true } },
  responsible: { select: { id: true, name: true } },
};

// ============================================================
// HELPERS
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatTaskResponse(task: any) {
  return {
    ...task,
    deadline: task.deadline ? new Date(task.deadline).toISOString() : null,
    created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
    updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : null,
    started_at: task.started_at ? new Date(task.started_at).toISOString() : null,
    completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null,
    time: task.time_spent ? Math.round(task.time_spent / 60) : 0,
  };
}

function calculateTimeSpent(
  startedAt: Date | null,
  pauses: Array<{ started_at: Date; ended_at: Date | null }>
): number {
  if (!startedAt) return 0;
  const now = new Date();
  const totalElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  const pauseDuration = pauses.reduce((sum, p) => {
    const end = p.ended_at || now;
    return sum + Math.floor((end.getTime() - p.started_at.getTime()) / 1000);
  }, 0);
  return Math.max(0, totalElapsed - pauseDuration);
}

// ============================================================
// SERVICE
// ============================================================

export class TaskService {
  /**
   * Lists tasks with role-based visibility, filters and pagination.
   */
  static async list(query: TaskQueryInput, user: TokenPayload) {
    const { page, limit, summary } = query;
    const skip = (page - 1) * limit;
    const isSummary = summary === "true";

    // Build WHERE clause with role-based visibility (async — resolves team/sectors)
    const where = await this.buildWhereClauseAsync(query, user);

    const findOptions = { where, orderBy: [{ created_at: "desc" as const }], skip, take: limit };

    const [tasks, total] = await Promise.all([
      isSummary
        ? prisma.task.findMany({ ...findOptions, select: TASK_SUMMARY_SELECT })
        : prisma.task.findMany({ ...findOptions, include: TASK_INCLUDE }),
      prisma.task.count({ where }),
    ]);

    return {
      data: tasks.map(formatTaskResponse),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Gets a single task by ID.
   */
  static async getById(id: number) {
    const task = await prisma.task.findUnique({
      where: { id },
      include: TASK_INCLUDE,
    });
    if (!task || task.deleted_at) throw new NotFoundError("Tarefa", id);
    return formatTaskResponse(task as unknown as Record<string, unknown>);
  }

  /**
   * Creates a new task.
   */
  static async create(data: CreateTaskInput, userId: number) {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status || "A Fazer",
        priority: data.priority,
        sector_id: data.sector_id,
        responsible_id: data.responsible_id,
        contract_id: data.contract_id,
        city_id: data.city_id,
        neighborhood_id: data.neighborhood_id,
        nucleus: data.nucleus,
        quadra: data.quadra,
        lote: data.lote,
        deadline: data.deadline ? new Date(data.deadline) : null,
        link: data.link,
        created_by_id: data.created_by_id || userId,
        team_id: data.team_id,
        parent_id: data.parent_id,
      },
      include: TASK_INCLUDE,
    });

    // Create legacy subtasks
    if (data.subtasks?.length) {
      await prisma.subtask.createMany({
        data: data.subtasks.map((s) => ({
          title: s.title,
          task_id: task.id,
          sector_id: s.sector_id ?? undefined,
          responsible_id: s.responsible_id ?? undefined,
        })),
      });
    }

    // Create coworkers
    if (data.coworkers?.length) {
      await prisma.taskUser.createMany({
        data: data.coworkers.map((uid) => ({
          task_id: task.id,
          user_id: uid,
        })),
      });
    }

    // History
    await prisma.taskHistory.create({
      data: {
        task_id: task.id,
        user_id: userId,
        field: "Criacao",
        new_value: task.title,
      },
    });

    return formatTaskResponse(task as unknown as Record<string, unknown>);
  }

  /**
   * Updates task status with time tracking logic.
   */
  static async updateStatus(taskId: number, newStatus: string, userId: number) {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { pauses: true },
    });
    if (!task || task.deleted_at) throw new NotFoundError("Tarefa", taskId);

    const oldStatus = task.status;
    if (oldStatus === newStatus) return this.getById(taskId);

    const now = new Date();
    const updateData: Record<string, unknown> = { status: newStatus };

    // Time tracking logic
    if (newStatus === "Em Andamento") {
      if (!task.started_at) updateData.started_at = now;
      updateData.paused_at = null;
      // Close open pause
      const openPause = task.pauses.find((p) => !p.ended_at);
      if (openPause) {
        await prisma.taskPause.update({
          where: { id: openPause.id },
          data: { ended_at: now },
        });
      }
    } else if (newStatus === "Pausado") {
      updateData.paused_at = now;
      // Accumulate time before pause
      if (task.started_at && oldStatus === "Em Andamento") {
        const elapsed = Math.floor((now.getTime() - task.started_at.getTime()) / 1000);
        const pauseTime = task.pauses
          .filter((p) => p.ended_at)
          .reduce((sum, p) => {
            return sum + Math.floor((p.ended_at!.getTime() - p.started_at.getTime()) / 1000);
          }, 0);
        updateData.time_spent = Math.max(0, elapsed - pauseTime);
      }
      // Create new pause
      await prisma.taskPause.create({
        data: { task_id: taskId, started_at: now },
      });
    } else if (newStatus === "Concluido") {
      updateData.completed_at = now;
      // Calculate final time
      if (task.started_at) {
        const allPauses = await prisma.taskPause.findMany({
          where: { task_id: taskId },
        });
        // Close any open pause
        const openPause = allPauses.find((p) => !p.ended_at);
        if (openPause) {
          await prisma.taskPause.update({
            where: { id: openPause.id },
            data: { ended_at: now },
          });
          openPause.ended_at = now;
        }
        const elapsed = Math.floor((now.getTime() - task.started_at.getTime()) / 1000);
        const pauseTime = allPauses.reduce((sum, p) => {
          const end = p.ended_at || now;
          return sum + Math.floor((end.getTime() - p.started_at.getTime()) / 1000);
        }, 0);
        updateData.time_spent = Math.max(0, elapsed - pauseTime);
      }
    } else if (newStatus === "A Fazer") {
      // Going back to "A Fazer" from another status
      updateData.paused_at = null;
    }

    await prisma.task.update({ where: { id: taskId }, data: updateData });

    // History
    await prisma.taskHistory.create({
      data: {
        task_id: taskId,
        user_id: userId,
        field: "Status",
        old_value: oldStatus,
        new_value: newStatus,
      },
    });

    return this.getById(taskId);
  }

  /**
   * Updates task fields.
   */
  static async updateFields(
    taskId: number,
    fields: Record<string, unknown>,
    userId: number
  ) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.deleted_at) throw new NotFoundError("Tarefa", taskId);

    const FIELD_MAP: Record<string, { dbField: string; label: string }> = {
      title: { dbField: "title", label: "Titulo" },
      description: { dbField: "description", label: "Descricao" },
      priority: { dbField: "priority", label: "Prioridade" },
      type: { dbField: "type", label: "Tipo" },
      nucleus: { dbField: "nucleus", label: "Nucleo" },
      quadra: { dbField: "quadra", label: "Quadra" },
      lote: { dbField: "lote", label: "Lote" },
      link: { dbField: "link", label: "Link" },
    };

    const updateData: Record<string, unknown> = {};
    const historyEntries: Array<{ field: string; old_value: string | null; new_value: string | null }> = [];

    // Simple string fields
    for (const [key, mapping] of Object.entries(FIELD_MAP)) {
      if (fields[key] !== undefined) {
        const oldVal = String(task[key as keyof typeof task] ?? "");
        const newVal = String(fields[key] ?? "");
        if (oldVal !== newVal) {
          updateData[mapping.dbField] = fields[key];
          historyEntries.push({
            field: mapping.label,
            old_value: oldVal || null,
            new_value: newVal || null,
          });
        }
      }
    }

    // Relation fields (IDs)
    const ID_FIELDS: Record<string, string> = {
      sector_id: "Setor",
      responsible_id: "Responsavel",
      contract_id: "Contrato",
      city_id: "Cidade",
      neighborhood_id: "Bairro",
    };

    for (const [key, label] of Object.entries(ID_FIELDS)) {
      if (fields[key] !== undefined) {
        const oldVal = task[key as keyof typeof task];
        const newVal = fields[key];
        if (oldVal !== newVal) {
          updateData[key] = newVal;
          historyEntries.push({
            field: label,
            old_value: oldVal ? String(oldVal) : null,
            new_value: newVal ? String(newVal) : null,
          });
        }
      }
    }

    // Deadline
    if (fields.deadline !== undefined) {
      const newDeadline = fields.deadline ? new Date(fields.deadline as string) : null;
      updateData.deadline = newDeadline;
      historyEntries.push({
        field: "Prazo",
        old_value: task.deadline?.toISOString() || null,
        new_value: newDeadline?.toISOString() || null,
      });
    }

    // Retroactive dates
    if (fields.started_at !== undefined) {
      updateData.started_at = fields.started_at ? new Date(fields.started_at as string) : null;
    }
    if (fields.completed_at !== undefined) {
      updateData.completed_at = fields.completed_at ? new Date(fields.completed_at as string) : null;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.task.update({ where: { id: taskId }, data: updateData });
    }

    // Coworkers sync
    if (fields.coworkers !== undefined) {
      const coworkerIds = fields.coworkers as number[];
      await prisma.taskUser.deleteMany({ where: { task_id: taskId } });
      if (coworkerIds.length > 0) {
        await prisma.taskUser.createMany({
          data: coworkerIds.map((uid) => ({ task_id: taskId, user_id: uid })),
        });
      }
    }

    // History entries
    if (historyEntries.length > 0) {
      await prisma.taskHistory.createMany({
        data: historyEntries.map((h) => ({
          task_id: taskId,
          user_id: userId,
          ...h,
        })),
      });
    }

    return this.getById(taskId);
  }

  /**
   * Toggles a legacy subtask done/undone.
   */
  static async toggleSubtask(taskId: number, subtaskId: number, done: boolean, userId: number) {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    });
    if (!subtask || subtask.task_id !== taskId) {
      throw new NotFoundError("Subtarefa", subtaskId);
    }

    await prisma.subtask.update({
      where: { id: subtaskId },
      data: { done, done_at: done ? new Date() : null },
    });

    // Check if all subtasks done → auto-complete parent
    const allSubtasks = await prisma.subtask.findMany({
      where: { task_id: taskId },
    });
    const allDone = allSubtasks.every((s) => (s.id === subtaskId ? done : s.done));

    if (allDone && allSubtasks.length > 0) {
      // Also check children tasks
      const childTasks = await prisma.task.findMany({
        where: { parent_id: taskId, deleted_at: null },
      });
      const allChildrenDone = childTasks.every((c) => c.status === "Concluido");

      if (allChildrenDone) {
        await this.updateStatus(taskId, "Concluido", userId);
      }
    }

    return this.getById(taskId);
  }

  /**
   * Manages pauses retroactively.
   */
  static async managePauses(
    taskId: number,
    pauses: Array<{ started_at: string; ended_at?: string | null }>,
    userId: number
  ) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Tarefa", taskId);

    // Delete existing pauses and recreate
    await prisma.taskPause.deleteMany({ where: { task_id: taskId } });

    if (pauses.length > 0) {
      await prisma.taskPause.createMany({
        data: pauses.map((p) => ({
          task_id: taskId,
          started_at: new Date(p.started_at),
          ended_at: p.ended_at ? new Date(p.ended_at) : null,
        })),
      });
    }

    // Recalculate time_spent
    if (task.started_at) {
      const now = task.completed_at || new Date();
      const totalElapsed = Math.floor((now.getTime() - task.started_at.getTime()) / 1000);
      const pauseDuration = pauses.reduce((sum, p) => {
        const start = new Date(p.started_at);
        const end = p.ended_at ? new Date(p.ended_at) : now;
        return sum + Math.floor((end.getTime() - start.getTime()) / 1000);
      }, 0);
      await prisma.task.update({
        where: { id: taskId },
        data: { time_spent: Math.max(0, totalElapsed - pauseDuration) },
      });
    }

    // History
    await prisma.taskHistory.create({
      data: {
        task_id: taskId,
        user_id: userId,
        field: "Pausas",
        new_value: `${pauses.length} pausas definidas`,
      },
    });

    return this.getById(taskId);
  }

  /**
   * Resets task to "A Fazer" state (Admin only).
   */
  static async resetStatus(taskId: number, password: string, userId: number) {
    if (password !== process.env.ADMIN_DEV_PASSWORD) {
      throw new ForbiddenError("Senha incorreta");
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Tarefa", taskId);

    await prisma.$transaction([
      prisma.task.update({
        where: { id: taskId },
        data: {
          status: "A Fazer",
          started_at: null,
          completed_at: null,
          paused_at: null,
          time_spent: 0,
        },
      }),
      prisma.taskPause.deleteMany({ where: { task_id: taskId } }),
      prisma.taskHistory.create({
        data: {
          task_id: taskId,
          user_id: userId,
          field: "Reset",
          old_value: task.status,
          new_value: "A Fazer",
        },
      }),
    ]);

    return this.getById(taskId);
  }

  /**
   * Soft deletes a task.
   */
  static async delete(taskId: number, userId: number) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Tarefa", taskId);

    await prisma.task.update({
      where: { id: taskId },
      data: { deleted_at: new Date() },
    });

    await prisma.taskHistory.create({
      data: {
        task_id: taskId,
        user_id: userId,
        field: "Exclusao",
        old_value: task.title,
      },
    });

    return task;
  }

  /**
   * Gets task history.
   */
  static async getHistory(taskId: number) {
    return prisma.taskHistory.findMany({
      where: { task_id: taskId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { created_at: "desc" },
    });
  }

  // ============================================================
  // PRIVATE: Build WHERE with role-based visibility
  // ============================================================

  /**
   * Build WHERE clause with role-based visibility + filters.
   * Now uses VisibilityService for server-side resolved team/sector IDs.
   */
  private static async buildWhereClauseAsync(query: TaskQueryInput, user: TokenPayload) {
    const where: Record<string, unknown> = { deleted_at: null };

    // Get visibility filter resolved with actual user data
    const visibilityFilter = await VisibilityService.getTaskFilter(user);
    if (visibilityFilter.OR) {
      where.OR = visibilityFilter.OR;
    }

    // Apply filters
    if (query.status) where.status = query.status;
    if (query.sector_id) where.sector_id = query.sector_id;
    if (query.responsible_id) where.responsible_id = query.responsible_id;
    if (query.team_id) {
      const teamFilter = [
        { team_id: query.team_id },
        { responsible: { team_id: query.team_id } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: teamFilter }];
        delete where.OR;
      } else {
        where.OR = teamFilter;
      }
    }
    if (query.created_by_me === "true" && query.created_by_id) {
      where.created_by_id = query.created_by_id;
    }
    if (query.priority) where.priority = query.priority;
    if (query.type) where.type = query.type;
    if (query.contract_id) where.contract_id = query.contract_id;
    if (query.city_id) where.city_id = query.city_id;
    if (query.parent_id) where.parent_id = query.parent_id;

    // Hide subtasks by default (show only root tasks)
    if (query.show_subtasks !== "true") {
      where.parent_id = query.parent_id ?? null;
    }

    // Search
    if (query.search) {
      const searchFilter = {
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { parent: { title: { contains: query.search, mode: "insensitive" } } },
        ],
      };
      if (where.OR) {
        if (!where.AND) where.AND = [];
        (where.AND as unknown[]).push({ OR: where.OR });
        (where.AND as unknown[]).push(searchFilter);
        delete where.OR;
      } else {
        Object.assign(where, searchFilter);
      }
    }

    return where;
  }
}
