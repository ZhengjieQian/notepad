export type RegisterActionState = {
  errors?: {
    email?: string[]
    password?: string[]
    form?: string[]
  }
}

export const initialRegisterState: RegisterActionState = {}
