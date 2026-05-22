/**
 * @file Environments collection API route.
 * @description Handles listing all environments for the
 * authenticated user (GET) and creating new ones (POST).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createEnvironmentContainer,
  getContainerStatus,
} from "@/lib/docker";
import {
  ENVIRONMENT_TEMPLATES,
  DEFAULT_ENVIRONMENT_TEMPLATE_ID,
} from "@/lib/constants";
import type { ApiResponse } from "@/types";

/** @description Allowed characters for environment names. */
const NAME_REGEX = /^[a-zA-Z0-9_-]{1,50}$/;

/**
 * @description Lists all environments owned by the authenticated user.
 * Syncs each environment's status with the live Docker container state.
 * @returns A JSON array of environment records.
 */
export async function GET(): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const environments = await prisma.environment.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  const synced = await Promise.all(
    environments.map(async (env: any) => {
      if (env.containerId) {
        const liveStatus = await getContainerStatus(env.containerId);

        if (liveStatus !== env.status) {
          await prisma.environment.update({
            where: { id: env.id },
            data: { status: liveStatus },
          });
          return { ...env, status: liveStatus };
        }
      }
      return env;
    }),
  );

  return NextResponse.json({ success: true, data: synced });
}

/**
 * @description Creates a new environment for the authenticated user.
 * Provisions a Docker container, starts it, and persists the record.
 * @param request - The incoming request with `{ name, templateId }` body.
 * @returns The newly created environment record.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.name) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    const { name, templateId } = await request.json();

    if (!name || !NAME_REGEX.test(name)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Name must be 1–50 characters: letters, numbers, hyphens, underscores.",
        },
        { status: 400 },
      );
    }

    const template =
      ENVIRONMENT_TEMPLATES.find((t) => t.id === templateId) ||
      ENVIRONMENT_TEMPLATES[0];

    const workspacePath = `${session.user.name}/${name}`;

    let environment;
    try {
      environment = await prisma.environment.create({
        data: {
          name,
          image: template.image,
          status: "creating",
          workspacePath,
          userId: session.user.id,
        },
      });
    } catch (err: any) {
      if (err?.code === "P2002") {
        const existing = await prisma.environment.findFirst({
          where: { userId: session.user.id, name },
        });
        if (existing) {
          return NextResponse.json(
            {
              success: false,
              error: "Environment already exists.",
              data: existing,
            },
            { status: 409 },
          );
        }
      }
      throw err;
    }

    try {
      const containerId = await createEnvironmentContainer(
        session.user.id,
        session.user.name,
        name,
        template.image,
      );

      const updated = await prisma.environment.update({
        where: { id: environment.id },
        data: { containerId, status: "stopped" },
      });

      return NextResponse.json(
        { success: true, data: updated },
        { status: 201 },
      );
    } catch (err) {
      console.error("[environments] Container creation failed:", err);

      await prisma.environment.update({
        where: { id: environment.id },
        data: { status: "error" },
      });

      return NextResponse.json(
        { success: false, error: "Failed to create container." },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("[environments] POST error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
