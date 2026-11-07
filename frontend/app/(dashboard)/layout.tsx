import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const metadata = {
  title: "AgriChain Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F1F0E9]">
      <Sidebar />
      <TopNav />

      <main className="flex-1 ml-72 overflow-y-auto p-8 relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1626084229597-55adb1227317?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center opacity-8 pointer-events-none"></div>
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}