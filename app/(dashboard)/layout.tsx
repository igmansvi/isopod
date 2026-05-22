/**
 * @file Dashboard layout component.
 * @description Provides the authenticated application shell,
 * including the top navigation bar with user info and sign-out.
 */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { stopContainer, removeContainer } from "@/lib/docker";
import { StoreInitializer } from "@/components/store-initializer";
import { UserDropdown } from "@/components/dashboard/UserDropdown";
import Image from "next/image";
import fs from "fs/promises";
import path from "path";
import { WORKSPACES_ROOT } from "@/lib/constants";

/**
 * @description Server component that enforces authentication,
 * fetches the session, and renders the top header bar and
 * scrollable main content area.
 * @param props.children - The dashboard page content.
 */
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <StoreInitializer user={session.user as any} />
      <header className="h-14 border-b border-border flex items-center px-6 justify-between bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Image src="/icon.svg" alt="Isopod Logo" width={24} height={24} className="w-6 h-6" />
          <span className="text-xl font-semibold tracking-tight">Isopod</span>
        </div>
        
        <div className="flex items-center gap-4">
          <UserDropdown 
            username={session.user.name || "User"}
            onSignOut={async () => {
              "use server";
              if (session?.user?.id) {
                const userEnvs = await prisma.environment.findMany({
                  where: { userId: session.user.id, containerId: { not: null } },
                  select: { id: true, containerId: true },
                });

                await Promise.allSettled(
                  userEnvs.map(async (env) => {
                    if (env.containerId) {
                      await stopContainer(env.containerId);
                      await prisma.environment.update({
                        where: { id: env.id },
                        data: { status: "stopped" },
                      });
                    }
                  })
                );
              }
              await signOut({ redirectTo: "/login" });
            }}
            onDeleteAccount={async () => {
              "use server";
              if (!session?.user?.id || !session?.user?.name) return;

              // 1. Fetch environments
              const userEnvs = await prisma.environment.findMany({
                where: { userId: session.user.id }
              });

              // 2. Stop and remove Docker containers
              await Promise.allSettled(
                userEnvs.map(async (env) => {
                  if (env.containerId) {
                    await stopContainer(env.containerId);
                    await removeContainer(env.containerId);
                  }
                })
              );

              // 3. Delete user workspace files from host
              const localPath = path.resolve(WORKSPACES_ROOT, session.user.name);
              try {
                await fs.rm(localPath, { recursive: true, force: true });
              } catch {
                // Ignore file removal errors to ensure DB cleanup proceeds
              }

              // 4. Delete user record (cascades Environments)
              await prisma.user.delete({
                where: { id: session.user.id }
              });

              // 5. Sign out
              await signOut({ redirectTo: "/login" });
            }}
          />
        </div>
      </header>
      
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
