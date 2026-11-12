import type { PostgrestError } from "@supabase/supabase-js";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (resource: string, id: number) =>
  new HttpError(404, `${resource} with id ${id} not found`);

// Translate Postgres / PostgREST errors into meaningful HTTP responses.
export function fromPostgrest(error: PostgrestError): HttpError {
  switch (error.code) {
    case "23505": // unique_violation
      return new HttpError(409, "A record with this value already exists", error.details);
    case "23503": // foreign_key_violation
      return error.message.includes("update or delete")
        ? new HttpError(409, "Record is still referenced by other records", error.details)
        : new HttpError(400, "Referenced record does not exist", error.details);
    case "23514": // check_violation (incl. the branch signatory trigger)
      if (error.message.includes("branches_signatories_distinct"))
        return new HttpError(400, "Signatory one and two must be different employees");
      if (error.message.includes("employees_retired_needs_date"))
        return new HttpError(400, "A retired employee needs a retirement date");
      if (error.message.includes("employees_retired_after_hired"))
        return new HttpError(400, "Retirement date can't be before the hire date");
      return new HttpError(400, error.message);
    case "23502": // not_null_violation
    case "22001": // string too long
    case "22P02": // invalid input syntax
      return new HttpError(400, error.message, error.details);
    default:
      console.error("Database error:", error);
      return new HttpError(500, "Database error");
  }
}
