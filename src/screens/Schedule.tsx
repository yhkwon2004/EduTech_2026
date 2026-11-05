import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Play,
  Plus,
  Repeat,
  Sparkles,
} from 'lucide-react'
import type { EventType, Occurrence, ScheduleEvent } from '@/types'
import { useApp } from '@/store/app'
import { useAllEvents } from '@/store/selectors'
import { EVENT_TYPES } from '@/data/categories'
import { LESSON_MAP } from '@/data/courses'
import {
  addDays,
  dDayLabel,
  formatKo,
  formatTime,
  fromKey,
  minToTime,
  monthMatrix,
  nowMin,
  timeToMin,
  todayKey,
  WEEKDAY_KO,
  weekOf,
} from '@/lib/date'
import { findGapSlots, occurrencesOn, upcomingDeadlines } from '@/lib/schedule'
import { recommendLessons } from '@/lib/recommend'
import { EventEditor } from '@/components/EventEditor'
import { Chip, cx, EmptyState } from '@/components/ui'
import { Icon } from '@/components/Icon'

const REPEAT_LABEL = { none: '', daily: '매일', weekly: '매주', monthly: '매월' }

export function Schedule() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = todayKey()
  const [selected, setSelected] = useState(params.get('date') ?? today)
  const [monthView, setMonthView] = useState(false)
  const [filter, setFilter] = useState<EventType | 'all'>('all')
  const [editor, setEditor] = useState<{ event: ScheduleEvent | null; date?: string; preset?: Partial<ScheduleEvent> } | null>(null)

  const events = useAllEvents()
  const profile = useApp((s) => s.profile)
  const progress = useApp((s) => s.progress)
  const toggleDone = useApp((s) => s.toggleDone)
  const addEvent = useApp((s) => s.addEvent)

  useEffect(() => {
    const d = params.get('date')
    if (d) setSelected(d)
    if (params.get('new')) {
      setEditor({ event: null })
      const p = new URLSearchParams(params)
      p.delete('new')
      setParams(p, { replace: true })
    }
  }, [params, setParams])

  const week = weekOf(selected)
  const sel = fromKey(selected)
  const month = monthMatrix(sel.getFullYear(), sel.getMonth())

  const dayOcc = useMemo(() => occurrencesOn(events, selected), [events, selected])
  const shown = filter === 'all' ? dayOcc : dayOcc.filter((o) => o.event.type === filter)
  const deadlines = upcomingDeadlines(events, today, 45).slice(0, 6)
  const doneCount = dayOcc.filter((o) => o.done).length

  const slots = useMemo(
    () =>
      selected < today
        ? []
        : findGapSlots({
            occurrences: dayOcc,
            openTime: profile.openTime,
            closeTime: profile.closeTime,
            bizType: profile.bizType,
            isToday: selected === today,
            nowMinutes: nowMin(),
          }),
    [dayOcc, profile, selected, today],
  )
  const slotRecs = useMemo(() => recommendLessons({ minutes: 5, interests: profile.interests, progress, limit: 3 }), [profile.interests, progress])
  const hasLearnToday = dayOcc.some((o) => o.event.type === 'learn')

  const dotsFor = (key: string) => {
    const types = new Set(occurrencesOn(events, key).map((o) => o.event.type))
    return (['deadline', 'learn', 'order', 'store', 'personal'] as EventType[]).filter((t) => types.has(t)).slice(0, 3)
  }

  const putLearning = (slotStart: string, lessonId: string) => {
    const l = LESSON_MAP[lessonId]
    addEvent({
      title: `학습: ${l.title}`,
      date: selected,
      start: slotStart,
      end: minToTime(timeToMin(slotStart) + Math.max(5, l.minutes)),
      type: 'learn',
      repeat: 'none',
      lessonId,
    })
  }

  const open = (o: Occurrence) => setEditor({ event: o.event, date: o.date })

  return (
    <div className="pt-safe">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <div>
          <h1 className="text-[1.625rem] font-extrabold tracking-tight">일정</h1>
          <button onClick={() => setMonthView(!monthView)} className="mt-0.5 flex items-center gap-1 text-[0.875rem] font-bold text-sub">
            {sel.getFullYear()}년 {sel.getMonth() + 1}월
            <ChevronDown className={cx('size-4 transition', monthView && 'rotate-180')} />
          </button>
        </div>
        <div className="flex gap-2">
          {selected !== today && (
            <button onClick={() => setSelected(today)} className="h-11 rounded-full bg-white px-4 text-[0.875rem] font-bold text-primary shadow-card">
              오늘
            </button>
          )}
          <button
            aria-label="일정 추가"
            onClick={() => setEditor({ event: null })}
            className="grid size-11 place-items-center rounded-full bg-primary text-white shadow-float"
          >
            <Plus className="size-6" />
          </button>
        </div>
      </header>

      {/* 주간 스트립 / 월간 달력 */}
      <div className="px-4">
        <div className="rounded-[24px] bg-white p-3 shadow-card">
          {monthView ? (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <button
                  aria-label="이전 달"
                  onClick={() => setSelected(formatMonthShift(selected, -1))}
                  className="grid size-9 place-items-center rounded-full hover:bg-bg"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-[0.9375rem] font-bold">
                  {sel.getFullYear()}년 {sel.getMonth() + 1}월
                </span>
                <button
                  aria-label="다음 달"
                  onClick={() => setSelected(formatMonthShift(selected, 1))}
                  className="grid size-9 place-items-center rounded-full hover:bg-bg"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
              <div className="grid grid-cols-7 text-center text-[0.6875rem] font-bold text-mute">
                {WEEKDAY_KO.map((w, i) => (
                  <span key={w} className={cx('py-1', i === 0 && 'text-coral', i === 6 && 'text-primary')}>
                    {w}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-y-1">
                {month.map((k) => {
                  const d = fromKey(k)
                  const inMonth = d.getMonth() === sel.getMonth()
                  const isSel = k === selected
                  return (
                    <button
                      key={k}
                      onClick={() => {
                        setSelected(k)
                        setMonthView(false)
                      }}
                      className={cx('flex flex-col items-center gap-0.5 rounded-xl py-1.5', !inMonth && 'opacity-30')}
                    >
                      <span
                        className={cx(
                          'grid size-8 place-items-center rounded-full text-[0.875rem] font-bold',
                          isSel ? 'bg-primary text-white' : k === today ? 'text-primary ring-1 ring-primary' : 'text-ink',
                        )}
                      >
                        {d.getDate()}
                      </span>
                      <span className="flex h-1.5 gap-0.5">
                        {dotsFor(k).map((t) => (
                          <span key={t} className="size-1.5 rounded-full" style={{ background: EVENT_TYPES[t].color }} />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1">
              <button aria-label="이전 주" onClick={() => setSelected(addDays(selected, -7))} className="grid size-8 shrink-0 place-items-center rounded-full text-mute">
                <ChevronLeft className="size-5" />
              </button>
              <div className="grid flex-1 grid-cols-7 gap-1">
                {week.map((k) => {
                  const d = fromKey(k)
                  const isSel = k === selected
                  return (
                    <button
                      key={k}
                      onClick={() => setSelected(k)}
                      aria-pressed={isSel}
                      className={cx(
                        'flex flex-col items-center gap-1 rounded-[18px] py-2.5 transition',
                        isSel ? 'bg-primary text-white shadow-float' : 'text-ink',
                      )}
                    >
                      <span className={cx('text-[0.6875rem] font-bold', isSel ? 'text-white/80' : d.getDay() === 0 ? 'text-coral' : 'text-mute')}>
                        {WEEKDAY_KO[d.getDay()]}
                      </span>
                      <span className={cx('text-[1.0625rem] font-extrabold', !isSel && k === today && 'text-primary')}>{d.getDate()}</span>
                      <span className="flex h-1.5 gap-0.5">
                        {dotsFor(k).map((t) => (
                          <span key={t} className="size-1.5 rounded-full" style={{ background: isSel ? 'white' : EVENT_TYPES[t].color }} />
                        ))}
                      </span>
                    </button>
                  )
                })}
              </div>
              <button aria-label="다음 주" onClick={() => setSelected(addDays(selected, 7))} className="grid size-8 shrink-0 place-items-center rounded-full text-mute">
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 다가오는 마감 */}
      {deadlines.length > 0 && (
        <section className="mt-5">
          <p className="px-5 text-[0.8125rem] font-bold text-sub">다가오는 신고·마감</p>
          <div className="no-scrollbar mt-2 flex gap-2.5 overflow-x-auto px-5 pb-1">
            {deadlines.map((o) => (
              <button
                key={o.event.id + o.date}
                onClick={() => setSelected(o.date)}
                className="w-[10.625rem] shrink-0 rounded-[18px] bg-white p-3.5 text-left shadow-card"
              >
                <span className="rounded-full bg-coral px-2 py-0.5 text-[0.6875rem] font-extrabold text-white">{dDayLabel(today, o.date)}</span>
                <span className="mt-2 line-clamp-2 block text-[0.875rem] font-bold leading-snug">{o.event.title}</span>
                <span className="mt-1 block text-[0.75rem] font-semibold text-mute">{formatKo(o.date)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 선택한 날 */}
      <section className="mt-6">
        <div className="flex items-end justify-between px-5">
          <div>
            <h2 className="text-[1.1875rem] font-bold tracking-tight">{selected === today ? '오늘' : formatKo(selected)}</h2>
            <p className="text-[0.8125rem] font-semibold text-sub">
              {dayOcc.length ? `${dayOcc.length}개 중 ${doneCount}개 완료` : '등록된 일정이 없어요'}
            </p>
          </div>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip size="sm" active={filter === 'all'} onClick={() => setFilter('all')}>
            전체
          </Chip>
          {(Object.keys(EVENT_TYPES) as EventType[]).map((t) => (
            <Chip size="sm" key={t} active={filter === t} onClick={() => setFilter(t)}>
              {EVENT_TYPES[t].label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 space-y-2.5 px-5">
          {shown.length === 0 ? (
            <div className="rounded-[20px] bg-white shadow-card">
              <EmptyState
                icon={<CalendarDays className="size-7" />}
                title="일정이 비어 있어요"
                body="발주·점검·마감 같은 일을 넣어 두면 잊지 않고, 빈 시간엔 학습을 추천해 드려요."
                action={
                  <button
                    onClick={() => setEditor({ event: null, date: selected })}
                    className="h-12 w-full rounded-full bg-primary text-[0.9375rem] font-bold text-white"
                  >
                    일정 추가
                  </button>
                }
              />
            </div>
          ) : (
            shown.map((o) => {
              const t = EVENT_TYPES[o.event.type]
              return (
                <div key={o.event.id} className="flex items-stretch gap-3">
                  <div className="w-[3.25rem] shrink-0 pt-4 text-right">
                    <p className={cx('text-[0.8125rem] font-extrabold', o.done ? 'text-mute' : 'text-ink')}>{o.event.start ?? '종일'}</p>
                    {o.event.end && <p className="text-[0.6875rem] font-semibold text-mute">{o.event.end}</p>}
                  </div>
                  <div className={cx('flex min-w-0 flex-1 items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-card', o.done && 'opacity-60')}>
                    <span className="w-1 self-stretch rounded-full" style={{ background: t.color }} />
                    <button className="min-w-0 flex-1 text-left" onClick={() => open(o)}>
                      <span className="flex items-center gap-1.5 text-[0.7188rem] font-bold" style={{ color: t.color }}>
                        <Icon name={t.icon} className="size-3.5" />
                        {t.label}
                        {o.event.repeat !== 'none' && (
                          <span className="flex items-center gap-0.5 text-mute">
                            · <Repeat className="size-3" />
                            {REPEAT_LABEL[o.event.repeat]}
                          </span>
                        )}
                      </span>
                      <span className={cx('mt-0.5 block truncate text-[0.9375rem] font-bold', o.done && 'line-through')}>{o.event.title}</span>
                      {o.event.memo && <span className="block truncate text-[0.7812rem] font-medium text-sub">{o.event.memo.split('\n')[0]}</span>}
                    </button>
                    {o.event.lessonId && !o.done && (
                      <button
                        aria-label="학습 시작"
                        onClick={() => nav(`/lesson/${o.event.lessonId}`)}
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-violet text-white"
                      >
                        <Play className="size-4 translate-x-px" fill="currentColor" />
                      </button>
                    )}
                    <button
                      aria-label={o.done ? '완료 취소' : '완료'}
                      onClick={() => toggleDone(o.event, o.date)}
                      className={cx(
                        'grid size-8 shrink-0 place-items-center rounded-full ring-2 transition',
                        o.done ? 'bg-teal text-white ring-teal' : 'ring-line',
                      )}
                    >
                      {o.done && <Check className="size-4" strokeWidth={3} />}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* 틈새 학습 추천 */}
      {slots.length > 0 && slotRecs.length > 0 && (
        <section className="mt-7 px-5">
          <div className="rounded-[24px] bg-gradient-to-br from-violet-50 to-primary-50 p-4 ring-1 ring-violet/15">
            <p className="flex items-center gap-1.5 text-[0.9375rem] font-extrabold">
              <Sparkles className="size-5 text-violet" /> 틈새 시간에 3분 배우기
            </p>
            <p className="mt-1 text-[0.8125rem] font-semibold text-sub">
              {hasLearnToday ? '이미 학습 일정이 있어요. 더 넣고 싶다면 골라 보세요.' : '일정 사이 빈 시간을 찾았어요. 눌러서 바로 넣어 보세요.'}
            </p>
            <div className="mt-3 space-y-2">
              {slots.map((s, i) => {
                const l = slotRecs[i % slotRecs.length]
                return (
                  <div key={s.start} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                    <div className="grid w-14 shrink-0 place-items-center rounded-xl bg-violet-50 py-2 text-violet">
                      <Clock className="size-4" />
                      <span className="mt-0.5 text-[0.75rem] font-extrabold">{s.start}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.75rem] font-bold text-violet">
                        {s.label} · {s.minutes >= 60 ? `${Math.floor(s.minutes / 60)}시간${s.minutes % 60 ? ` ${s.minutes % 60}분` : ''}` : `${s.minutes}분`} 여유
                      </p>
                      <p className="truncate text-[0.875rem] font-bold">{l.title}</p>
                      <p className="text-[0.75rem] font-semibold text-mute">{l.minutes}분 레슨</p>
                    </div>
                    <button
                      onClick={() => putLearning(s.start, l.id)}
                      className="h-9 shrink-0 rounded-full bg-violet px-3.5 text-[0.8125rem] font-bold text-white"
                    >
                      넣기
                    </button>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[0.7188rem] font-semibold text-mute">
              영업시간 {formatTime(profile.openTime)} ~ {formatTime(profile.closeTime)} 기준 · 마이 탭에서 바꿀 수 있어요
            </p>
          </div>
        </section>
      )}

      <EventEditor
        open={!!editor}
        onClose={() => setEditor(null)}
        event={editor?.event ?? null}
        date={selected}
        occurrenceDate={editor?.date}
        preset={editor?.preset}
      />
    </div>
  )
}

function formatMonthShift(key: string, delta: number): string {
  const d = fromKey(key)
  const target = new Date(d.getFullYear(), d.getMonth() + delta, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(d.getDate(), last))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`
}
