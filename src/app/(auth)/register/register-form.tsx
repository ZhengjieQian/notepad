
"use client"

import { useEffect, useActionState } from "react"

import { useToast } from "@/components/ui/use-toast"

import { registerAction } from "./actions"
import { initialRegisterState } from "./types"
import { SubmitButton } from "./submit-button"

export function RegisterForm() {
	const { toast } = useToast()
	const [state, formAction] = useActionState(registerAction, initialRegisterState)

	useEffect(() => {
		const formError = state.errors?.form?.[0]

		if (formError) {
			toast({
				variant: "destructive",
				title: "Registration failed",
				description: formError,
			})
		}
	}, [state.errors?.form?.[0], toast])

	return (
		<form
			action={formAction}
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
					aria-invalid={Boolean(state.errors?.email?.length)}
					aria-describedby={state.errors?.email?.length ? "email-error" : undefined}
					className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
					placeholder="you@example.com"
				/>
				{state.errors?.email?.length ? (
					<p id="email-error" className="text-xs text-destructive">
						{state.errors.email[0]}
					</p>
				) : null}
			</div>

			<div className="flex flex-col gap-2">
				<label htmlFor="password" className="text-sm font-medium text-foreground">
					Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					autoComplete="new-password"
					required
					aria-invalid={Boolean(state.errors?.password?.length)}
					aria-describedby={state.errors?.password?.length ? "password-error" : undefined}
					className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
					placeholder="At least 8 characters"
				/>
				{state.errors?.password?.length ? (
					<p id="password-error" className="text-xs text-destructive">
						{state.errors.password[0]}
					</p>
				) : null}
			</div>

			<SubmitButton>Create account</SubmitButton>

			{state.errors?.form?.length ? (
				<p className="text-sm text-destructive" role="alert">
					{state.errors.form[0]}
				</p>
			) : null}
		</form>
	)
}

