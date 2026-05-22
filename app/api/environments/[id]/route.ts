/**
 * @file Single environment API route.
 * @description Handles reading (GET), updating (PATCH), and
 * deleting (DELETE) an individual environment by its ID.
 * Enforces ownership — users can only access their own environments.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  startContainer,
  stopContainer,
  removeContainer,
  getContainerStatus,
} from "@/lib/docker";
import { WORKSPACES_ROOT } from "@/lib/constants";
import { deleteEntry } from "@/lib/filesystem";
import type { ApiResponse } from "@/types";

/**
 * @description Retrieves a single environment by ID after verifying
 * the caller owns it.
 * @param _request - Unused request object.
 * @param params   - Route parameters containing the environment `id`.
 * @returns The environment record with live container status.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const environment = await prisma.environment.findUnique({
    where: { id },
  });

  if (!environment) {
    return NextResponse.json(
      { success: false, error: "Environment not found." },
      { status: 404 },
    );
  }

  if (environment.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Forbidden." },
      { status: 403 },
    );
  }

  if (environment.containerId) {
    const liveStatus = await getContainerStatus(environment.containerId);

    if (liveStatus !== environment.status) {
      const updated = await prisma.environment.update({
        where: { id },
        data: { status: liveStatus },
      });
      return NextResponse.json({ success: true, data: updated });
    }
  }

  return NextResponse.json({ success: true, data: environment });
}

/**
 * @description Starts or stops the environment's container.
 * @param request - The incoming request with `{ action: 'start' | 'stop' }` body.
 * @param params  - Route parameters containing the environment `id`.
 * @returns The updated environment record.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const environment = await prisma.environment.findUnique({
    where: { id },
  });

  if (!environment) {
    return NextResponse.json(
      { success: false, error: "Environment not found." },
      { status: 404 },
    );
  }

  if (environment.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Forbidden." },
      { status: 403 },
    );
  }

  if (!environment.containerId) {
    return NextResponse.json(
      { success: false, error: "No container associated." },
      { status: 400 },
    );
  }

  const { action } = await request.json();

  try {
    if (action === "start") {
      await startContainer(environment.containerId);
      const updated = await prisma.environment.update({
        where: { id },
        data: { status: "running" },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (action === "stop") {
      await stopContainer(environment.containerId);
      const updated = await prisma.environment.update({
        where: { id },
        data: { status: "stopped" },
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'start' or 'stop'." },
      { status: 400 },
    );
  } catch (err) {
    console.error(`[environments/${id}] PATCH error:`, err);
    return NextResponse.json(
      { success: false, error: "Failed to perform action." },
      { status: 500 },
    );
  }
}

/**
 * @description Deletes an environment — stops and removes its Docker
 * container, deletes the Prisma record, and attempts to clean up the
 * workspace directory.
 * @param _request - Unused request object.
 * @param params   - Route parameters containing the environment `id`.
 * @returns A success confirmation.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  const environment = await prisma.environment.findUnique({
    where: { id },
  });

  if (!environment) {
    return NextResponse.json(
      { success: false, error: "Environment not found." },
      { status: 404 },
    );
  }

  if (environment.userId !== session.user.id) {
    return NextResponse.json(
      { success: false, error: "Forbidden." },
      { status: 403 },
    );
  }

  if (environment.containerId) {
    try {
      await stopContainer(environment.containerId);
    } catch {
      /* Container may already be stopped. */
    }

    try {
      await removeContainer(environment.containerId);
    } catch {
      /* Container may already be removed. */
    }
  }

  try {
    await deleteEntry(WORKSPACES_ROOT, environment.workspacePath);
  } catch (err) {
    console.error(`[environments/${id}] Failed to delete workspace directory:`, err);
  }

  await prisma.environment.delete({ where: { id } });

  return NextResponse.json({ success: true, data: { id } });
}
