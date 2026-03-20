import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { FileService } from "@/lib/services/file.service";
import { LogService } from "@/lib/services/log.service";
import { prisma } from "@/lib/prisma";
import { handleApiError, NotFoundError } from "@/lib/errors";

/**
 * GET /api/tasks/[id]/attachments — List attachments for a task.
 */
const listHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const taskId = Number(params?.id);
    if (!taskId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const attachments = await prisma.taskAttachment.findMany({
      where: { task_id: taskId },
      include: { uploaded_by: { select: { id: true, name: true } } },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ data: attachments });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/tasks/[id]/attachments — Upload a file attachment.
 */
const uploadHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const taskId = Number(params?.id);
    if (!taskId) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) throw new NotFoundError("Tarefa", taskId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 });

    // Save file
    const result = await FileService.save(file, `tasks/${taskId}`, "all");

    // Create DB record
    const attachment = await prisma.taskAttachment.create({
      data: {
        task_id: taskId,
        filename: result.filename,
        original_name: result.originalName,
        mime_type: result.mimeType,
        size: result.size,
        url: result.url,
        uploaded_by_id: req.user.userId,
      },
      include: { uploaded_by: { select: { id: true, name: true } } },
    });

    // History + Audit
    await Promise.all([
      prisma.taskHistory.create({
        data: {
          task_id: taskId,
          user_id: req.user.userId,
          field: "anexo",
          new_value: result.originalName,
        },
      }),
      LogService.audit({
        userId: req.user.userId,
        action: "CREATE",
        entity: "TaskAttachment",
        entityId: attachment.id,
        afterData: { filename: result.originalName, taskId },
        description: `Anexo enviado: ${result.originalName}`,
        ipAddress: LogService.getIpAddress(req.headers),
      }),
    ]);

    return NextResponse.json({ data: attachment }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/tasks/[id]/attachments?attachment_id=X — Delete an attachment.
 */
const deleteHandler: AuthenticatedHandler = async (req, context) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const taskId = Number(params?.id);
    const attachmentId = Number(req.nextUrl.searchParams.get("attachment_id"));
    if (!taskId || !attachmentId) {
      return NextResponse.json({ error: "IDs obrigatorios" }, { status: 400 });
    }

    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: attachmentId },
    });
    if (!attachment || attachment.task_id !== taskId) {
      throw new NotFoundError("Anexo", attachmentId);
    }

    // Delete file from storage
    await FileService.delete(attachment.url);

    // Delete DB record
    await prisma.taskAttachment.delete({ where: { id: attachmentId } });

    // History + Audit
    await Promise.all([
      prisma.taskHistory.create({
        data: {
          task_id: taskId,
          user_id: req.user.userId,
          field: "anexo",
          old_value: attachment.original_name,
        },
      }),
      LogService.audit({
        userId: req.user.userId,
        action: "DELETE",
        entity: "TaskAttachment",
        entityId: attachmentId,
        beforeData: { filename: attachment.original_name },
        description: `Anexo removido: ${attachment.original_name}`,
        ipAddress: LogService.getIpAddress(req.headers),
      }),
    ]);

    return NextResponse.json({ message: "Anexo removido" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withAuth(uploadHandler);
export const DELETE = withAuth(deleteHandler);
