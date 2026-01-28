import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/lib/error";
import { Button } from "@/components/ui/button";
import { QRScanner } from "./QRScanner";
import { ClassCodeForm } from "./ClassCodeForm";
import { QrCode, Keyboard, ArrowLeft } from "lucide-react";

/**
 * StudentAuth is now only for joining classes via QR/code.
 * Authentication is handled by the main Auth.tsx component with role selection.
 */
export function StudentAuth() {
  const [view, setView] = useState<"options" | "qr" | "code">("options");
  const [isProcessingQR, setIsProcessingQR] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleQRScan = async (qrData: string) => {
    setIsProcessingQR(true);
    try {
      const { data, error } = await supabase.rpc("validate_qr_token", { token: qrData });

      if (error || !data || (Array.isArray(data) && data.length === 0)) {
        toast({ title: "Invalid QR Code", description: "This QR code is invalid or has expired.", variant: "destructive" });
        setView("options");
        return;
      }

      // Handle the case where data might be an array or object depending on RPC definition
      const session = Array.isArray(data) ? data[0] : data;

      toast({ title: "Joined Class!", description: `Welcome to ${session?.session_name || 'Class'}` });
      navigate("/app");
    } catch (error) {
      handleError(error, { component: 'StudentAuth', action: 'process QR code' });
    } finally {
      setIsProcessingQR(false);
      setView("options");
    }
  };

  const handleClassCodeSuccess = (sessionName: string) => {
    toast({ title: "Joined Class!", description: `Welcome to ${sessionName}` });
    navigate("/app");
  };

  if (view === "qr") {
    return <QRScanner onScan={handleQRScan} onCancel={() => setView("options")} isProcessing={isProcessingQR} />;
  }

  if (view === "code") {
    return <ClassCodeForm onSuccess={handleClassCodeSuccess} onCancel={() => setView("options")} />;
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" className="gap-2 -ml-2 mb-2 p-0 h-auto hover:bg-transparent" onClick={() => navigate("/app")}>
        <ArrowLeft className="w-4 h-4" /> Back to App
      </Button>
      <h2 className="text-xl font-semibold text-center mb-6">Join a Class</h2>

      <div className="space-y-3">
        <Button variant="outline" className="w-full h-14 justify-start gap-4 text-left" onClick={() => setView("qr")}>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">Scan QR Code</div>
            <div className="text-xs text-muted-foreground">Use your camera</div>
          </div>
        </Button>
        <Button variant="outline" className="w-full h-14 justify-start gap-4 text-left" onClick={() => setView("code")}>
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Keyboard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-medium">Enter Class Code</div>
            <div className="text-xs text-muted-foreground">Type the 6-character code</div>
          </div>
        </Button>
      </div>
    </div>
  );
}
