import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

interface SessionExpiredModalProps {
  open: boolean;
  onReLogin: () => void;
}

export function SessionExpiredModal({ open, onReLogin }: SessionExpiredModalProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent
        onEscapeKeyDown={(e: KeyboardEvent) => e.preventDefault()}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Session Expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired. Please sign in again to continue where you left off.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onReLogin}>
            Sign In Again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
