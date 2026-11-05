import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronDown, Clock, MessageCircle, Phone, ThumbsUp } from 'lucide-react'
import type { Faq, Question } from '@/types'
import { CATEGORY_MAP } from '@/data/categories'
import { HOTLINES } from '@/data/faq'
import { LESSON_MAP } from '@/data/courses'
import { relativeTime } from '@/lib/date'
import { Badge, cx } from './ui'

export function FaqItem({ faq, defaultOpen }: { faq: Faq; defaultOpen?: boolean }) {
  const nav = useNavigate()
  const [open, setOpen] = useState(!!defaultOpen)
  const c = CATEGORY_MAP[faq.category]
  return (
    <div className="overflow-hidden rounded-[20px] bg-white shadow-card">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex w-full items-start gap-3 p-4 text-left">
        <span className="grid size-7 shrink-0 place-items-center rounded-full text-[0.8125rem] font-extrabold" style={{ background: c.soft, color: c.color }}>
          Q
        </span>
        <span className="min-w-0 flex-1 pt-0.5 text-[0.9375rem] font-bold leading-snug">{faq.q}</span>
        <ChevronDown className={cx('mt-0.5 size-5 shrink-0 text-mute transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="animate-fade-in border-t border-line bg-bg/60 px-4 pb-4 pt-3">
          <p className="text-[0.9062rem] leading-relaxed text-ink/90">{faq.a}</p>
          {faq.lessonId && LESSON_MAP[faq.lessonId] && (
            <button
              onClick={() => nav(`/lesson/${faq.lessonId}`)}
              className="mt-3 flex w-full items-center gap-2.5 rounded-2xl bg-white p-3 text-left ring-1 ring-line"
            >
              <BookOpen className="size-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-[0.75rem] font-bold text-primary">{LESSON_MAP[faq.lessonId].minutes}분 레슨으로 더 알아보기</span>
                <span className="block truncate text-[0.875rem] font-bold">{LESSON_MAP[faq.lessonId].title}</span>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function QuestionCard({ q }: { q: Question }) {
  const nav = useNavigate()
  const answers = q.answers.filter((a) => a.role !== 'helper').length
  return (
    <button onClick={() => nav(`/ask/${q.id}`)} className="block w-full rounded-[20px] bg-white p-4 text-left shadow-card">
      <div className="flex items-center gap-2">
        <Badge tone="mute">{CATEGORY_MAP[q.category].short}</Badge>
        {q.mine && <Badge tone="primary">내 질문</Badge>}
        {answers === 0 && <Badge tone="sun">답변을 기다려요</Badge>}
      </div>
      <p className="mt-2 text-[0.9688rem] font-bold leading-snug">{q.title}</p>
      <p className="mt-1 line-clamp-2 text-[0.8438rem] leading-relaxed text-sub">{q.body}</p>
      <div className="mt-3 flex items-center gap-3 text-[0.75rem] font-semibold text-mute">
        <span className="truncate">{q.author}</span>
        <span className="flex items-center gap-1">
          <Clock className="size-3.5" />
          {relativeTime(q.createdAt)}
        </span>
        <span className="ml-auto flex items-center gap-1">
          <ThumbsUp className={cx('size-3.5', q.liked && 'text-primary')} />
          {q.likes}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3.5" />
          {answers}
        </span>
      </div>
    </button>
  )
}

export function Hotlines() {
  return (
    <div className="rounded-[20px] bg-white p-4 shadow-card">
      <p className="text-[0.9375rem] font-bold">전문 상담이 필요할 땐</p>
      <p className="mt-0.5 text-[0.7812rem] font-semibold text-sub">개별 상황은 공공 상담 창구에서 정확히 안내받을 수 있어요.</p>
      <div className="mt-3 space-y-2">
        {HOTLINES.map((h) => (
          <a key={h.tel} href={`tel:${h.tel}`} className="flex items-center gap-3 rounded-2xl bg-bg p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal text-white">
              <Phone className="size-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-bold">{h.name}</span>
              <span className="block text-[0.75rem] font-semibold text-sub">{h.desc}</span>
            </span>
            <span className="text-[1.0625rem] font-extrabold text-teal">{h.tel}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
