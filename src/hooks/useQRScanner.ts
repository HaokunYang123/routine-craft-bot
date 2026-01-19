import { useState, useCallback, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface UseQRScannerOptions {
    onScan: (decodedText: string) => void;
    onError?: (error: string) => void;
}

export function useQRScanner({ onScan, onError }: UseQRScannerOptions) {
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const containerIdRef = useRef<string>(`qr-scanner-${Date.now()}`);

    const startScanner = useCallback(async () => {
        setError(null);

        try {
            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            stream.getTracks().forEach(track => track.stop()); // Release immediately
            setHasPermission(true);

            // Initialize scanner
            const scanner = new Html5Qrcode(containerIdRef.current);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: "environment" }, // Prefer back camera
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    // Successful scan
                    onScan(decodedText);
                    stopScanner();
                },
                (errorMessage) => {
                    // Scanning error (not critical, happens while searching)
                    // Don't report these as errors
                }
            );

            setIsScanning(true);
        } catch (err: any) {
            const errorMessage = err.name === "NotAllowedError"
                ? "Camera permission denied. Please allow camera access to scan QR codes."
                : err.message || "Failed to start camera";

            setError(errorMessage);
            setHasPermission(false);
            onError?.(errorMessage);
        }
    }, [onScan, onError]);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                // Ignore stop errors
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, [stopScanner]);

    return {
        isScanning,
        hasPermission,
        error,
        startScanner,
        stopScanner,
        containerId: containerIdRef.current,
    };
}
