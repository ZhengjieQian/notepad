"use client"

import { useCallback } from "react"

// Minimal toast hook using window.alert as a placeholder until a richer UI is added.
// Provides a consistent interface for components expecting useToast.
export type ToastOptions = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function useToast() {
  const toast = useCallback(({ title, description }: ToastOptions) => {
    const message = [title, description].filter(Boolean).join("\n")

    if (!message) return

    // Use alert for now to ensure the message surfaces to the user.
    window.alert(message)
  }, [])

  return { toast }
}
