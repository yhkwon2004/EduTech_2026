import { useEffect } from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom'
import { useApp } from '@/store/app'
import { BottomNav } from '@/components/BottomNav'
import { Onboarding } from '@/screens/Onboarding'
import { Home } from '@/screens/Home'
import { Learn } from '@/screens/Learn'
import { Schedule } from '@/screens/Schedule'
import { Ask } from '@/screens/Ask'
import { My } from '@/screens/My'
import { GameHub } from '@/screens/game/GameHub'
import { GameRanking } from '@/screens/game/GameRanking'
import { useReminders } from '@/lib/useReminders'

function Gate() {
  const onboarded = useApp((s) => s.onboarded)
  const largeText = useApp((s) => s.settings.largeText)
  useReminders()

  useEffect(() => {
    document.documentElement.dataset.text = largeText ? 'large' : 'normal'
  }, [largeText])

  if (!onboarded) return <Onboarding />
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}

function TabLayout() {
  return (
    <>
      <div className="with-nav">
        <Outlet />
      </div>
      <BottomNav />
    </>
  )
}

const router = createHashRouter([
  {
    element: <Gate />,
    children: [
      {
        element: <TabLayout />,
        children: [
          { path: '/', element: <GameHub /> },
          { path: '/today', element: <Home /> },
          { path: '/rank', element: <GameRanking /> },
          { path: '/learn', element: <Learn /> },
          { path: '/schedule', element: <Schedule /> },
          { path: '/ask', element: <Ask /> },
          { path: '/my', element: <My /> },
        ],
      },
      { path: '/course/:id', lazy: () => import('@/screens/CourseDetail').then((m) => ({ Component: m.CourseDetail })) },
      { path: '/lesson/:id', lazy: () => import('@/screens/LessonPlayer').then((m) => ({ Component: m.LessonPlayer })) },
      { path: '/review', lazy: () => import('@/screens/Review').then((m) => ({ Component: m.Review })) },
      { path: '/ask/new', lazy: () => import('@/screens/AskForm').then((m) => ({ Component: m.AskForm })) },
      { path: '/ask/:id', lazy: () => import('@/screens/QuestionDetail').then((m) => ({ Component: m.QuestionDetail })) },
      { path: '/notifications', lazy: () => import('@/screens/Notifications').then((m) => ({ Component: m.Notifications })) },
      { path: '/search', lazy: () => import('@/screens/Search').then((m) => ({ Component: m.Search })) },
      { path: '/challenges', lazy: () => import('@/screens/Challenges').then((m) => ({ Component: m.Challenges })) },
      { path: '/routines', lazy: () => import('@/screens/Routines').then((m) => ({ Component: m.Routines })) },
      { path: '/game/setup', lazy: () => import('@/screens/game/GameSetup').then((m) => ({ Component: m.GameSetup })) },
      { path: '/game/play', lazy: () => import('@/screens/game/GamePlay').then((m) => ({ Component: m.GamePlay })) },
      { path: '/game/result', lazy: () => import('@/screens/game/GameResult').then((m) => ({ Component: m.GameResult })) },
      { path: '/game/products', lazy: () => import('@/screens/game/GameProducts').then((m) => ({ Component: m.GameProducts })) },
      { path: '/game/invest', lazy: () => import('@/screens/game/GameInvest').then((m) => ({ Component: m.GameInvest })) },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

export default function App() {
  return (
    <div className="app-frame">
      <RouterProvider router={router} />
    </div>
  )
}
