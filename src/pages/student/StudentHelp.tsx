import { useNavigate } from "react-router-dom";
import { SketchCard, SketchButton } from "@/components/ui/sketch";
import { ArrowLeft, HelpCircle, CalendarDays, CheckCircle2, UserPlus, Mail } from "lucide-react";

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

            <div className="grid gap-4">
                <SketchCard variant="default" className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-hand mb-2">Getting Started</h3>
                            <p className="text-body-md text-muted-foreground leading-relaxed">
                                Join a class using the invite code provided by your coach. Once joined,
                                you'll see tasks assigned to you on your home screen and calendar.
                            </p>
                        </div>
                    </div>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-hand mb-2">Completing Tasks</h3>
                            <p className="text-body-md text-muted-foreground leading-relaxed">
                                Tap the checkbox next to any task to mark it complete. Your progress
                                is tracked automatically and visible to your coach.
                            </p>
                        </div>
                    </div>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-hand mb-2">Using the Calendar</h3>
                            <p className="text-body-md text-muted-foreground leading-relaxed">
                                Colored dots on dates indicate tasks scheduled for that day.
                                Tap any date to see the full list of tasks and mark them complete.
                            </p>
                        </div>
                    </div>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-accent-yellow/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-accent-yellow-dark" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold font-hand mb-2">Contact Support</h3>
                            <p className="text-body-md text-muted-foreground leading-relaxed">
                                Need help? Reach out to your coach directly or email us at{" "}
                                <a href="mailto:support@teachcoachconnect.com" className="text-primary underline">
                                    support@teachcoachconnect.com
                                </a>
                            </p>
                        </div>
                    </div>
                </SketchCard>
            </div>
        </div>
    );
}
