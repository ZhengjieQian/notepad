"use client"

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { DEFAULT_LOGIN_REDIRECT } from "@/lib/auth"

type LoginFormProps = {
  registerResult?: "success" | "error" | null
}

export function LoginForm({ registerResult = null }: LoginFormProps) {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const setFeedbackCookie = useCallback((value: "login_success" | "login_error" | null) => {
    // Write feedback cookies from the client to avoid mutating headers in a server component
    if (typeof document === "undefined") return

    const name = "register_result"
    const attributes = ["path=/", "SameSite=Lax"]

    if (window.location.protocol === "https:") {
      attributes.push("Secure")
    }

    if (value) {
      attributes.push("max-age=60")
      document.cookie = `${name}=${value}; ${attributes.join("; ")}`
      return
    }

    attributes.push("max-age=0")
    document.cookie = `${name}=; ${attributes.join("; ")}`
  }, [])

  const callbackUrl = useMemo(() => {
    const url = searchParams?.get("callbackUrl")
    return url ?? DEFAULT_LOGIN_REDIRECT
  }, [searchParams])

  useEffect(() => {
    if (!registerResult) {
      return
    }

    setFeedbackCookie(null)

    if (registerResult === "success") {
      toast({
        title: "Account created",
        description: "You can now sign in.",
      })
    } else if (registerResult === "error") {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: "Please try again.",
      })
    }
  }, [registerResult, setFeedbackCookie, toast])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    setFieldError(null)
    setFeedbackCookie(null)

    try {
      const formData = new FormData(event.currentTarget)
      const email = formData.get("email")
      const password = formData.get("password")

      if (typeof email !== "string" || typeof password !== "string") {
        throw new Error("Invalid form submission")
      }

      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      })

      if (response?.error) {
        setFieldError("Invalid email or password")
        toast({
          variant: "destructive",
          title: "Sign-in failed",
          description: response.error,
        })
        setFeedbackCookie("login_error")
        return
      }

      toast({
        title: "Welcome back",
        description: "Redirecting to your workspace...",
      })
      setFeedbackCookie("login_success")

      router.push(response?.url ?? callbackUrl)
      router.refresh()
    } catch (error) {
      console.error("Failed to sign in", error)
      setFieldError("Unable to sign in right now. Please try again later.")

      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: error instanceof Error ? error.message : "Something went wrong.",
      })
      setFeedbackCookie("login_error")
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputClass = `h-10 w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 ${
    fieldError
      ? "border-destructive focus-visible:border-destructive"
      : "border-input focus-visible:border-ring"
  }`

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6 rounded-lg border border-border bg-card p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "login-error" : undefined}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          placeholder="Enter your password"
        />
      </div>

      <Button type="submit" disabled={isSubmitting} aria-disabled={isSubmitting}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </Button>

      {fieldError ? (
        <p id="login-error" className="text-sm text-destructive" role="alert">
          {fieldError}
        </p>
      ) : null}
    </form>
  )
}
