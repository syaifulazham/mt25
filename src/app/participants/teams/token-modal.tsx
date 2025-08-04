"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/language-context";

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  teamId: number;
  onSubmit: (token: string) => Promise<void>;
  isLoading: boolean;
  maxTeams: number;
}

export function TokenModal({
  isOpen,
  onClose,
  eventId,
  teamId,
  onSubmit,
  isLoading,
  maxTeams,
}: TokenModalProps) {
  const { t } = useLanguage();
  const [token, setToken] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim() === "") return;
    await onSubmit(token);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!isLoading && !open) onClose();
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Token Required</DialogTitle>
          <DialogDescription>
            A valid token is required to register this team. This may be due to registration cutoff period or maximum team limit ({maxTeams}) being reached.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="token">Event Token</Label>
            <Input
              id="token"
              placeholder="Enter token code here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
              className="font-mono"
            />
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || token.trim() === ""}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Verify Token"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
