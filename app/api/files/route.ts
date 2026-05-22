/**
 * @file Workspace file operations API route.
 * @description Provides REST endpoints for reading, writing,
 * listing, creating, and deleting files within a user's
 * environment workspace. All operations verify environment
 * ownership before proceeding.
 */

import { NextResponse } from "next/server";
import path from "path";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WORKSPACES_ROOT } from "@/lib/constants";
import {
  listDirectory,
  readFile,
  writeFile,
  createDirectory,
  deleteEntry,
} from "@/lib/filesystem";
import type { ApiResponse } from "@/types";

/**
 * @description Resolves the workspace base path for an environment
 * and verifies the caller owns it.
 * @param envId     - The environment ID from the request.
 * @param sessionUserId - The authenticated user's ID.
 * @returns The absolute base path or a NextResponse error.
 */
async function resolveWorkspace(
  envId: string,
  sessionUserId: string,
): Promise<string | NextResponse<ApiResponse>> {
  const environment = await prisma.environment.findUnique({
    where: { id: envId },
  });

  if (!environment) {
    return NextResponse.json(
      { success: false, error: "Environment not found." },
      { status: 404 },
    );
  }

  if (environment.userId !== sessionUserId) {
    return NextResponse.json(
      { success: false, error: "Forbidden." },
      { status: 403 },
    );
  }

  return path.resolve(WORKSPACES_ROOT, environment.workspacePath);
}

/**
 * @description Reads a file or lists a directory.
 * Query params: `envId` (required), `path` (defaults to `/`).
 * Returns `{ type: 'directory', entries }` or `{ type: 'file', content }`.
 */
export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const envId = searchParams.get("envId");
  const filePath = searchParams.get("path") || "/";

  if (!envId) {
    return NextResponse.json(
      { success: false, error: "Missing envId parameter." },
      { status: 400 },
    );
  }

  const result = await resolveWorkspace(envId, session.user.id);

  if (result instanceof NextResponse) {
    return result;
  }

  const basePath = result;

  try {
    const entries = await listDirectory(basePath, filePath);
    return NextResponse.json({
      success: true,
      data: { type: "directory", entries },
    });
  } catch {
    try {
      const content = await readFile(basePath, filePath);
      return NextResponse.json({
        success: true,
        data: { type: "file", content },
      });
    } catch (err) {
      console.error("[files] GET error:", err);
      return NextResponse.json(
        { success: false, error: "File or directory not found." },
        { status: 404 },
      );
    }
  }
}

/**
 * @description Writes content to a file.
 * Body: `{ envId, path, content }`.
 */
export async function PUT(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { envId, path: filePath, content } = await request.json();

    if (!envId || !filePath) {
      return NextResponse.json(
        { success: false, error: "Missing envId or path." },
        { status: 400 },
      );
    }

    const result = await resolveWorkspace(envId, session.user.id);

    if (result instanceof NextResponse) {
      return result;
    }

    await writeFile(result, filePath, content || "");

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[files] PUT error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to write file." },
      { status: 500 },
    );
  }
}

/**
 * @description Creates a new directory.
 * Body: `{ envId, path }`.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { envId, path: dirPath } = await request.json();

    if (!envId || !dirPath) {
      return NextResponse.json(
        { success: false, error: "Missing envId or path." },
        { status: 400 },
      );
    }

    const result = await resolveWorkspace(envId, session.user.id);

    if (result instanceof NextResponse) {
      return result;
    }

    await createDirectory(result, dirPath);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[files] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to create directory." },
      { status: 500 },
    );
  }
}

/**
 * @description Deletes a file or directory.
 * Query params: `envId`, `path`.
 */
export async function DELETE(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const envId = searchParams.get("envId");
  const filePath = searchParams.get("path");

  if (!envId || !filePath) {
    return NextResponse.json(
      { success: false, error: "Missing envId or path." },
      { status: 400 },
    );
  }

  const result = await resolveWorkspace(envId, session.user.id);

  if (result instanceof NextResponse) {
    return result;
  }

  try {
    await deleteEntry(result, filePath);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[files] DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete entry." },
      { status: 500 },
    );
  }
}
