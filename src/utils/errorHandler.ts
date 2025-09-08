import { ZodError } from "zod";

export class ApiError extends Error {
  status: number;
  details?: any;

  constructor(status: number, message: string, details?: any) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function handleError(err: any) {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: {
        statusCode: err.status,
        error: "ApiError",
        message: err.message,
        details: err.details || null,
      },
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        statusCode: 400,
        error: "ValidationError",
        message: "Invalid request data",
        details: err.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
    };
  }

  return {
    status: 500,
    body: {
      statusCode: 500,
      error: "InternalServerError",
      message: err.message || "Something went wrong, please try later.",
    },
  };
}
