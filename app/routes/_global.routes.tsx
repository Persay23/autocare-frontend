import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'
import Home       from './_index'
import CarPark    from './carpark'
import Expenses   from './expenses'
import Timeline   from './timeline'
import Profile    from './profile'
import CreateRecord     from './records.new'
import CreateFuelEntry  from './fuel.new'

export const globalRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/',          element: <Home /> },
      { path: '/carpark',   element: <CarPark /> },
      { path: '/expenses',  element: <Expenses /> },
      { path: '/timeline',  element: <Timeline /> },
      { path: '/profile',   element: <Profile /> },
      { path: '/records/new', element: <CreateRecord /> },
      { path: '/fuel/new',    element: <CreateFuelEntry /> },
    ],
  },
]
