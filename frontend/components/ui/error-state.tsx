import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({ message = "We couldn't load this data.", requestId, onRetry }: { message?: string; requestId?: string; onRetry?: () => void }) {
  return <div className="glass rounded-xl border border-destructive/30 p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-destructive" aria-hidden="true" /><p className="mt-3 text-sm text-destructive">{message}</p>{requestId && <p className="mt-1 font-mono text-xs text-muted-foreground">Request ID: {requestId}</p>}{onRetry && <Button className="mt-4" variant="outline" onClick={onRetry}>Try again</Button>}</div>;
}
