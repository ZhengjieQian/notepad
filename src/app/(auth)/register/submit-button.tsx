"use client"

import { PropsWithChildren } from "react"
import { useFormStatus } from "react-dom"

import { Button } from "@/components/ui/button"

export function SubmitButton({ children }: PropsWithChildren) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "Creating account..." : children}
    </Button>
  )
}
