import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, CalendarDays, CheckCircle2, UserPlus, Mail } from "lucide-react";

export default function StudentHelp() {
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-6">
            <header className="flex items-center gap-4 pt-2 pb-2">
                <Button variant="ghost" className="p-0 h-auto" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-2xl font-bold text-foreground">Help & Support</h1>
            </header>

            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col items-center justify-center py-6 text-center">
                        <div className="w-16 h-16 bg-cta-primary/20 rounded-full flex items-center justify-center mb-4">
                            <HelpCircle className="w-8 h-8 text-cta-primary" />
                        </div>
                        <h2 className="text-lg font-bold mb-2">How can we help?</h2>
                        <p className="text-muted-foreground max-w-sm">
                            Find answers to common questions below.
                        </p>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4">
                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-cta-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <UserPlus className="w-5 h-5 text-cta-primary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2">Getting Started</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Join a class using the invite code provided by your coach. Once joined,
                                you'll see tasks assigned to you on your home screen and calendar.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2">Completing Tasks</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Tap the checkbox next to any task to mark it complete. Your progress
                                is tracked automatically and visible to your coach.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-btn-secondary/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <CalendarDays className="w-5 h-5 text-btn-secondary" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2">Using the Calendar</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Colored dots on dates indicate tasks scheduled for that day.
                                Tap any date to see the full list of tasks and mark them complete.
                            </p>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-urgent/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <Mail className="w-5 h-5 text-urgent" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold mb-2">Contact Support</h3>
                            <p className="text-muted-foreground leading-relaxed">
                                Need help? Reach out to your coach directly or email us at{" "}
                                <a href="mailto:support@teachcoachconnect.com" className="text-cta-primary underline">
                                    support@teachcoachconnect.com
                                </a>
                            </p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
