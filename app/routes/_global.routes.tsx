import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'
import Home     from '@/features/home/HomePage'
import CarPark  from '@/features/carpark/CarparkPage'
import Expenses from '@/features/expenses/ExpenseListPage'
import Timeline from '@/features/timeline/TimelinePage'
import Profile  from '@/features/users/ProfilePage'

export const globalRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/',         element: <Home /> },
      { path: '/carpark',  element: <CarPark /> },
      { path: '/expenses', element: <Expenses /> },
      { path: '/timeline', element: <Timeline /> },
      { path: '/profile',  element: <Profile /> },
    ],
  },
]
