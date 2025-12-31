"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

export function SessionMenuLink() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <span className="text-sm font-medium text-muted-foreground">
        Checking session…
      </span>
    )
  }

  if (status === "authenticated") {
    const displayName = session?.user?.name

    return (
      <Link
        href="/user"
        className="text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        {displayName ? `Hi, ${displayName}` : "User Menu"}
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className="text-sm font-medium text-foreground transition-colors hover:text-primary"
    >
      Sign in
    </Link>
  )
}
