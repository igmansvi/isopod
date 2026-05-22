/**
 * @file Environment card component.
 * @description Displays a single environment's details and provides
 * action buttons to start, stop, open, or delete it.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EnvironmentStatus } from "@/types";

interface EnvironmentData {
  id: string;
  name: string;
  image: string;
  status: EnvironmentStatus;
  createdAt: string;
}

interface EnvironmentCardProps {
  environment: EnvironmentData;
  onRefresh: () => void;
}

/**
 * @description Renders a card representing a single environment,
 * including its current status badge and relevant lifecycle actions.
 * @param props.environment - The environment data object.
 * @param props.onRefresh   - Callback to refresh the parent list after actions.
 */
export function EnvironmentCard({
  environment,
  onRefresh,
}: EnvironmentCardProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /**
   * @description Handles state changes (start/stop) via the API.
   * @param action - 'start' or 'stop'.
   */
  async function handleAction(action: "start" | "stop") {
    setLoading(true);
    try {
      await fetch(`/api/environments/${environment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
    } finally {
      setLoading(false);
      onRefresh();
    }
  }

  /**
   * @description Handles permanent deletion via the API.
   */
  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/environments/${environment.id}`, {
        method: "DELETE",
      });
    } finally {
      setLoading(false);
      onRefresh();
    }
  }

  const statusColors = {
    running: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
    stopped: "bg-muted text-muted-foreground hover:bg-muted/80",
    creating: "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20",
    error: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="truncate" title={environment.name}>
              {environment.name}
            </CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              {environment.image}
            </CardDescription>
          </div>
          <Badge
            variant="secondary"
            className={`capitalize whitespace-nowrap ${
              statusColors[environment.status] || statusColors.stopped
            }`}
          >
            {environment.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-xs text-muted-foreground">
          Created {new Date(environment.createdAt).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter className="pt-4 border-t gap-2 flex-wrap">
        {environment.status === "stopped" && (
          <Button
            size="sm"
            onClick={() => handleAction("start")}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            Start
          </Button>
        )}
        {environment.status === "running" && (
          <>
            <Link href={`/editor/${environment.id}`} className={buttonVariants({ variant: "default", size: "sm", className: "flex-1" })}>
              Open IDE
            </Link>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => handleAction("stop")}
              disabled={loading}
            >
              Stop
            </Button>
          </>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={loading || environment.status === "creating"}
        >
          Delete
        </Button>
      </CardFooter>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Environment</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{environment.name}</strong>? This action cannot be undone and all workspace files will be permanently lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
