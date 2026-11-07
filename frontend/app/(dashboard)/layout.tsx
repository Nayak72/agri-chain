"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/sidebar";
import TopNav from "@/components/layout/top-nav";
import { useAuth } from "@/hooks/use-auth";
import { MobileNav } from "@/components/shell/MobileNav";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-soft">
            <span className="text-primary-foreground font-serif font-bold text-xl">A</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse font-medium">Loading AgriChain...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-transparent">
      <Sidebar />
      <div
        className="flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 md:ml-[var(--sidebar-width,256px)]"
      >
        <TopNav />
        <main className="flex-1 overflow-y-auto pt-16 bg-transparent">
          <div className="p-6 pb-24 lg:p-8 lg:pb-8 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardContent>{children}</DashboardContent>;
}
