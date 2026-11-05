import { useEffect } from 'react'
import { createHashRouter, Navigate, Outlet, RouterProvider, ScrollRestoration } from 'react-router-dom'
import { useApp } from '@/store/app'
import { BottomNav } from '@/components/BottomNav'
import { Onboarding } from '@/screens/Onboarding'
import { Home } from '@/screens/Home'
import { Learn } from '@/screens/Learn'
import { CourseDetail } from '@/screens/CourseDetail'
import { LessonPlayer } from '@/screens/LessonPlayer'
import { Review } from '@/screens/Review'
import { Schedule } from '@/screens/Schedule'
import { Ask } from '@/screens/Ask'
import { AskForm } from '@/screens/AskForm'
import { QuestionDetail } from '@/screens/QuestionDetail'
import { My } from '@/screens/My'
import { Notifications } from '@/screens/Notifications'
import { Search } from '@/screens/Search'
import { Challenges } from '@/screens/Challenges'
import { Routines } from '@/screens/Routines'
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
          { path: '/', element: <Home /> },
          { path: '/learn', element: <Learn /> },
          { path: '/schedule', element: <Schedule /> },
          { path: '/ask', element: <Ask /> },
          { path: '/my', element: <My /> },
        ],
      },
      { path: '/course/:id', element: <CourseDetail /> },
      { path: '/lesson/:id', element: <LessonPlayer /> },
      { path: '/review', element: <Review /> },
      { path: '/ask/new', element: <AskForm /> },
      { path: '/ask/:id', element: <QuestionDetail /> },
      { path: '/notifications', element: <Notifications /> },
      { path: '/search', element: <Search /> },
      { path: '/challenges', element: <Challenges /> },
      { path: '/routines', element: <Routines /> },
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
