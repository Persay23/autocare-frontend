import { type RouteObject } from 'react-router-dom'
import Login    from '@/features/auth/LoginPage'
import Register from '@/features/auth/RegisterPage'

export const authRoutes: RouteObject[] = [
  { path: '/login',    element: <Login /> },
  { path: '/register', element: <Register /> },
]
