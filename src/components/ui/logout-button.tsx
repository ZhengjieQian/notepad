"use client"

import { MouseEvent, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

type LogoutButtonProps = React.ComponentProps<typeof Button> & {
  callbackUrl?: string
}

export function LogoutButton({
  callbackUrl = "/login",
  children = "Sign out",
  onClick,
  disabled,
  ...buttonProps
}: LogoutButtonProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleClick = useCallback(
    async (event: MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)

      if (event.defaultPrevented) {
        return
      }

      setIsSigningOut(true)

      try {
        const response = await signOut({
          callbackUrl,
          redirect: false,
        })

        toast({
          title: "Signed out",
          description: "Come back soon.",
        })

        router.push(response?.url ?? callbackUrl)
        router.refresh()
      } catch (error) {
        console.error("Failed to sign out", error)

        toast({
          variant: "destructive",
          title: "Sign-out failed",
          description: "Please try again.",
        })
      } finally {
        setIsSigningOut(false)
      }
    },
    [callbackUrl, onClick, router, toast]
  )

  const isDisabled = disabled ?? false

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isDisabled || isSigningOut}
      aria-disabled={isDisabled || isSigningOut}
      {...buttonProps}
    >
      {isSigningOut ? "Signing out..." : children}
    </Button>
  )
}
