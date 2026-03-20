import { NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { TaskService } from "@/lib/services/task.service";
import { LogService } from "@/lib/services/log.service";
import {
  createTaskSchema,
  taskQuerySchema,
  updateStatusSchema,
  updateFieldsSchema,
  toggleSubtaskSchema,
  managePausesSchema,
  resetStatusSchema,
} from "@/lib/dto/task.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/tasks — List tasks with filters and role-based visibility.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(taskQuerySchema, params);
    const result = await TaskService.list(query, req.user);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/tasks — Create a new task.
 */
const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const data = validateDto(createTaskSchema, body);
    const task = await TaskService.create(data, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Task",
      entityId: task.id as number,
      afterData: { title: task.title, status: task.status },
      description: `Tarefa criada: ${task.title}`,
      ipAddress: LogService.getIpAddress(req.headers),
      userAgent: LogService.getUserAgent(req.headers),
    });

    return NextResponse.json({ data: task, message: "Tarefa criada" }, { status: 201 });
  } catch (error) {
    const { error: message, status, errors } = handleApiError(error);
    return NextResponse.json({ error: message, errors }, { status });
  }
};

/**
 * PATCH /api/tasks — Update task (action-based dispatch).
 */
const updateHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { action } = body;
    let result;

    switch (action) {
      case "update_status": {
        const data = validateDto(updateStatusSchema, body);
        result = await TaskService.updateStatus(data.id, data.status, data.user_id);

        await LogService.audit({
          userId: req.user.userId,
          action: "UPDATE",
          entity: "Task",
          entityId: data.id,
          afterData: { status: data.status },
          description: `Status alterado para: ${data.status}`,
          ipAddress: LogService.getIpAddress(req.headers),
        });
        break;
      }

      case "update_fields": {
        const data = validateDto(updateFieldsSchema, body);
        const { id, action: _, user_id, ...fields } = data;
        result = await TaskService.updateFields(id, fields, user_id);

        await LogService.audit({
          userId: req.user.userId,
          action: "UPDATE",
          entity: "Task",
          entityId: id,
          afterData: fields as Record<string, unknown>,
          description: `Campos atualizados: ${Object.keys(fields).join(", ")}`,
          ipAddress: LogService.getIpAddress(req.headers),
        });
        break;
      }

      case "toggle_subtask": {
        const data = validateDto(toggleSubtaskSchema, body);
        result = await TaskService.toggleSubtask(data.id, data.subtask_id, data.done, data.user_id);
        break;
      }

      case "manage_pauses": {
        const data = validateDto(managePausesSchema, body);
        result = await TaskService.managePauses(data.id, data.pauses, data.user_id);
        break;
      }

      case "reset_status": {
        const data = validateDto(resetStatusSchema, body);
        result = await TaskService.resetStatus(data.id, data.password, data.user_id);

        await LogService.audit({
          userId: req.user.userId,
          action: "UPDATE",
          entity: "Task",
          entityId: data.id,
          description: "Tarefa resetada para A Fazer",
          ipAddress: LogService.getIpAddress(req.headers),
        });
        break;
      }

      default:
        return NextResponse.json({ error: "Acao invalida" }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/tasks?id=X — Soft delete a task.
 */
const deleteHandler: AuthenticatedHandler = async (req) => {
  try {
    const id = Number(req.nextUrl.searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "ID obrigatorio" }, { status: 400 });

    const task = await TaskService.delete(id, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "DELETE",
      entity: "Task",
      entityId: id,
      beforeData: { title: task.title, status: task.status },
      description: `Tarefa excluida: ${task.title}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Tarefa excluida" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withAuth(createHandler);
export const PATCH = withAuth(updateHandler);
export const DELETE = withAuth(deleteHandler);
