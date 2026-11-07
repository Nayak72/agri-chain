import Sidebar from "@/components/layout/sidebar";
import TopNav from "@/components/layout/top-nav";
import { Providers } from "@/components/providers";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <TopNav />
      <main className="flex-1 overflow-y-auto" style={{ marginLeft: "var(--sidebar-width, 252px)" }}>
        <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}