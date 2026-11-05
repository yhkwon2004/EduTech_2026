import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BookOpen,
  CalendarDays,
  CalendarPlus,
  ListChecks,
  ListPlus,
  MessageCircleQuestionMark,
  Plus,
  RotateCcw,
  Timer,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { cx, Sheet } from './ui'
import { useApp } from '@/store/app'
import { recommendLessons } from '@/lib/recommend'

const TABS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: '오늘', icon: ListChecks },
  { to: '/learn', label: '배움', icon: BookOpen },
  { to: '/schedule', label: '일정', icon: CalendarDays },
  { to: '/ask', label: '질문', icon: MessageCircleQuestionMark },
]

function Tab({ to, label, icon: I }: (typeof TABS)[number]) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx('flex min-w-[3.5rem] flex-col items-center gap-1 py-1 text-[0.6875rem] font-semibold transition', isActive ? 'text-primary' : 'text-mute')
      }
    >
      {({ isActive }) => (
        <>
          <I className="size-6" strokeWidth={isActive ? 2.4 : 2} fill={isActive ? 'currentColor' : 'none'} fillOpacity={isActive ? 0.12 : 0} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  )
}

export function BottomNav() {
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const { pathname } = useLocation()
  // 뒤로가기 등으로 화면이 바뀌면 시트를 닫음
  useEffect(() => setOpen(false), [pathname])
  const progress = useApp((s) => s.progress)
  const interests = useApp((s) => s.profile.interests)
  const reviewCount = useApp((s) => s.review.length)
  const rec = recommendLessons({ minutes: 3, interests, progress, limit: 1 })[0]

  const go = (to: string) => {
    setOpen(false)
    nav(to)
  }

  return (
    <>
      <nav aria-label="주요 메뉴" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <div className="pb-safe-3 pointer-events-auto w-full max-w-[440px] px-4">
          <div className="relative flex h-[4.5rem] items-center justify-around rounded-[28px] bg-white/95 px-2 shadow-nav backdrop-blur">
            <Tab {...TABS[0]} />
            <Tab {...TABS[1]} />
            <div className="w-16" />
            <Tab {...TABS[2]} />
            <Tab {...TABS[3]} />
            <button
              aria-label="빠른 실행"
              onClick={() => setOpen(true)}
              className="absolute left-1/2 top-0 grid size-[3.75rem] -translate-x-1/2 -translate-y-5 place-items-center rounded-full bg-primary text-white shadow-float ring-[6px] ring-bg transition active:scale-95"
            >
              <Plus className="size-7" strokeWidth={2.6} />
            </button>
          </div>
        </div>
      </nav>

      <Sheet open={open} onClose={() => setOpen(false)} title="빠른 실행">
        <div className="grid grid-cols-2 gap-3 pb-2">
          <QuickItem
            icon={<ListPlus className="size-6" />}
            color="bg-ink text-white"
            title="할 일 추가"
            desc="지금 시간대에 바로"
            onClick={() => go('/?add=1')}
          />
          <QuickItem
            icon={<Trophy className="size-6" />}
            color="bg-sun-50 text-[#B7860B]"
            title="오늘의 도전"
            desc="틈새에 작은 미션 하나"
            onClick={() => go('/challenges')}
          />
          <QuickItem
            icon={<Timer className="size-6" />}
            color="bg-primary text-white"
            title="지금 3분 배우기"
            desc={rec ? rec.title : '오늘의 한입 팁 보기'}
            onClick={() => go(rec ? `/lesson/${rec.id}` : '/')}
          />
          <QuickItem
            icon={<CalendarPlus className="size-6" />}
            color="bg-orange-50 text-orange"
            title="일정 추가"
            desc="발주·점검·마감 기록"
            onClick={() => go('/schedule?new=1')}
          />
          <QuickItem
            icon={<MessageCircleQuestionMark className="size-6" />}
            color="bg-teal-50 text-teal"
            title="질문하기"
            desc="궁금한 점 바로 찾기"
            onClick={() => go('/ask/new')}
          />
          <QuickItem
            icon={<RotateCcw className="size-6" />}
            color="bg-coral-50 text-coral"
            title="틀린 문제 복습"
            desc={reviewCount ? `${reviewCount}문제 남았어요` : '복습할 문제가 없어요'}
            onClick={() => go('/review')}
          />
        </div>
      </Sheet>
    </>
  )
}

function QuickItem({
  icon,
  color,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode
  color: string
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-start gap-3 rounded-[20px] bg-bg p-4 text-left ring-1 ring-line active:scale-[0.98]">
      <span className={cx('grid size-12 place-items-center rounded-2xl', color)}>{icon}</span>
      <span>
        <span className="block text-[0.9375rem] font-bold">{title}</span>
        <span className="mt-0.5 line-clamp-1 block text-[0.7812rem] text-sub">{desc}</span>
      </span>
    </button>
  )
}
