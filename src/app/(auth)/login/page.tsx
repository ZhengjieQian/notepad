import Link from "next/link"
import { cookies } from "next/headers"

import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const cookieStore = await cookies()
  const registerCookie = cookieStore.get("register_result")

  const registerResult =
    registerCookie?.value === "success" || registerCookie?.value === "error"
      ? (registerCookie.value as "success" | "error")
      : null

  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in to KnowFlow AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your credentials to access your account.
          </p>
        </div>

        <LoginForm registerResult={registerResult} />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}
