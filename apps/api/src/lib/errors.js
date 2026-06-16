export class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL", details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (entity, id) =>
  new AppError(`${entity} not found`, { status: 404, code: "NOT_FOUND", details: { id } });

export const validationFailed = (details) =>
  new AppError("Validation failed", { status: 422, code: "VALIDATION", details });

export const conflict = (msg, details) =>
  new AppError(msg, { status: 409, code: "CONFLICT", details });
