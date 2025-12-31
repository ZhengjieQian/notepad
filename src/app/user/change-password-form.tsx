"use client"

import { FormEvent, useCallback, useState } from "react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

const inputClassName = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"

type FieldName = "currentPassword" | "newPassword" | "confirmPassword"

type FieldErrors = Partial<Record<FieldName, string>>

type ChangePasswordResponse = {
  errors?: FieldErrors & { form?: string }
  message?: string
}

export function ChangePasswordForm() {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setIsSubmitting(true)
      setFieldErrors({})
      setFormError(null)

      const form = event.currentTarget
      const formData = new FormData(form)
      const payload = {
        currentPassword: formData.get("currentPassword") as string,
        newPassword: formData.get("newPassword") as string,
        confirmPassword: formData.get("confirmPassword") as string,
      }

      try {
        const response = await fetch("/api/user/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const data = (await response.json()) as ChangePasswordResponse

        if (!response.ok) {
          setFieldErrors({
            currentPassword: data.errors?.currentPassword,
            newPassword: data.errors?.newPassword,
            confirmPassword: data.errors?.confirmPassword,
          })
          setFormError(data.errors?.form ?? null)
          return
        }

        toast({
          title: "Password updated",
          description: "You can use your new password next time you sign in.",
        })
        form.reset()
      } catch (error) {
        console.error("Failed to change password", error)
        setFormError("Something went wrong. Please try again.")
      } finally {
        setIsSubmitting(false)
      }
    },
    [toast]
  )

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-border bg-card/40 p-6 shadow-sm"
    >
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="currentPassword">
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          className={inputClassName}
          aria-invalid={Boolean(fieldErrors.currentPassword)}
        />
        {fieldErrors.currentPassword ? (
          <p className="text-sm text-destructive">
            {fieldErrors.currentPassword}
          </p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="newPassword">
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
          aria-invalid={Boolean(fieldErrors.newPassword)}
        />
        {fieldErrors.newPassword ? (
          <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>
        ) : null}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="confirmPassword">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClassName}
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
        />
        {fieldErrors.confirmPassword ? (
          <p className="text-sm text-destructive">
            {fieldErrors.confirmPassword}
          </p>
        ) : null}
      </div>

      {formError ? (
        <p className="text-sm text-destructive">{formError}</p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
      </div>
    </form>
  )
}
