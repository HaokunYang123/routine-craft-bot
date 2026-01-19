import { useNavigate } from "react-router-dom";
import { SketchCard, SketchButton } from "@/components/ui/sketch";
import { ArrowLeft, HelpCircle } from "lucide-react";

export default function StudentHelp() {
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-6">
            <header className="flex items-center gap-4 pt-2 pb-2">
                <SketchButton variant="ghost" className="p-0 h-auto" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </SketchButton>
                <h1 className="text-display-sm text-foreground">Help & Support</h1>
            </header>

            <SketchCard variant="default">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-accent-yellow/20 rounded-full flex items-center justify-center mb-4">
                        <HelpCircle className="w-8 h-8 text-accent-yellow-dark" />
                    </div>
                    <h2 className="text-body-lg font-bold mb-2">How can we help?</h2>
                    <p className="text-body-md text-muted-foreground max-w-sm">
                        Find answers to common questions below.
                    </p>
                </div>
            </SketchCard>

            <div className="prose prose-sm max-w-none text-foreground font-sans bg-card p-6 rounded-2xl border-[2.5px] border-foreground shadow-sticker leading-relaxed">
                <h3 className="text-xl font-bold font-hand mb-4">Preamble</h3>
                <p>
                    We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.
                </p>
                <p className="mt-4 text-muted-foreground italic">
                    (This is a placeholder for the actual Help Content)
                </p>
            </div>
        </div>
    );
}
