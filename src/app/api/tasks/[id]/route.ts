import { NextRequest, NextResponse } from "next/server";
import { withAuth, type AuthenticatedHandler } from "@/lib/auth/guards";
import { TaskService } from "@/lib/services/task.service";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/tasks/[id] — Get single task with all relations.
 */
const handler: AuthenticatedHandler = async (
  req: NextRequest & { user: { userId: number; email: string; roleId: number; roleName: string; userType: string } },
  context?: Record<string, unknown>
) => {
  try {
    const params = context?.params as { id: string } | undefined;
    const id = Number(params?.id);
    if (!id) return NextResponse.json({ error: "ID invalido" }, { status: 400 });

    const task = await TaskService.getById(id);
    return NextResponse.json({ data: task });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(handler);
