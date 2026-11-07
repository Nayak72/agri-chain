import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="glass-raised max-w-md space-y-4 rounded-2xl p-8 text-center"><p className="text-sm font-medium text-primary">404</p><h1 className="font-display text-2xl font-bold">Page not found</h1><p className="text-sm text-muted-foreground">This route does not exist or has moved.</p><Button asChild><Link href="/dashboard">Back to dashboard</Link></Button></div></main>;
}
