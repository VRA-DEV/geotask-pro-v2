import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding GeoTask Pro v2...\n");

  // ============================================================
  // 1. ROLES (10 roles: 8 internal + 2 external)
  // ============================================================
  const roles = [
    { name: "Admin" },
    { name: "Socio" },
    { name: "Diretor" },
    { name: "Gerente" },
    { name: "Coordenador de Polo" },
    { name: "Coordenador de Setores" },
    { name: "Gestor" },
    { name: "Liderado" },
    { name: "Cliente Admin" },
    { name: "Cliente Viewer" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`Roles: ${roles.length} upserted`);

  // ============================================================
  // 2. SECTORS
  // ============================================================
  const sectors = [
    "Engenharia",
    "Ambiental",
    "Topografia",
    "Assistencia Social",
    "Juridico",
    "Administrativo",
    "TI",
    "Financeiro",
    "Comercial",
    "RH",
    "Diretoria",
    "Gerencia",
    "Operacional",
  ];

  for (const name of sectors) {
    await prisma.sector.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Sectors: ${sectors.length} upserted`);

  // ============================================================
  // 3. TEAMS
  // ============================================================
  const teams = ["Polo Cuiaba", "Polo Maceio"];

  for (const name of teams) {
    await prisma.team.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Teams: ${teams.length} upserted`);

  // ============================================================
  // 4. TASK TYPES
  // ============================================================
  const taskTypes = [
    "Cadastro",
    "Vistoria",
    "Levantamento",
    "Relatorio",
    "Projeto",
    "Analise",
    "Protocolo",
    "Atendimento",
    "Reuniao",
    "Administrativo",
    "Outro",
  ];

  for (const name of taskTypes) {
    await prisma.taskType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Task Types: ${taskTypes.length} upserted`);

  // ============================================================
  // 5. ADMIN USER
  // ============================================================
  const adminRole = await prisma.role.findUnique({ where: { name: "Admin" } });
  const tiSector = await prisma.sector.findUnique({ where: { name: "TI" } });

  if (adminRole && tiSector) {
    const passwordHash = await bcrypt.hash("admin123", 12);

    await prisma.user.upsert({
      where: { email: "admin@geotask.com" },
      update: {},
      create: {
        name: "Administrador",
        email: "admin@geotask.com",
        password_hash: passwordHash,
        role_id: adminRole.id,
        sector_id: tiSector.id,
        user_type: "INTERNAL",
        must_change_password: true,
      },
    });
    console.log("Admin user: admin@geotask.com / admin123");
  }

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
