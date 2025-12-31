"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"

import { LogoutButton } from "@/components/ui/logout-button"

type UserIdentityCardProps = {
  fallbackName: string
  fallbackEmail: string
}

export function UserIdentityCard({ fallbackName, fallbackEmail }: UserIdentityCardProps) {
  const { data: session, status } = useSession()

  const name = session?.user?.name ?? fallbackName
  const email = session?.user?.email ?? fallbackEmail

  if (status === "unauthenticated") {
    return (
      <section className="rounded-xl border border-border bg-card/40 p-6 text-sm shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Session expired</h1>
        <p className="mt-2 text-muted-foreground">
          You are signed out. Please sign in again to manage your account.
        </p>
        <div className="mt-4">
          <Link
            href="/login"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Go to login
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card/40 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">User menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your account details and manage your credentials.
          </p>
        </div>
        {status === "loading" ? (
          <span className="text-sm text-muted-foreground">Syncing…</span>
        ) : null}
      </div>

      <dl className="mt-6 grid gap-4 text-sm text-foreground">
        <div>
          <dt className="font-medium text-muted-foreground">Status</dt>
          <dd className="capitalize">{status}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Name</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt className="font-medium text-muted-foreground">Email</dt>
          <dd>{email}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <LogoutButton variant="destructive" size="lg" className="sm:w-auto">
          Sign out
        </LogoutButton>
      </div>
    </section>
  )
}
