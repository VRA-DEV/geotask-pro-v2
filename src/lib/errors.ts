export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: number | string) {
    super(
      id ? `${entity} #${id} nao encontrado` : `${entity} nao encontrado`,
      404,
      "NOT_FOUND"
    );
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Autenticacao necessaria") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Permissao insuficiente") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message, 422, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Converts any error to a standardized API response.
 */
export function handleApiError(error: unknown): {
  error: string;
  code?: string;
  errors?: Record<string, string[]>;
  status: number;
} {
  if (error instanceof AppError) {
    return {
      error: error.message,
      code: error.code,
      errors: error instanceof ValidationError ? error.errors : undefined,
      status: error.statusCode,
    };
  }

  console.error("Unhandled error:", error);

  return {
    error: "Erro interno do servidor",
    code: "INTERNAL_ERROR",
    status: 500,
  };
}
