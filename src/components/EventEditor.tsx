import { useEffect, useState } from 'react'
import { Check, ExternalLink, Trash2 } from 'lucide-react'
import type { EventType, Repeat, ScheduleEvent } from '@/types'
import { EVENT_TYPES } from '@/data/categories'
import { ALL_LESSONS, LESSON_MAP } from '@/data/courses'
import { useApp } from '@/store/app'
import { formatKo, minToTime, timeToMin } from '@/lib/date'
import { Icon } from './Icon'
import { cx, PrimaryButton, Segmented, Sheet, Toggle } from './ui'
import { useNavigate } from 'react-router-dom'

const TEMPLATES: { title: string; type: EventType; repeat?: Repeat; minutes?: number }[] = [
  { title: '식자재 발주', type: 'order', repeat: 'weekly', minutes: 20 },
  { title: '재고 점검', type: 'store', repeat: 'weekly', minutes: 30 },
  { title: '위생 점검 (냉장고 온도)', type: 'store', repeat: 'daily', minutes: 10 },
  { title: '거래처 결제', type: 'order', repeat: 'monthly', minutes: 15 },
  { title: '직원 미팅', type: 'store', repeat: 'weekly', minutes: 20 },
  { title: '세금 자료 정리', type: 'deadline', repeat: 'monthly', minutes: 30 },
  { title: '리뷰 답글 달기', type: 'store', repeat: 'daily', minutes: 10 },
  { title: '3분 틈새 학습', type: 'learn', repeat: 'daily', minutes: 5 },
]

type Draft = {
  title: string
  type: EventType
  date: string
  allDay: boolean
  start: string
  end: string
  repeat: Repeat
  memo: string
  lessonId: string
}

function toDraft(e: ScheduleEvent | null, date: string): Draft {
  return {
    title: e?.title ?? '',
    type: e?.type ?? 'store',
    date: e?.date ?? date,
    allDay: e ? !e.start : false,
    start: e?.start ?? '14:00',
    end: e?.end ?? '14:30',
    repeat: e?.repeat ?? 'none',
    memo: e?.memo ?? '',
    lessonId: e?.lessonId ?? '',
  }
}

