import Link from "next/link"
import { getServerSession } from "next-auth"

import { Button } from "@/components/ui/button"
import { authConfig } from "@/app/api/auth/[...nextauth]/route"

export default async function Home() {
  const session = await getServerSession(authConfig)

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Welcome to KnowFlow AI
        </h1>
        {session ? (
          <div className="space-y-4">
            <p className="max-w-sm text-sm text-muted-foreground">
              You have logged in. Head to your workspace to continue.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="px-8">
                <Link href="/documents">我的文档</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link href="/upload">Upload a PDF</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="px-8">
                <Link href="/user">User Menu</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="max-w-sm text-sm text-muted-foreground">
              Sign in to continue to your dashboard.
            </p>
            <Button asChild size="lg" className="px-8">
              <Link href="/login">Go to login</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  )
}
