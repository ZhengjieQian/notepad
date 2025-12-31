import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome to KnowFlow AI
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Sign in to continue to your dashboard.
        </p>
        <Button asChild size="lg" className="px-8">
          <Link href="/login">Go to login</Link>
        </Button>
      </div>
    </main>
  );
}
