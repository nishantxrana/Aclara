/**
 * Application HTTP error with a stable status code for the global error handler.
 */
export class HttpError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export function isHttpError(err: unknown): err is HttpError {
  return err instanceof HttpError;
}
