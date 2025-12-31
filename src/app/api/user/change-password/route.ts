import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { z } from "zod"

import { authConfig } from "@/app/api/auth/[...nextauth]/route"
import prisma from "@/lib/prisma"

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters long"),
    confirmPassword: z
      .string()
      .min(8, "Confirm password must be at least 8 characters long"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

type ErrorResponse = {
  errors: Record<string, string>
}

type SuccessResponse = {
  message: string
}

export async function POST(request: Request) {
  const session = await getServerSession(authConfig)

  if (!session?.user?.email) {
    return NextResponse.json<ErrorResponse>(
      { errors: { form: "You must be signed in to change your password." } },
      { status: 401 }
    )
  }

  let payload: unknown

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json<ErrorResponse>(
      { errors: { form: "Invalid request body." } },
      { status: 400 }
    )
  }

  const parsed = changePasswordSchema.safeParse(payload)

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors

    return NextResponse.json<ErrorResponse>(
      {
        errors: {
          form: "Please fix the highlighted errors and try again.",
          ...(fieldErrors.currentPassword?.[0]
            ? { currentPassword: fieldErrors.currentPassword[0] }
            : {}),
          ...(fieldErrors.newPassword?.[0]
            ? { newPassword: fieldErrors.newPassword[0] }
            : {}),
          ...(fieldErrors.confirmPassword?.[0]
            ? { confirmPassword: fieldErrors.confirmPassword[0] }
            : {}),
        },
      },
      { status: 400 }
    )
  }

  const { currentPassword, newPassword } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.password) {
    return NextResponse.json<ErrorResponse>(
      {
        errors: {
          form: "Password changes are not available for this account.",
        },
      },
      { status: 400 }
    )
  }

  const matches = await bcrypt.compare(currentPassword, user.password)

  if (!matches) {
    return NextResponse.json<ErrorResponse>(
      { errors: { currentPassword: "Current password is incorrect." } },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  })

  return NextResponse.json<SuccessResponse>({
    message: "Password updated successfully.",
  })
}
