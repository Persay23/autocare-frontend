import { type RouteObject } from 'react-router-dom'
import Login        from '@/features/auth/LoginPage'
import Register     from '@/features/auth/RegisterPage'
import ConfirmEmail from '@/features/auth/ConfirmEmailPage'

export const authRoutes: RouteObject[] = [
  { path: '/login',         element: <Login /> },
  { path: '/register',      element: <Register /> },
  { path: '/confirm-email', element: <ConfirmEmail /> },
]
