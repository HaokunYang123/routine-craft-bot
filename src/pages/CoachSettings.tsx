import { useState } from "react";
import { Settings, User, Bell, Shield, Palette, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export default function CoachSettings() {
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState({
    emailDigest: true,
    studentProgress: true,
    weeklyReport: false,
  });

  return (
    <div className="space-y-6 pb-20 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <User className="w-5 h-5 text-btn-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Profile</CardTitle>
              <CardDescription>Your account information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Display Name</Label>
              <Input
                defaultValue={user?.user_metadata?.full_name || ""}
                placeholder="Your name"
                className="bg-input border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <Input
                value={user?.email || ""}
                disabled
                className="bg-muted border-border text-muted-foreground"
              />
            </div>
          </div>
          <Button className="bg-cta-primary hover:bg-cta-hover text-white">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Notifications Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <Bell className="w-5 h-5 text-btn-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Notifications
              </CardTitle>
              <CardDescription>Configure your notification preferences</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Email Digest</p>
              <p className="text-sm text-muted-foreground">
                Receive daily email summaries
              </p>
            </div>
            <Switch
              checked={notifications.emailDigest}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, emailDigest: checked }))
              }
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Student Progress Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified when students fall behind
              </p>
            </div>
            <Switch
              checked={notifications.studentProgress}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({
                  ...prev,
                  studentProgress: checked,
                }))
              }
            />
          </div>
          <Separator className="bg-border" />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Weekly Reports</p>
              <p className="text-sm text-muted-foreground">
                Receive weekly performance reports
              </p>
            </div>
            <Switch
              checked={notifications.weeklyReport}
              onCheckedChange={(checked) =>
                setNotifications((prev) => ({ ...prev, weeklyReport: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Section */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-btn-secondary/20">
              <Shield className="w-5 h-5 text-btn-secondary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">
                Privacy & Security
              </CardTitle>
              <CardDescription>Manage your security settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Change Password
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Two-Factor Authentication
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start border-border text-foreground hover:bg-muted"
          >
            Download My Data
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-urgent/30">
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full border-urgent/50 text-urgent hover:bg-urgent/10 hover:text-urgent"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
