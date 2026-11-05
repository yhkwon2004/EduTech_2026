import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellOff, CalendarClock, CircleAlert, GraduationCap, MessageCircle, RotateCcw } from 'lucide-react'
import { useApp } from '@/store/app'
import { useNotices, type Notice } from '@/store/selectors'
import { cx, EmptyState, TopBar } from '@/components/ui'

const KIND: Record<Notice['kind'], { icon: typeof CircleAlert; cls: string }> = {
  deadline: { icon: CircleAlert, cls: 'bg-coral-50 text-coral' },
  today: { icon: CalendarClock, cls: 'bg-primary-50 text-primary' },
  learn: { icon: GraduationCap, cls: 'bg-violet-50 text-violet' },
  answer: { icon: MessageCircle, cls: 'bg-teal-50 text-teal' },
  review: { icon: RotateCcw, cls: 'bg-orange-50 text-orange' },
}

export function Notifications() {
  const nav = useNavigate()
  const notices = useNotices()
  const read = useApp((s) => s.readNotifs)
  const markRead = useApp((s) => s.markRead)
  // 화면을 떠날 때 모두 읽음 처리 (들어온 순간엔 새 알림을 강조해서 보여 줌)
  useEffect(() => () => markRead(notices.map((n) => n.id)), [notices, markRead])

  return (
    <div className="min-h-dvh">
      <TopBar title="알림" />
      <div className="space-y-2.5 px-5 pb-10 pt-1">
        {notices.length === 0 ? (
          <EmptyState icon={<BellOff className="size-7" />} title="새 알림이 없어요" body="마감 일정, 학습 목표, 내 질문 답변을 여기서 알려 드려요." />
        ) : (
          notices.map((n) => {
            const k = KIND[n.kind]
            const I = k.icon
            const unread = !read.includes(n.id)
            return (
              <button key={n.id} onClick={() => nav(n.to)} className={cx('flex w-full items-start gap-3 rounded-[20px] bg-white p-4 text-left shadow-card', unread && 'ring-2 ring-primary/20')}>
                <span className={cx('grid size-11 shrink-0 place-items-center rounded-2xl', k.cls)}>
                  <I className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.9375rem] font-bold">{n.title}</span>
                    {unread && <span className="size-2 shrink-0 rounded-full bg-coral" />}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[0.8438rem] leading-relaxed text-sub">{n.body}</span>
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
