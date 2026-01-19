import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, QrCode as QrIcon, Share2 } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface InviteToolsProps {
    joinCode: string;
    qrToken: string;
}

export function InviteTools({ joinCode, qrToken }: InviteToolsProps) {
    const shareUrl = `${window.location.origin}/join?code=${joinCode}`;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied!",
            description: `${label} copied to clipboard`,
        });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Copy Link */}
            <div className="p-4 border rounded-lg bg-card shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <Share2 className="w-5 h-5" />
                    <span>Share Link</span>
                </div>
                <div className="flex gap-2">
                    <Input value={shareUrl} readOnly className="bg-muted/50 font-mono text-sm" />
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(shareUrl, "Link")}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Class Code */}
            <div className="p-4 border rounded-lg bg-card shadow-sm flex flex-col gap-3">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                    <span className="text-lg font-bold">#</span>
                    <span>Class Code</span>
                </div>
                <div className="flex gap-2">
                    <div className="flex-1 bg-muted/50 rounded-md flex items-center justify-center font-mono text-xl tracking-widest font-bold border">
                        {joinCode}
                    </div>
                    <Button size="icon" variant="outline" onClick={() => copyToClipboard(joinCode, "Class Code")}>
                        <Copy className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* QR Code */}
            <div className="p-4 border rounded-lg bg-card shadow-sm flex flex-col gap-3 items-center justify-center">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="w-full h-full gap-2">
                            <QrIcon className="w-5 h-5" />
                            Show Class QR
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md flex flex-col items-center p-8">
                        <h3 className="text-xl font-bold mb-4">Scan to Join Class</h3>
                        <div className="bg-white p-4 rounded-xl border shadow-sm">
                            <QRCodeSVG value={qrToken} size={256} />
                        </div>
                        <p className="mt-6 text-muted-foreground text-center">
                            Students can scan this code with their device camera to instantly join the class.
                        </p>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
