import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PendingApprovalPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="glass-raised w-full max-w-lg text-center">
        <CardHeader><CardTitle>Approval required</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-muted-foreground">
          <p>Your transporter account was created and is waiting for an administrator to approve it.</p>
          <Button asChild><Link href="/login">Return to sign in</Link></Button>
        </CardContent>
      </Card>
    </main>
  );
}
