/**
 * @file User registration API endpoint.
 * @description Handles POST requests to create new user accounts
 * with bcryptjs-hashed passwords.
 */

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createEnvironmentContainer } from "@/lib/docker";
import {
  ENVIRONMENT_TEMPLATES,
  DEFAULT_ENVIRONMENT_TEMPLATE_ID,
} from "@/lib/constants";
import type { ApiResponse } from "@/types";

/** @description Allowed characters for usernames. */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

/** @description Minimum password length. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * @description Registers a new user account.
 * @param request - The incoming request with `{ username, password }` body.
 * @returns A JSON response with the created user's ID and username,
 * or an error message with the appropriate status code.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<ApiResponse>> {
  try {
    const { username, password } = await request.json();

    if (!username || !USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Username must be 3–30 characters and contain only letters, numbers, hyphens, or underscores.",
        },
        { status: 400 },
      );
    }

    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { username } });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Username is already taken." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { username, passwordHash },
    });

    try {
      const defaultTemplate =
        ENVIRONMENT_TEMPLATES.find(
          (t) => t.id === DEFAULT_ENVIRONMENT_TEMPLATE_ID,
        ) || ENVIRONMENT_TEMPLATES[0];

      const envName = `${username}-${defaultTemplate.id}`;
      const workspacePath = `${username}/${envName}`;

      const environment = await prisma.environment.create({
        data: {
          name: envName,
          image: defaultTemplate.image,
          status: "creating",
          workspacePath,
          userId: user.id,
        },
      });

      try {
        const containerId = await createEnvironmentContainer(
          user.id,
          username,
          envName,
          defaultTemplate.image,
        );

        await prisma.environment.update({
          where: { id: environment.id },
          data: { containerId, status: "stopped" },
        });
      } catch (err) {
        console.error("[register] Default container creation failed:", err);
        await prisma.environment.update({
          where: { id: environment.id },
          data: { status: "error" },
        });
      }
    } catch (err) {
      console.error("[register] Failed to create default environment:", err);
    }

    return NextResponse.json(
      { success: true, data: { id: user.id, username: user.username } },
      { status: 201 },
    );
  } catch (err) {
    console.error("[register] Error:", err);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 },
    );
  }
}
