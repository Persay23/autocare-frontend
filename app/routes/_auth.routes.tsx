import { type RouteObject } from 'react-router-dom'
import Login    from './auth/login'
import Register from './auth/register'

export const authRoutes: RouteObject[] = [
  { path: '/login',    element: <Login /> },
  { path: '/register', element: <Register /> },
]
