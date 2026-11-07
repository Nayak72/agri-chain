"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { UserCog, ShieldCheck, Bell, Mail, Lock, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { motion } from "framer-motion";

const settingsSections = [
  { name: "Profile", icon: UserCog, description: "Manage your personal profile and preferences" },
  { name: "Security", icon: ShieldCheck, description: "Password, 2FA, and session settings" },
  { name: "Notifications", icon: Bell, description: "Email and push notification preferences" },
  { name: "Email", icon: Mail, description: "Email templates and SMTP configuration" },
  { name: "Ledger", icon: ShieldCheck, description: "Hash-chain ledger configuration" },
  { name: "System", icon: Lock, description: "System-wide settings and maintenance" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("Profile");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  const handleThemeChange = (value: string) => {
    setTheme(value as "light" | "dark" | "system");
    if (value === "dark" || (value === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure platform preferences and system parameters."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="lg:col-span-1">
          <StaggerContainer>
            {settingsSections.map((section, index) => (
              <StaggerItem key={section.name} delay={index * 0.05}>
                <Button
                  variant={activeSection === section.name ? "default" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => setActiveSection(section.name)}
                >
                  <section.icon className="w-5 h-5" />
                  <span>{section.name}</span>
                </Button>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </aside>

        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>{activeSection} Settings</CardTitle>
                <CardDescription>{settingsSections.find(s => s.name === activeSection)?.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {activeSection === "Profile" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input id="full_name" defaultValue="John Farmer" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" defaultValue="john@farm.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" defaultValue="+91 98765 43210" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input id="role" defaultValue="Farmer" disabled />
                      <p className="text-xs text-muted-foreground">Role cannot be changed after registration</p>
                    </div>
                    <Button>Save Changes</Button>
                  </div>
                )}
                {activeSection === "Security" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current_password">Current Password</Label>
                      <Input id="current_password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <Input id="new_password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm Password</Label>
                      <Input id="confirm_password" type="password" />
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Two-Factor Authentication</h4>
                      <p className="text-sm text-muted-foreground mb-3">Add an extra layer of security to your account.</p>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                    <Button>Update Password</Button>
                  </div>
                )}
                {activeSection === "Notifications" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive email updates for shipments, alerts, and system events</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">SMS Alerts</h4>
                        <p className="text-sm text-muted-foreground">Receive SMS for critical alerts and delivery confirmations</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Push Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Cold Chain Alerts</h4>
                        <p className="text-sm text-muted-foreground">Immediate alerts for temperature and humidity excursions</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Weekly Reports</h4>
                        <p className="text-sm text-muted-foreground">Receive weekly summary of operations</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                )}
                {activeSection === "Ledger" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chain ID</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">AGRCHAIN-GLOBAL-001</span>
                        <Button variant="ghost" size="sm">Copy</Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Hash Algorithm</Label>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-foreground bg-muted px-2 py-1 rounded">SHA-256</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Verification Schedule</Label>
                      <Select defaultValue="daily" onValueChange={handleThemeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="outline" onClick={() => alert("Chain verification initiated")}>
                      <ShieldCheck className="w-4 h-4 mr-2" /> Verify Chain Integrity
                    </Button>
                  </div>
                )}
                {activeSection === "System" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="app_name">Application Name</Label>
                      <Input id="app_name" defaultValue="AgriChain" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="environment">Environment</Label>
                      <Select defaultValue="development" onValueChange={handleThemeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="development">Development</SelectItem>
                          <SelectItem value="staging">Staging</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="theme">Default Theme</Label>
                      <Select defaultValue={theme} onValueChange={handleThemeChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Debug Mode</Label>
                      <Switch />
                    </div>
                    <Button>Save System Settings</Button>
                  </div>
                )}
                {activeSection === "Email" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host</Label>
                      <Input id="smtp_host" defaultValue="smtp.example.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtp_port">SMTP Port</Label>
                        <Input id="smtp_port" type="number" defaultValue="587" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="smtp_user">SMTP Username</Label>
                        <Input id="smtp_user" defaultValue="noreply@agrichain.com" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="smtp_pass">SMTP Password</Label>
                      <Input id="smtp_pass" type="password" placeholder="••••••••" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="from_email">From Email</Label>
                      <Input id="from_email" type="email" defaultValue="noreply@agrichain.com" />
                    </div>
                    <Button>Save Email Settings</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}