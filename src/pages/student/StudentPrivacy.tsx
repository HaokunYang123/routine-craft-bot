import { useNavigate } from "react-router-dom";
import { SketchCard, SketchButton } from "@/components/ui/sketch";
import { ArrowLeft, Shield } from "lucide-react";

export default function StudentPrivacy() {
    const navigate = useNavigate();

    return (
        <div className="p-4 md:p-6 pb-28 max-w-2xl mx-auto space-y-6">
            <header className="flex items-center gap-4 pt-2 pb-2">
                <SketchButton variant="ghost" className="p-0 h-auto" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-6 h-6" />
                </SketchButton>
                <h1 className="text-display-sm text-foreground">Privacy Policy</h1>
            </header>

            <SketchCard variant="default">
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-body-lg font-bold mb-2">Your Privacy Matters</h2>
                    <p className="text-body-md text-muted-foreground max-w-sm">
                        Safety and security are our top priorities.
                    </p>
                </div>
            </SketchCard>

            <div className="space-y-6">
                <SketchCard variant="default" className="p-5">
                    <h3 className="text-lg font-bold font-hand mb-3">1. Data Collection</h3>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                        We collect your name, email address, and task completion data assigned by your coach.
                        This information is necessary to provide our coaching and task management services.
                    </p>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <h3 className="text-lg font-bold font-hand mb-3">2. Data Usage</h3>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                        Your data is visible <strong>only to you and your assigned coaches</strong>.
                        We use your information to track progress, send reminders, and help your coach
                        support your goals. We do not sell or share your data with third parties.
                    </p>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <h3 className="text-lg font-bold font-hand mb-3">3. Data Security</h3>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                        We use industry-standard security measures to protect your information,
                        including encrypted connections and secure data storage. Your password
                        is never stored in plain text.
                    </p>
                </SketchCard>

                <SketchCard variant="default" className="p-5">
                    <h3 className="text-lg font-bold font-hand mb-3">4. Account Deletion</h3>
                    <p className="text-body-md text-muted-foreground leading-relaxed">
                        You can request complete deletion of your account and all associated data
                        at any time. Contact your coach or email{" "}
                        <a href="mailto:support@teachcoachconnect.com" className="text-primary underline">
                            support@teachcoachconnect.com
                        </a>{" "}
                        to request data deletion.
                    </p>
                </SketchCard>

                <p className="text-sm text-muted-foreground text-center pt-4">
                    Effective Date: January 2026
                </p>
            </div>
        </div>
    );
}
