/**
 * @file Dashboard main page.
 * @description Lists all environments owned by the user and
 * provides the entry point for creating new ones.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { EnvironmentCard } from "@/components/dashboard/EnvironmentCard";
import { CreateEnvironmentDialog } from "@/components/dashboard/CreateEnvironmentDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useStore } from "@/lib/store";

/**
 * @description Client component that fetches and renders the user's
 * environments in a grid layout.
 */
export default function DashboardPage() {
  const { environments, isEnvironmentsLoading, environmentsError, fetchEnvironments } = useStore();

  useEffect(() => {
    fetchEnvironments();
  }, [fetchEnvironments]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Environments</h1>
        <CreateEnvironmentDialog onCreated={fetchEnvironments} />
      </div>

      {environmentsError && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          {environmentsError}
        </div>
      )}

      {isEnvironmentsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col space-y-3 p-4 border rounded-xl">
              <Skeleton className="h-[20px] w-[150px] rounded-md" />
              <Skeleton className="h-[14px] w-[100px] rounded-md" />
              <div className="space-y-2 mt-4">
                <Skeleton className="h-8 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : environments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center border rounded-xl border-dashed bg-muted/20">
          <p className="text-muted-foreground mb-4">
            No environments yet. Create one to get started.
          </p>
          <CreateEnvironmentDialog onCreated={fetchEnvironments} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {environments.map((env) => (
            <EnvironmentCard
              key={env.id}
              environment={env}
              onRefresh={fetchEnvironments}
            />
          ))}
        </div>
      )}
    </div>
  );
}
