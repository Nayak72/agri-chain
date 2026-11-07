import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return <div className="flex min-h-[60vh] items-center justify-center"><div className="glass-raised max-w-md space-y-4 rounded-2xl p-8 text-center"><p className="text-sm font-medium text-warning">403</p><h1 className="font-display text-2xl font-bold">Access restricted</h1><p className="text-sm text-muted-foreground">Your account does not have permission to view this resource.</p><Button asChild><Link href="/dashboard">Return to dashboard</Link></Button></div></div>;
}
