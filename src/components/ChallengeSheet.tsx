import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check, CircleCheck, Clock, ListPlus, Sparkles, Square, SquareCheck, Undo2 } from 'lucide-react'
import type { Challenge, SlotId } from '@/types'
import { useApp } from '@/store/app'
import { LEVEL_LABEL } from '@/data/challenges'
import { SLOT_MAP, TAG_META } from '@/data/routines'
import { LESSON_MAP } from '@/data/courses'
import { todayKey } from '@/lib/date'
import { Icon } from './Icon'
import { cx, PrimaryButton, Sheet } from './ui'

export function ChallengeCard({ c, onOpen, compact }: { c: Challenge; onOpen: () => void; compact?: boolean }) {
  const doneToday = useApp((s) => s.challengeLog.some((l) => l.id === c.id && l.date === todayKey()))
  const t = TAG_META[c.tag]
  return (
    <button
      onClick={onOpen}
      className={cx('flex w-full items-center gap-3.5 rounded-[1.25rem] bg-white p-3.5 text-left shadow-card transition active:scale-[0.99]', doneToday && 'ring-2 ring-teal/30')}
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: t.soft, color: t.color }}>
        {doneToday ? <CircleCheck className="size-6 text-teal" /> : <Icon name={t.icon} className="size-6" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[0.75rem] font-bold" style={{ color: t.color }}>
          {t.name}
          <span className="text-mute">· {LEVEL_LABEL[c.level]}</span>
        </span>
        <span className={cx('mt-0.5 block text-[0.9375rem] font-bold leading-snug', doneToday && 'text-sub line-through decoration-teal/60')}>{c.title}</span>
        {!compact && <span className="mt-0.5 line-clamp-1 block text-[0.78125rem] text-sub">{c.desc}</span>}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className={cx('rounded-full px-2.5 py-1 text-[0.75rem] font-extrabold', doneToday ? 'bg-teal text-white' : 'bg-sun-50 text-[#B7860B]')}>
          {doneToday ? '완료' : `+${c.points}P`}
        </span>
        <span className="flex items-center gap-0.5 text-[0.6875rem] font-semibold text-mute">
          <Clock className="size-3" />
          {c.minutes ? `${c.minutes}분` : '틈틈이'}
        </span>
      </span>
    </button>
  )
}

export function ChallengeSheet({ challenge, onClose }: { challenge: Challenge | null; onClose: () => void }) {
  const nav = useNavigate()
  const today = todayKey()
  const complete = useApp((s) => s.completeChallenge)
  const undo = useApp((s) => s.undoChallenge)
  const addTodo = useApp((s) => s.addTodo)
  const log = useApp((s) => s.challengeLog)
  const todos = useApp((s) => s.quickTodos)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    setChecked({})
    setCelebrate(false)
  }, [challenge?.id])

  if (!challenge) return null
  const c = challenge
  const t = TAG_META[c.tag]
  const doneToday = log.some((l) => l.id === c.id && l.date === today)
  const times = log.filter((l) => l.id === c.id).length
  const inTodo = todos.some((x) => x.challengeId === c.id && x.date === today)
  const slot: SlotId = c.slot === 'any' ? 'break' : c.slot

  return (
    <Sheet
      open
      onClose={onClose}
      title="오늘의 도전"
      footer={
        doneToday ? (
          <button
            onClick={() => undo(c.id, today)}
            className="flex h-[3.75rem] w-full items-center justify-center gap-2 rounded-full bg-bg text-[1rem] font-bold text-sub ring-1 ring-line"
          >
            <Undo2 className="size-5" /> 완료 취소
          </button>
        ) : (
          <PrimaryButton
            arrow={false}
            onClick={() => {
              complete(c.id, today)
              setCelebrate(true)
            }}
          >
            <Check className="mr-1.5 size-5" strokeWidth={3} /> 해냈어요 +{c.points}P
          </PrimaryButton>
        )
      }
    >
      {celebrate && (
        <div className="mb-4 flex animate-pop items-center gap-3 rounded-2xl bg-teal p-4 text-white">
          <Sparkles className="size-6 shrink-0" />
          <p className="text-[0.9375rem] font-bold">
            +{c.points}P 적립! 작은 한 걸음이 쌓이고 있어요.
          </p>
        </div>
      )}
      <div className="rounded-[1.5rem] p-5" style={{ background: t.soft }}>
        <div className="flex items-center gap-2 text-[0.8125rem] font-bold" style={{ color: t.color }}>
          <Icon name={t.icon} className="size-4" />
          {t.name} · {LEVEL_LABEL[c.level]} · {c.minutes ? `${c.minutes}분` : '틈틈이'}
        </div>
        <h2 className="mt-2 text-[1.375rem] font-extrabold leading-snug tracking-tight">{c.title}</h2>
        <p className="mt-1.5 text-[0.9375rem] font-medium text-ink/80">{c.desc}</p>
      </div>

      <div className="mt-4 rounded-2xl bg-sun-50 p-4 text-[0.875rem] font-semibold leading-relaxed">
        <span className="font-extrabold text-[#B7860B]">왜 좋을까요? </span>
        {c.why}
      </div>

      <p className="mt-5 text-[0.8125rem] font-bold text-sub">이렇게 해 보세요</p>
      <ul className="mt-2 space-y-2">
        {c.steps.map((s, i) => (
          <li key={i}>
            <button
              onClick={() => setChecked((x) => ({ ...x, [i]: !x[i] }))}
              aria-pressed={!!checked[i]}
              className={cx(
                'flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left text-[0.9375rem] font-semibold',
                checked[i] ? 'bg-teal-50 text-teal' : 'bg-bg',
              )}
            >
              {checked[i] ? <SquareCheck className="mt-0.5 size-5 shrink-0" /> : <Square className="mt-0.5 size-5 shrink-0 text-mute" />}
              <span>
                <span className="mr-1 text-mute">{i + 1}.</span>
                {s}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-4 grid grid-cols-2 gap-2.5 pb-2">
        <button
          disabled={inTodo || doneToday}
          onClick={() => addTodo({ title: c.title, slot, date: today, challengeId: c.id })}
          className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[0.8125rem] font-bold text-primary ring-1 ring-primary/30 disabled:opacity-50"
        >
          <ListPlus className="size-4" />
          {inTodo ? '할 일에 있어요' : `${SLOT_MAP[slot].label} 할 일로`}
        </button>
        {c.lessonId && LESSON_MAP[c.lessonId] ? (
          <button
            onClick={() => nav(`/lesson/${c.lessonId}`)}
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[0.8125rem] font-bold text-ink ring-1 ring-line"
          >
            <BookOpen className="size-4" /> {LESSON_MAP[c.lessonId].minutes}분 레슨
          </button>
        ) : (
          <span className="flex h-12 items-center justify-center rounded-full bg-bg text-[0.75rem] font-semibold text-mute">
            {times > 0 ? `지금까지 ${times}번 했어요` : '처음 도전해요'}
          </span>
        )}
      </div>
    </Sheet>
  )
}
