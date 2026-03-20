import { NextResponse } from "next/server";
import { withRoles, type AuthenticatedHandler } from "@/lib/auth/guards";
import { ImportService } from "@/lib/services/import.service";
import { LogService } from "@/lib/services/log.service";
import { importConfirmSchema, importQuerySchema } from "@/lib/dto/lot.dto";
import { validateDto } from "@/lib/dto/common.dto";
import { handleApiError } from "@/lib/errors";

/**
 * GET /api/lots/import — List import history.
 */
const listHandler: AuthenticatedHandler = async (req) => {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());
    const query = validateDto(importQuerySchema, params);
    const result = await ImportService.list(query);
    return NextResponse.json(result);
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * POST /api/lots/import — Upload and analyze shapefile ZIP.
 * Expects multipart/form-data with file + contract_id + optional neighborhood.
 */
const analyzeHandler: AuthenticatedHandler = async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const contractId = Number(formData.get("contract_id"));
    const neighborhood = formData.get("neighborhood") as string | null;

    if (!file) return NextResponse.json({ error: "Arquivo obrigatorio" }, { status: 400 });
    if (!contractId) return NextResponse.json({ error: "contract_id obrigatorio" }, { status: 400 });

    // Validate file
    if (!file.name.toLowerCase().endsWith(".zip")) {
      return NextResponse.json({ error: "Arquivo deve ser ZIP contendo .shp e .dbf" }, { status: 400 });
    }
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo excede limite de 50MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ImportService.analyzeShapefile(
      buffer,
      contractId,
      neighborhood || undefined,
      req.user.userId,
    );

    await LogService.audit({
      userId: req.user.userId,
      action: "CREATE",
      entity: "Import",
      entityId: result.import_id,
      afterData: result.preview.summary,
      description: `Shapefile analisado: ${result.preview.summary.total_in_file} registros`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({
      data: result,
      message: `Analise concluida: ${result.preview.summary.to_create} novos, ${result.preview.summary.to_update} atualizacoes, ${result.preview.summary.to_delete} remocoes`,
    });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * PUT /api/lots/import — Confirm a pending import.
 */
const confirmHandler: AuthenticatedHandler = async (req) => {
  try {
    const body = await req.json();
    const { import_id } = validateDto(importConfirmSchema, body);
    const result = await ImportService.confirmImport(import_id, req.user.userId);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Import",
      entityId: import_id,
      afterData: { status: "CONFIRMED" },
      description: `Import #${import_id} confirmado`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ data: result, message: "Import confirmado e executado" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

/**
 * DELETE /api/lots/import — Cancel a pending import.
 */
const cancelHandler: AuthenticatedHandler = async (req) => {
  try {
    const importId = Number(req.nextUrl.searchParams.get("import_id"));
    if (!importId) return NextResponse.json({ error: "import_id obrigatorio" }, { status: 400 });

    await ImportService.cancelImport(importId);

    await LogService.audit({
      userId: req.user.userId,
      action: "UPDATE",
      entity: "Import",
      entityId: importId,
      afterData: { status: "CANCELLED" },
      description: `Import #${importId} cancelado`,
      ipAddress: LogService.getIpAddress(req.headers),
    });

    return NextResponse.json({ message: "Import cancelado" });
  } catch (error) {
    const { error: message, status } = handleApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
};

export const GET = withRoles(["Admin", "Gerente", "Diretor", "Coordenador de Polo", "Coordenador de Setores"])(listHandler);
export const POST = withRoles(["Admin", "Gerente"])(analyzeHandler);
export const PUT = withRoles(["Admin", "Gerente"])(confirmHandler);
export const DELETE = withRoles(["Admin", "Gerente"])(cancelHandler);
