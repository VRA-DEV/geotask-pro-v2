/**
 * GeoTask Pro v2 — Utility Helpers
 */

/**
 * Determines the deadline state of a task.
 */
export function getTaskState(task: {
  status: string;
  deadline?: string | null;
  completed_at?: string | null;
}): {
  label: string;
  color: string;
  severity: "danger" | "warning" | "success" | "neutral";
} {
  const isDone = task.status === "Concluido" || !!task.completed_at;

  if (!task.deadline) {
    return { label: "Sem Prazo", color: "#6B7280", severity: "neutral" };
  }

  const deadline = new Date(task.deadline);
  const now = new Date();
  const diffMs = deadline.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (isDone) {
    const completedAt = task.completed_at ? new Date(task.completed_at) : now;
    if (completedAt <= deadline) {
      return { label: "Entregue no Prazo", color: "#10B981", severity: "success" };
    }
    return { label: "Atraso na Entrega", color: "#EF4444", severity: "danger" };
  }

  if (diffDays < 0) {
    return { label: "Em Atraso", color: "#EF4444", severity: "danger" };
  }

  if (diffDays <= 2) {
    return { label: "Proximo do Prazo", color: "#F59E0B", severity: "warning" };
  }

  return { label: "Dentro do Prazo", color: "#10B981", severity: "success" };
}

/**
 * Formats a date to Brazilian locale string.
 */
export function formatDateBR(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formats a date with time.
 */
export function formatDateTimeBR(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formats currency to BRL.
 */
export function formatCurrencyBRL(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Formats a CNPJ string.
 */
export function formatCNPJ(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, "");
  return clean.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

/**
 * Formats a CPF string.
 */
export function formatCPF(cpf: string): string {
  const clean = cpf.replace(/\D/g, "");
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Truncates a string to a max length.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

/**
 * Generates initials from a name.
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Calculates the difference in days between two dates.
 */
export function daysDiff(date1: Date, date2: Date): number {
  const diffMs = date2.getTime() - date1.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Cleans an object by removing null/undefined values.
 */
export function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== null && v !== undefined)
  ) as Partial<T>;
}
