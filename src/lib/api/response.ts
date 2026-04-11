// Standard JSON envelope and error helpers for the /api/v1 public API.
//
// Success:  { data: <T>, meta?: { … } }
// Error:    { error: { code: string, message: string, details?: unknown } }

import { NextResponse } from "next/server";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>, init?: ResponseInit) {
  return NextResponse.json(
    meta ? { data, meta } : { data },
    { status: 200, ...init }
  );
}

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status }
  );
}

export const errors = {
  unauthorized: () =>
    apiError(401, "unauthorized", "Missing or invalid API key. Send 'Authorization: Bearer sd_live_…'."),
  forbidden: (message = "This API key does not have the required scope.") =>
    apiError(403, "forbidden", message),
  notFound: (resource = "resource") =>
    apiError(404, "not_found", `The requested ${resource} was not found.`),
  badRequest: (message: string, details?: unknown) =>
    apiError(400, "bad_request", message, details),
  rateLimited: (retryAfterSeconds: number) => {
    const res = apiError(429, "rate_limited", "Too many requests — slow down.");
    res.headers.set("Retry-After", String(retryAfterSeconds));
    return res;
  },
  internal: (message = "Unexpected server error.") =>
    apiError(500, "internal_error", message),
};
