import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText: string; // The text user must type to confirm
  loading?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete Permanently",
  description = "This action cannot be undone. All associated data will be permanently removed.",
  confirmText,
  loading = false,
}: ConfirmDeleteDialogProps) {
  const [typed, setTyped] = useState("");

  const isMatch = typed.trim().toLowerCase() === confirmText.trim().toLowerCase();

  const handleOpenChange = (val: boolean) => {
    if (!val) setTyped("");
    onOpenChange(val);
  };

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
      setTyped("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <Label className="text-sm text-muted-foreground">
            Type <span className="font-semibold text-foreground">"{confirmText}"</span> to confirm:
          </Label>
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmText}
            className="font-mono"
            autoFocus
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isMatch || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "Deleting..." : "Delete Permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
