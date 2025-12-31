import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"

import { authConfig } from "@/app/api/auth/[...nextauth]/route"
import { ChangePasswordForm } from "./change-password-form"
import { UserIdentityCard } from "./user-identity-card"

export default async function UserPage() {
  const session = await getServerSession(authConfig)

  if (!session?.user) {
    redirect("/login")
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-6 py-10">
      <UserIdentityCard
        fallbackName={session.user.name ?? "Unknown user"}
        fallbackEmail={session.user.email ?? "Not provided"}
      />

      <section>
        <h2 className="text-lg font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your password after confirming your current one.
        </p>
        <div className="mt-4">
          <ChangePasswordForm />
        </div>
      </section>
    </main>
  )
}
