import { NextResponse } from "next/server";
import { withAuth, withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { UserService } from "@/lib/services/user.service";
import { LogService } from "@/lib/services/log.service";
import { handleApiError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { validateDto } from "@/lib/dto/common.dto";

const createTeamSchema = z.object({
  name: z.string().min(2, "Nome deve ter no minimo 2 caracteres"),
});

const listHandler: AuthenticatedHandler = async () => {
  try {
    const teams = await UserService.listTeams();
    return NextResponse.json({ data: teams });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

const createHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { name } = validateDto(createTeamSchema, body);

    const team = await prisma.team.create({ data: { name } });

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Team",
      entityId: team.id,
      afterData: { name: team.name },
      description: `Time criado: ${team.name}`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: team, message: "Time criado" }, { status: 201 });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withAuth(listHandler);
export const POST = withRoles(["Admin"])(createHandler);
