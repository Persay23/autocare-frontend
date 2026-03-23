import { type RouteObject } from 'react-router-dom'
import Login from './login'
import Register from './register'

export const authRoutes: RouteObject[] = [
  { path: '/login',    element: <Login /> },
  { path: '/register', element: <Register /> },
]
