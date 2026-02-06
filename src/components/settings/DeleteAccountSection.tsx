import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/integrations/supabase/client";

interface DeleteAccountResponse {
  error?: string;
  success?: boolean;
}

export function DeleteAccountSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const closeDialog = () => {
    if (deleting) return;
    setOpen(false);
    setConfirmationText("");
  };

  const handleDeleteAccount = async () => {
    if (confirmationText !== "DELETE" || deleting) return;

    setDeleting(true);

    try {
      if (!SUPABASE_URL) {
        throw new Error("Supabase URL is not configured");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("You are not authenticated. Please sign in again.");
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`,
          "apikey": SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
      });

      let payload: DeleteAccountResponse = {};
      try {
        payload = (await response.json()) as DeleteAccountResponse;
      } catch {
        payload = {};
      }

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete account");
      }

      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (error: unknown) {
      setDeleting(false);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Unable to delete account. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Card className="border-destructive/40">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-destructive/15 p-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">Delete Account</CardTitle>
              <CardDescription className="mt-1">
                This will permanently delete your account and all associated data. This action cannot be undone.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            Delete Account
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              This will permanently delete your account, all your data, groups, templates, and assignments. Type
              DELETE to confirm.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">Type DELETE to confirm</Label>
            <Input
              id="delete-account-confirmation"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              disabled={deleting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={closeDialog} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={confirmationText !== "DELETE" || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
