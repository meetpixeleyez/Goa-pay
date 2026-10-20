import { NextResponse } from "next/server";
import { getSession, AuthSession } from "@/lib/auth";
import { UserRole } from "@/types";
import { ApiError } from "@/types/api";

export interface RequireAuthOptions {
  allowedRoles?: UserRole[];
  requireWrite?: boolean;
}

/**
 * Asserts that the user has write/mutation permissions.
 * Non-admin users with portalAccess === false cannot create, update, or delete records.
 */
export function requireWritePermission(session: AuthSession): void {
  if (session.role === "ADMIN") return;

  if (session.portalAccess === false) {
    throw new ApiError(
      "Portal access is in read-only mode. Create, update, and delete operations are not allowed.",
      403
    );
  }
}

/**
 * Asserts that the request has a valid authenticated session.
 * Optionally verifies that the session role is within `allowedRoles` and checks write permissions.
 */
export async function requireAuth(
  allowedRolesOrOptions?: UserRole[] | RequireAuthOptions,
  options?: { requireWrite?: boolean }
): Promise<AuthSession> {
  let allowedRoles: UserRole[] | undefined;
  let requireWrite = false;

  if (Array.isArray(allowedRolesOrOptions)) {
    allowedRoles = allowedRolesOrOptions;
    requireWrite = options?.requireWrite ?? false;
  } else if (allowedRolesOrOptions && typeof allowedRolesOrOptions === "object") {
    allowedRoles = allowedRolesOrOptions.allowedRoles;
    requireWrite = allowedRolesOrOptions.requireWrite ?? false;
  }

  const session = await getSession();
  if (!session) {
    throw new ApiError("Authentication required. Please sign in.", 401);
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(session.role)) {
      throw new ApiError("Forbidden: You do not have permission to access this resource.", 403);
    }
  }

  if (requireWrite) {
    requireWritePermission(session);
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
