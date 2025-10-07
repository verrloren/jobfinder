export class ApplicationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends ApplicationError {}
export class NotFoundError extends ApplicationError {}
export class ConflictError extends ApplicationError {}