export function EventEditor({
  open,
  onClose,
  event,
  date,
  occurrenceDate,
  preset,
}: {
  open: boolean
  onClose: () => void
  event: ScheduleEvent | null
  date: string
  occurrenceDate?: string
  preset?: Partial<ScheduleEvent>
}) {
  const nav = useNavigate()
  const addEvent = useApp((s) => s.addEvent)
  const updateEvent = useApp((s) => s.updateEvent)
  const deleteEvent = useApp((s) => s.deleteEvent)
  const toggleDone = useApp((s) => s.toggleDone)
  const [d, setD] = useState<Draft>(() => toDraft(event, date))
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (open) {
      const base = toDraft(event, date)
      setD(preset ? { ...base, ...(preset as Partial<Draft>), allDay: false } : base)
      setConfirmDel(false)
    }
  }, [open, event, date, preset])

  if (!open) return null

  // 세무 달력 등 기본 제공 일정: 보기 + 완료만
  if (event?.preset) {
    const done = !!event.doneOn[event.date]
    return (
      <Sheet open={open} onClose={onClose} title="신고·마감 일정">
        <div className="rounded-[20px] bg-coral-50 p-5">
          <p className="text-[0.8125rem] font-bold text-coral">{formatKo(event.date, { weekday: true, year: true })}</p>
          <p className="mt-1 text-[1.25rem] font-extrabold">{event.title}</p>
          <p className="mt-3 whitespace-pre-line text-[0.875rem] leading-relaxed text-ink/85">{event.memo}</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <a
            href="https://www.hometax.go.kr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-1.5 rounded-full bg-white text-[0.875rem] font-bold ring-1 ring-line"
          >
            홈택스 열기 <ExternalLink className="size-4" />
          </a>
          <button
            onClick={() => nav('/lesson/l-tax-1')}
            className="flex h-12 items-center justify-center rounded-full bg-white text-[0.875rem] font-bold ring-1 ring-line"
          >
            세금 달력 레슨
          </button>
        </div>
        <div className="mt-4 pb-2">
          <PrimaryButton
            tone={done ? 'ink' : 'coral'}
            arrow={false}
            onClick={() => {
              toggleDone(event, event.date)
              onClose()
            }}
          >
            {done ? '완료 취소' : '처리 완료로 표시'}
          </PrimaryButton>
        </div>
      </Sheet>
    )
  }

  const valid = d.title.trim().length > 0 && (d.allDay || timeToMin(d.end) > timeToMin(d.start))

  const save = () => {
    if (!valid) return
    const payload = {
      title: d.title.trim(),
      type: d.type,
      date: d.date,
      start: d.allDay ? undefined : d.start,
      end: d.allDay ? undefined : d.end,
      repeat: d.repeat,
      memo: d.memo.trim() || undefined,
      lessonId: d.type === 'learn' && d.lessonId ? d.lessonId : undefined,
    }
    if (event) updateEvent(event.id, payload)
    else addEvent(payload)
    onClose()
  }

  const applyTemplate = (t: (typeof TEMPLATES)[number]) => {
    const end = minToTime(timeToMin(d.start) + (t.minutes ?? 30))
    setD({ ...d, title: t.title, type: t.type, repeat: t.repeat ?? d.repeat, end, allDay: false })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? '일정 수정' : '일정 추가'}
      footer={
        <div className="flex gap-2.5">
          {event && (
            <button
              aria-label="삭제"
              onClick={() => (confirmDel ? (deleteEvent(event.id), onClose()) : setConfirmDel(true))}
              className={cx(
                'flex h-[3.75rem] shrink-0 items-center justify-center gap-1.5 rounded-full px-5 text-[0.9375rem] font-bold transition',
                confirmDel ? 'bg-coral text-white' : 'bg-coral-50 text-coral',
              )}
            >
              <Trash2 className="size-5" />
              {confirmDel && '정말 삭제'}
            </button>
          )}
          <PrimaryButton onClick={save} disabled={!valid} arrow={false}>
            <Check className="mr-1.5 size-5" strokeWidth={3} /> 저장
          </PrimaryButton>
        </div>
      }
    >
      {event && occurrenceDate && (
        <button
          onClick={() => {
            toggleDone(event, occurrenceDate)
            onClose()
          }}
          className={cx(
            'mb-4 flex w-full items-center gap-3 rounded-2xl p-3.5 text-left text-[0.875rem] font-bold',
            event.doneOn[occurrenceDate] ? 'bg-teal-50 text-teal' : 'bg-bg text-ink',
          )}
        >
          <span className={cx('grid size-6 place-items-center rounded-full ring-2', event.doneOn[occurrenceDate] ? 'bg-teal text-white ring-teal' : 'ring-line')}>
            {event.doneOn[occurrenceDate] && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          {formatKo(occurrenceDate)} {event.doneOn[occurrenceDate] ? '완료됨 (취소하려면 누르기)' : '완료로 표시'}
        </button>
      )}

      {!event && (
        <div className="-mx-5 mb-4">
          <p className="px-5 text-[0.8125rem] font-bold text-sub">자주 쓰는 일정</p>
          <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-5">
            {TEMPLATES.map((t) => (
              <button
                key={t.title}
                onClick={() => applyTemplate(t)}
                className={cx(
                  'shrink-0 rounded-full px-3.5 py-2 text-[0.8125rem] font-bold ring-1 transition',
                  d.title === t.title ? 'bg-primary text-white ring-primary' : 'bg-white text-ink ring-line',
                )}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="block">
        <span className="text-[0.8125rem] font-bold text-sub">제목</span>
        <input
          value={d.title}
          onChange={(e) => setD({ ...d, title: e.target.value })}
          maxLength={40}
          placeholder="예: 채소 발주"
          className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none ring-primary placeholder:text-mute focus:ring-2"
        />
      </label>

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">종류</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => {
          const m = EVENT_TYPES[t]
          const on = d.type === t
          return (
            <button
              key={t}
              onClick={() => setD({ ...d, type: t })}
              aria-pressed={on}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.8125rem] font-bold ring-1 transition"
              style={on ? { background: m.color, color: 'white', borderColor: m.color, boxShadow: 'none' } : { background: m.soft, color: m.color }}
            >
              <Icon name={m.icon} className="size-4" />
              {m.label}
            </button>
          )
        })}
      </div>

      {d.type === 'learn' && (
        <label className="mt-4 block">
          <span className="text-[0.8125rem] font-bold text-sub">학습할 레슨</span>
          <select
            value={d.lessonId}
            onChange={(e) => {
              const l = LESSON_MAP[e.target.value]
              setD({
                ...d,
                lessonId: e.target.value,
                title: l ? `학습: ${l.title}` : d.title,
                end: l ? minToTime(timeToMin(d.start) + Math.max(5, l.minutes)) : d.end,
              })
            }}
            className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[0.9375rem] font-semibold outline-none"
          >
            <option value="">선택 안 함 (자유 학습)</option>
            {ALL_LESSONS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.minutes}분 · {l.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="mt-4 block">
        <span className="text-[0.8125rem] font-bold text-sub">{event && event.repeat !== 'none' ? '반복 시작일' : '날짜'}</span>
        <input
          type="date"
          value={d.date}
          onChange={(e) => e.target.value && setD({ ...d, date: e.target.value })}
          className="mt-1.5 h-13 w-full rounded-2xl bg-bg px-4 text-[1rem] font-semibold outline-none"
        />
      </label>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[0.875rem] font-bold">종일</span>
        <Toggle checked={d.allDay} onChange={(v) => setD({ ...d, allDay: v })} label="종일" />
      </div>
      {!d.allDay && (
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <label className="rounded-2xl bg-bg px-4 py-2.5">
            <span className="text-[0.75rem] font-bold text-sub">시작</span>
            <input
              type="time"
              value={d.start}
              onChange={(e) => {
                const v = e.target.value
                if (!v) return
                const dur = Math.max(10, timeToMin(d.end) - timeToMin(d.start))
                setD({ ...d, start: v, end: minToTime(timeToMin(v) + dur) })
              }}
              className="block w-full bg-transparent text-[1.125rem] font-extrabold outline-none"
            />
          </label>
          <label className="rounded-2xl bg-bg px-4 py-2.5">
            <span className="text-[0.75rem] font-bold text-sub">종료</span>
            <input
              type="time"
              value={d.end}
              onChange={(e) => e.target.value && setD({ ...d, end: e.target.value })}
              className={cx('block w-full bg-transparent text-[1.125rem] font-extrabold outline-none', timeToMin(d.end) <= timeToMin(d.start) && 'text-coral')}
            />
          </label>
        </div>
      )}

      <p className="mt-4 text-[0.8125rem] font-bold text-sub">반복</p>
      <div className="mt-1.5">
        <Segmented<Repeat>
          value={d.repeat}
          onChange={(v) => setD({ ...d, repeat: v })}
          options={[
            { value: 'none', label: '안 함' },
            { value: 'daily', label: '매일' },
            { value: 'weekly', label: '매주' },
            { value: 'monthly', label: '매월' },
          ]}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-[0.8125rem] font-bold text-sub">메모</span>
        <textarea
          value={d.memo}
          onChange={(e) => setD({ ...d, memo: e.target.value })}
          rows={3}
          maxLength={300}
          placeholder="예: 양파 2망, 대파 1단 / 거래처 010-…"
          className="mt-1.5 w-full resize-none rounded-2xl bg-bg p-4 text-[0.9375rem] outline-none ring-primary placeholder:text-mute focus:ring-2"
        />
      </label>
    </Sheet>
  )
}
