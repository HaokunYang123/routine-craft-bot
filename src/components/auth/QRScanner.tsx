import { useEffect } from "react";
import { useQRScanner } from "@/hooks/useQRScanner";
import { handleError } from "@/lib/error";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, AlertCircle } from "lucide-react";

interface QRScannerProps {
    onScan: (qrData: string) => void;
    onCancel: () => void;
    isProcessing?: boolean;
}

export function QRScanner({ onScan, onCancel, isProcessing }: QRScannerProps) {
    const {
        isScanning,
        hasPermission,
        error,
        startScanner,
        stopScanner,
        containerId,
    } = useQRScanner({
        onScan: (decodedText) => {
            onScan(decodedText);
        },
        onError: (err) => {
            handleError(new Error(err), { component: 'QRScanner', action: 'scan QR code', silent: true });
        },
    });

    useEffect(() => {
        startScanner();
        return () => {
            stopScanner();
        };
    }, [startScanner, stopScanner]);

    const handleCancel = () => {
        stopScanner();
        onCancel();
    };

    if (error || hasPermission === false) {
        return (
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                </div>
                <div className="text-center space-y-2">
                    <h3 className="font-semibold text-foreground">Camera Access Required</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">
                        {error || "Please allow camera access to scan QR codes."}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button onClick={startScanner}>
                        <Camera className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center space-y-4">
            {/* Scanner container */}
            <div className="relative w-full max-w-sm aspect-square bg-black rounded-lg overflow-hidden">
                <div id={containerId} className="w-full h-full" />

                {/* Overlay for processing state */}
                {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center text-white space-y-2">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                            <p className="text-sm">Verifying...</p>
                        </div>
                    </div>
                )}

                {/* Loading state */}
                {!isScanning && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                )}
            </div>

            {/* Instructions */}
            <p className="text-sm text-muted-foreground text-center">
                Point your camera at the class QR code
            </p>

            {/* Cancel button */}
            <Button variant="ghost" onClick={handleCancel} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
            </Button>
        </div>
    );
}
