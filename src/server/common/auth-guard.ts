import { NextResponse } from "next/server";
import { getSession, AuthSession } from "@/lib/auth";
import { UserRole } from "@/types";
import { ApiError } from "@/types/api";

/**
 * Asserts that the request has a valid authenticated session.
 * Optionally verifies that the session role is within `allowedRoles`.
 */
export async function requireAuth(allowedRoles?: UserRole[]): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new ApiError("Authentication required. Please sign in.", 401);
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      throw new ApiError("Forbidden: You do not have permission to access this resource.", 403);
    }
  }

  return session;
}

/**
 * Standardized Route Handler error catcher.
 * Converts ApiError or native errors to structured NextResponse.
 */
export function handleApiError(error: any): NextResponse {
  console.error("[API Error Handler]:", error);

  if (error instanceof ApiError) {
    return NextResponse.json(
      { success: false, error: error.message, details: error.details },
      { status: error.statusCode }
    );
  }

  const message = error?.message || "An unexpected internal server error occurred.";
  return NextResponse.json({ success: false, error: message }, { status: 500 });
}
