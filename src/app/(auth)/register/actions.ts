"use server"

import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import prisma from "@/lib/prisma"
import { RegisterSchema } from "@/schemas"
import type { RegisterActionState } from "./types"

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState | never> {
  const submission = {
    email: formData.get("email"),
    password: formData.get("password"),
  }

  const parsed = RegisterSchema.safeParse(submission)

  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten()

    const cookieStore = await cookies()
    cookieStore.delete("register_result")

    return {
      errors: {
        email: fieldErrors.email,
        password: fieldErrors.password,
      },
    }
  }

  const { email, password } = parsed.data
  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60,
    path: "/",
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      cookieStore.delete("register_result")

      return {
        errors: {
          email: ["An account with this email already exists"],
        },
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    })
    cookieStore.set("register_result", "success", cookieOptions)
  } catch (error) {
    console.error("Failed to register user", error)

    cookieStore.set("register_result", "error", cookieOptions)

    return {
      errors: {
        form: ["Something went wrong while creating your account. Please try again."],
      },
    }
  }

  redirect("/login")
}
