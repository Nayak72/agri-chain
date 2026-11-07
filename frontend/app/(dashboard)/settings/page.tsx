"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, ShieldCheck, Bell, Mail, Lock } from "lucide-react";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-charcoal">System Settings</h1>
        <p className="text-muted-foreground">Configure platform preferences and system parameters.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 space-y-2">
          {settingsSections.map((section) => (
            <button
              key={section.name}
              onClick={() => setActiveSection(section.name)}
              className={`flex items-center gap-3 p-3 rounded-lg text-sm transition-colors ${
                activeSection === section.name
                  ? "bg-forest-800/10 border border-forest-200 text-forest-800"
                  : "text-muted-foreground hover:bg-white/50 border-transparent"
              }`}
            >
              <section.icon className="w-5 h-5" />
              <span>{section.name}</span>
            </button>
          ))}
        </aside>

        <div className="lg:col-span-9">
          <Card>
            <CardHeader>
              <CardTitle>{activeSection} Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {activeSection === "Profile" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Full Name</label>
                      <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="John Farmer" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">Email</label>
                      <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="john@farm.com" type="email" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Phone</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="+91 98765 43210" />
                  </div>
                  <Button>Save Changes</Button>
                </div>
              )}
              {activeSection === "Security" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Current Password</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" type="password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">New Password</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" type="password" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Confirm Password</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </div>
              )}
              {activeSection === "Notifications" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Email Notifications</span>
                    <input type="checkbox" className="rounded border-border" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">SMS Alerts</span>
                    <input type="checkbox" className="rounded border-border" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Push Notifications</span>
                    <input type="checkbox" className="rounded border-border" defaultChecked />
                  </div>
                </div>
              )}
              {activeSection === "Ledger" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Chain ID</span>
                    <span className="text-xs font-mono text-charcoal bg-gray-100 px-2 py-1 rounded">AGRCHAIN-GLOBAL-001</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hash Algorithm</span>
                    <span className="text-xs font-mono text-charcoal bg-gray-100 px-2 py-1 rounded">SHA-256</span>
                  </div>
                  <Button variant="outline">Verify Chain Integrity</Button>
                </div>
              )}
              {activeSection === "System" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Application Name</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="AgriChain" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">Environment</label>
                    <select className="w-full px-3 py-2 border border-border rounded-lg bg-white">
                      <option>Development</option>
                      <option>Staging</option>
                      <option>Production</option>
                    </select>
                  </div>
                  <Button>Save System Settings</Button>
                </div>
              )}
              {activeSection === "Email" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">SMTP Host</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="smtp.example.com" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">SMTP Port</label>
                    <input className="w-full px-3 py-2 border border-border rounded-lg bg-white" defaultValue="587" type="number" />
                  </div>
                  <Button>Save Email Settings</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}