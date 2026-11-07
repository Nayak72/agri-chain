"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body className="bg-[#06120E] text-[#ECFDF5]"><main className="flex min-h-screen items-center justify-center p-6 text-center"><div><h1 className="text-2xl font-bold">AgriChain is unavailable</h1><button className="mt-4 rounded-lg bg-[#34D399] px-4 py-2 text-[#04120C]" onClick={reset}>Reload</button></div></main></body></html>;
}
