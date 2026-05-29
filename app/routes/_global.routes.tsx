import { type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/ui/layout/ProtectedRoute'
import Home           from './global/home'
import CarPark        from './global/carpark'
import Expenses       from './global/expenses/list'
import CreateExpense  from './global/expenses/create'
import ExpenseDetail  from './global/expenses/detail'
import EditExpense    from './global/expenses/edit'
import Timeline       from './global/timeline'
import Profile        from './global/profile'
import CreateRecord    from './records/create'
import CreateFuelEntry from './fuel/create'

export const globalRoutes: RouteObject[] = [
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/',             element: <Home /> },
      { path: '/carpark',      element: <CarPark /> },
      { path: '/expenses',     element: <Expenses /> },
      { path: '/expenses/new', element: <CreateExpense /> },
      { path: '/expenses/:expenseId', element: <ExpenseDetail /> },
      { path: '/expenses/:expenseId/edit', element: <EditExpense /> },
      { path: '/timeline',     element: <Timeline /> },
      { path: '/profile',      element: <Profile /> },
      { path: '/records/new',  element: <CreateRecord /> },
      { path: '/fuel/new',     element: <CreateFuelEntry /> },
    ],
  },
]
