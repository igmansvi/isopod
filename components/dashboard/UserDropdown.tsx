"use client";

import { useState } from "react";
import { User, LogOut, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserDropdownProps {
  username: string;
  onSignOut: () => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

/**
 * @description Renders a user dropdown with sign out and account deletion
 * capabilities. Account deletion is guarded by a confirmation dialog.
 */
export function UserDropdown({ username, onSignOut, onDeleteAccount }: UserDropdownProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDeleteAccount();
    } finally {
      // If successful, NextAuth redirects anyway
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await onSignOut();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="relative flex items-center gap-2 px-2 py-1.5 h-auto hover:bg-accent hover:text-accent-foreground rounded-md outline-none">
          <div className="flex items-center justify-center bg-primary/10 text-primary rounded-full w-7 h-7">
            <User className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium">{username}</span>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={handleSignOut} disabled={loading} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setDeleteDialogOpen(true)} 
            disabled={loading}
            className="text-destructive focus:text-destructive cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete account</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete your
              account, stop and remove all your containers, and wipe your
              workspace files from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Yes, delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
