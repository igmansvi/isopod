/**
 * @file Dialog component for creating a new environment.
 * @description Provides a modal form to input an environment name
 * and select a base image template.
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_ENVIRONMENT_TEMPLATE_ID,
  ENVIRONMENT_TEMPLATES,
} from "@/lib/constants";

interface CreateEnvironmentDialogProps {
  onCreated: () => void;
}

/**
 * @description Renders a "+ New Environment" button that opens
 * a dialog to provision a new Docker container.
 * @param props.onCreated - Callback invoked after successful creation.
 */
export function CreateEnvironmentDialog({
  onCreated,
}: CreateEnvironmentDialogProps) {
  const defaultTemplateId =
    ENVIRONMENT_TEMPLATES.find(
      (template) => template.id === DEFAULT_ENVIRONMENT_TEMPLATE_ID,
    )?.id || ENVIRONMENT_TEMPLATES[0].id;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(defaultTemplateId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * @description Submits the form to the API to provision the container.
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/environments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, templateId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create environment");
        return;
      }

      setOpen(false);
      setName("");
      setTemplateId(defaultTemplateId);
      onCreated();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>+ New Environment</Button>} />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Environment</DialogTitle>
            <DialogDescription>
              Provision a new isolated workspace and container.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="my-project"
                pattern="^[-a-zA-Z0-9_]{1,50}$"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template" className="text-right">
                Template
              </Label>
              <div className="col-span-3">
                <Select value={templateId} onValueChange={(v) => setTemplateId(v as string)}>
                  <SelectTrigger id="template">
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {ENVIRONMENT_TEMPLATES.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex flex-col">
                          <span>{template.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {template.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
