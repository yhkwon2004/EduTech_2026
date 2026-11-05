import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowRightLeft,
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Ellipsis,
  Flame,
  Lightbulb,
  ListChecks,
  MessageCircle,
  Play,
  Plus,
  CalendarDays,
  Settings2,
  Shuffle,
  ThumbsUp,
  Trash2,
  Trophy,
} from 'lucide-react'
import type { Challenge, SlotId } from '@/types'
import { useApp } from '@/store/app'
import { useAllEvents, useToday, useUnreadCount } from '@/store/selectors'
import { CATEGORY_MAP } from '@/data/categories'
import { CHALLENGES } from '@/data/challenges'
import { COURSES, courseMinutes, LESSON_MAP } from '@/data/courses'
import { SLOT_MAP, TAG_META } from '@/data/routines'
import { tipOfDay } from '@/data/tips'
import { courseProgress, inProgressCourses, nextLessonOf, recommendLessons } from '@/lib/recommend'
import { streak } from '@/lib/stats'
import { addDays, dDayLabel, formatKo, fromKey, greeting, nowMin, relativeTime, todayKey, WEEKDAY_KO } from '@/lib/date'
import { occurrencesOn, upcomingDeadlines } from '@/lib/schedule'
import {
  buildToday,
  carryOverTodos,
  currentSlot,
  dailyChallenges,
  rankFor,
  slotLabelTime,
  totalPoints,
  type TodayItem,
} from '@/lib/today'
import { Icon } from '@/components/Icon'
import { ChallengeCard, ChallengeSheet } from '@/components/ChallengeSheet'
import { Badge, CategoryTag, cx, ProgressBar, ProgressRing, SectionHeader, Thumb } from '@/components/ui'

const GAP_MINUTES = [1, 3, 5, 10]

export function Home() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const today = todayKey()
  const now = new Date()

  const profile = useApp((s) => s.profile)
  const progress = useApp((s) => s.progress)
  const logs = useApp((s) => s.logs)
  const taskDone = useApp((s) => s.taskDone)
  const quickTodos = useApp((s) => s.quickTodos)
  const challengeLog = useApp((s) => s.challengeLog)
  const shuffleN = useApp((s) => s.challengeShuffle[today] ?? 0)
  const questions = useApp((s) => s.questions)
  const toggleTask = useApp((s) => s.toggleTask)
  const toggleDone = useApp((s) => s.toggleDone)
  const addTodo = useApp((s) => s.addTodo)
  const updateTodo = useApp((s) => s.updateTodo)
  const deleteTodo = useApp((s) => s.deleteTodo)
  const shuffle = useApp((s) => s.shuffleChallenges)
  const events = useAllEvents()
  const unread = useUnreadCount()
  const { ranges, items, routines } = useToday(today)

  const nowSlot = currentSlot(ranges, nowMin(now))
  const [slot, setSlot] = useState<SlotId>(nowSlot)
  const [draft, setDraft] = useState('')
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [openChallenge, setOpenChallenge] = useState<Challenge | null>(null)
  const [gap, setGap] = useState(3)
  const addRef = useRef<HTMLInputElement>(null)
  const tabsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [slot])

  // 빠른 실행 → "할 일 추가"로 들어오면 입력창에 바로 커서
  useEffect(() => {
    if (params.get('add')) {
      setSlot(nowSlot)
      setTimeout(() => addRef.current?.focus(), 50)
      setParams({}, { replace: true })
    }
  }, [params, setParams, nowSlot])

  const done = items.filter((i) => i.done).length
  const ratio = items.length ? done / items.length : 0
  const slotItems = items.filter((i) => i.slot === slot)
  const slotRange = ranges.find((r) => r.id === slot) ?? ranges[0]
  const carry = carryOverTodos(quickTodos, taskDone, today)
  const deadline = upcomingDeadlines(events, today, 14)[0]
  const picks = useMemo(
    // 오늘 완료한 기록은 제외 조건에 들어가지 않아서, 완료해도 오늘의 3개는 그대로 유지돼요
    () => dailyChallenges({ date: today, interests: profile.interests, log: challengeLog, shuffle: shuffleN }),
    [today, profile.interests, challengeLog, shuffleN],
  )
  const points = totalPoints(challengeLog, taskDone)
  const rank = rankFor(points)
  const picksDone = picks.filter((c) => challengeLog.some((l) => l.id === c.id && l.date === today)).length

  const week = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(today, i - 6)
        const list =
          date === today
            ? items
            : buildToday({
                date,
                ranges,
                routines,
                todos: quickTodos,
                occurrences: occurrencesOn(events, date),
                doneKeys: taskDone[date] ?? [],
                learnedToday: logs.some((l) => l.date === date),
              })
        const d = list.filter((x) => x.done).length
        return { date, ratio: list.length ? d / list.length : 0 }
      }),
    [today, items, ranges, routines, quickTodos, events, taskDone, logs],
  )
  const weekChallenges = challengeLog.filter((l) => l.date >= addDays(today, -6)).length

  const toggle = (it: TodayItem) => {
    if (it.kind === 'event') {
      const ev = events.find((e) => e.id === it.sourceId)
      if (ev) toggleDone(ev, today)
    } else toggleTask(today, it.key)
  }

  const submitTodo = () => {
    const t = draft.trim()
    if (!t) return
    addTodo({ title: t, slot, date: today })
    setDraft('')
  }

  // 틈새 시간 추천
  const gapTodos = items
    .filter((i) => !i.done && !i.auto && i.minutes !== undefined && i.minutes > 0 && i.minutes <= gap && (i.slot === nowSlot || i.slot === 'break'))
    .slice(0, 2)
  const gapChallenge =
    picks.find((c) => c.minutes <= gap && !challengeLog.some((l) => l.id === c.id && l.date === today)) ??
    CHALLENGES.find((c) => c.minutes > 0 && c.minutes <= gap && !challengeLog.some((l) => l.id === c.id && l.date === today))
  const gapLesson = gap >= 2 ? recommendLessons({ minutes: gap, interests: profile.interests, progress, limit: 1 })[0] : undefined
  const tip = tipOfDay(now)

  const ongoing = inProgressCourses(progress)
  const popularQ = [...questions].sort((a, b) => b.likes - a.likes).slice(0, 2)
  const featured = [...COURSES].sort(
    (a, b) => Number(profile.interests.includes(b.category)) - Number(profile.interests.includes(a.category)),
  )
  const st = streak(logs, today)

  return (
    <div className="pt-safe">
      {/* 헤더 */}
      <header className="flex items-start justify-between px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p className="text-[0.875rem] font-semibold text-sub">
            {formatKo(today)} · {greeting(now)}
          </p>
          <h1 className="mt-1 truncate text-[1.625rem] font-extrabold tracking-tight">{profile.name} 사장님</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button aria-label="일정" onClick={() => nav('/schedule')} className="grid size-11 place-items-center rounded-full bg-white text-ink shadow-card">
            <CalendarDays className="size-5" />
          </button>
          <button
            aria-label={`알림 ${unread}개`}
            onClick={() => nav('/notifications')}
            className="relative grid size-11 place-items-center rounded-full bg-white text-ink shadow-card"
          >
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[0.6875rem] font-bold text-white ring-2 ring-bg">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          <button
            aria-label="마이페이지"
            onClick={() => nav('/my')}
            className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-primary to-primary-700 text-[1rem] font-bold text-white shadow-card"
          >
            {profile.name.slice(0, 1)}
          </button>
        </div>
      </header>

      {/* 오늘 할 일 요약 */}
      <section className="px-5">
        <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#3D8BFF] via-primary to-primary-700 p-5 text-white shadow-float">
          <span className="absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <span className="absolute -bottom-16 left-16 size-36 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-white/80">
                <ListChecks className="size-4" /> 오늘 할 일
              </p>
              <h2 className="mt-1 text-[1.375rem] font-extrabold leading-snug tracking-tight">
                {items.length === 0
                  ? '오늘은 여유로운 날'
                  : ratio === 1
                    ? '오늘 할 일 끝! 수고하셨어요'
                    : ratio >= 0.7
                      ? '거의 다 왔어요!'
                      : ratio > 0
                        ? '좋아요, 하나씩 계속!'
                        : '오늘도 하나씩 해 볼까요?'}
              </h2>
              <p className="mt-0.5 text-[0.8125rem] font-semibold text-white/80">
                {items.length}개 중 {done}개 완료
              </p>
            </div>
            <ProgressRing value={ratio} size={76} stroke={8} color="#FFFFFF" track="rgba(255,255,255,0.22)">
              <span className="text-[1.125rem] font-extrabold">{Math.round(ratio * 100)}%</span>
            </ProgressRing>
          </div>
          <button
            onClick={() => setSlot(nowSlot)}
            className="relative mt-4 flex w-full items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 text-left ring-1 ring-white/25"
          >
            <Icon name={SLOT_MAP[nowSlot].icon} className="size-5 shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.9375rem] font-bold">지금은 {SLOT_MAP[nowSlot].label}</span>
              <span className="block truncate text-[0.75rem] font-semibold text-white/75">
                {SLOT_MAP[nowSlot].hint} · 남은 일 {items.filter((i) => i.slot === nowSlot && !i.done).length}개
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 opacity-70" />
          </button>
          {(deadline || carry.length > 0) && (
            <div className="relative mt-2.5 flex flex-wrap gap-2">
              {deadline && (
                <button
                  onClick={() => nav(`/schedule?date=${deadline.date}`)}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.75rem] font-bold text-ink"
                >
                  <span className="rounded-full bg-coral px-1.5 py-0.5 text-[0.6875rem] font-extrabold text-white">{dDayLabel(today, deadline.date)}</span>
                  {deadline.event.title}
                </button>
              )}
              {carry.length > 0 && (
                <button
                  onClick={() => carry.forEach((t) => updateTodo(t.id, { date: today }))}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[0.75rem] font-bold text-primary"
                >
                  <ArrowRightLeft className="size-3.5" /> 못 끝낸 일 {carry.length}개 오늘로
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 시간대 탭 */}
      <section className="mt-5">
        <div ref={tabsRef} className="no-scrollbar flex gap-2 overflow-x-auto px-5 pb-1 pt-1.5" role="tablist" aria-label="시간대">
          {ranges.map((r) => {
            const list = items.filter((i) => i.slot === r.id)
            const left = list.filter((i) => !i.done).length
            const on = slot === r.id
            return (
              <button
                key={r.id}
                role="tab"
                aria-selected={on}
                onClick={() => setSlot(r.id)}
                className={cx(
                  'relative flex shrink-0 items-center gap-1.5 rounded-full py-2.5 pl-3.5 pr-4 text-[0.875rem] font-bold transition',
                  on ? 'bg-ink text-white shadow-card' : 'bg-white text-sub ring-1 ring-line',
                )}
              >
                <Icon name={r.icon} className="size-4" />
                {r.short}
                {list.length > 0 && (
                  <span
                    className={cx(
                      'grid min-w-5 place-items-center rounded-full px-1 text-[0.6875rem] font-extrabold',
                      left === 0 ? 'bg-teal text-white' : on ? 'bg-white/20' : 'bg-bg text-ink',
                    )}
                  >
                    {left === 0 ? <Check className="size-3" strokeWidth={3.5} /> : left}
                  </span>
                )}
                {r.id === nowSlot && <span className="absolute -top-1 right-2 size-2.5 rounded-full bg-coral ring-2 ring-bg" aria-label="지금" />}
              </button>
            )
          })}
        </div>

        <div className="mt-3 px-5">
          <div className="overflow-hidden rounded-[1.25rem] bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div>
                <p className="text-[1rem] font-extrabold">
                  {SLOT_MAP[slot].label}
                  {slot === nowSlot && <span className="ml-1.5 rounded-full bg-coral-50 px-2 py-0.5 text-[0.6875rem] font-bold text-coral">지금</span>}
                </p>
                <p className="text-[0.75rem] font-semibold text-mute">
                  {slotLabelTime(slotRange)} · {SLOT_MAP[slot].hint}
                </p>
              </div>
              <button onClick={() => nav('/routines')} className="flex items-center gap-1 text-[0.75rem] font-bold text-sub">
                <Settings2 className="size-4" /> 루틴 관리
              </button>
            </div>

            {slotItems.length === 0 && (
              <p className="px-4 py-5 text-center text-[0.875rem] font-semibold text-mute">이 시간엔 정해진 할 일이 없어요. 아래에 추가해 보세요.</p>
            )}
            {slotItems.map((it) => {
              const tag = it.tag ? TAG_META[it.tag] : undefined
              return (
                <div key={it.key} className="border-b border-line last:border-0">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      aria-label={it.done ? `${it.title} 완료 취소` : `${it.title} 완료`}
                      onClick={() => toggle(it)}
                      className={cx(
                        'grid size-7 shrink-0 place-items-center rounded-full ring-2 transition active:scale-90',
                        it.done ? 'bg-teal text-white ring-teal' : 'ring-line',
                      )}
                    >
                      {it.done && <Check className="size-4" strokeWidth={3} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={cx('text-[0.9375rem] font-bold leading-snug', it.done && 'text-mute line-through')}>{it.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.71875rem] font-semibold text-mute">
                        {tag && (
                          <span className="font-bold" style={{ color: tag.color }}>
                            {tag.name}
                          </span>
                        )}
                        {it.time && <span>{it.time}</span>}
                        {it.minutes !== undefined && it.minutes > 0 && <span>{it.minutes}분</span>}
                        {it.freq === 'weekly' && <span className="text-violet">매주</span>}
                        {it.freq === 'monthly' && <span className="text-violet">매월</span>}
                        {it.kind === 'event' && <span>일정</span>}
                        {it.kind === 'todo' && <span>{it.challengeId ? '도전' : '오늘만'}</span>}
                      </p>
                      {it.tip && !it.done && <p className="mt-1 text-[0.75rem] leading-relaxed text-sub">{it.tip}</p>}
                    </div>
                    {it.auto === 'learn' && !it.done ? (
                      <button
                        onClick={() => {
                          const r = recommendLessons({ minutes: 4, interests: profile.interests, progress, limit: 1 })[0]
                          nav(r ? `/lesson/${r.id}` : '/learn')
                        }}
                        className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-violet px-3 text-[0.75rem] font-bold text-white"
                      >
                        <Play className="size-3.5" fill="currentColor" /> 시작
                      </button>
                    ) : it.lessonId && !it.done ? (
                      <button
                        aria-label="관련 레슨"
                        onClick={() => nav(`/lesson/${it.lessonId}`)}
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary"
                      >
                        <BookOpen className="size-4" />
                      </button>
                    ) : null}
                    {it.kind === 'todo' && (
                      <button
                        aria-label="더보기"
                        onClick={() => setMenuFor(menuFor === it.key ? null : it.key)}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-mute"
                      >
                        <Ellipsis className="size-5" />
                      </button>
                    )}
                  </div>
                  {menuFor === it.key && (
                    <div className="flex animate-fade-in gap-2 px-4 pb-3 pl-14">
                      <button
                        onClick={() => {
                          updateTodo(it.sourceId, { date: addDays(today, 1) })
                          setMenuFor(null)
                        }}
                        className="flex h-8 items-center gap-1 rounded-full bg-bg px-3 text-[0.75rem] font-bold text-ink"
                      >
                        <ArrowRightLeft className="size-3.5" /> 내일로 미루기
                      </button>
                      <button
                        onClick={() => {
                          deleteTodo(it.sourceId)
                          setMenuFor(null)
                        }}
                        className="flex h-8 items-center gap-1 rounded-full bg-coral-50 px-3 text-[0.75rem] font-bold text-coral"
                      >
                        <Trash2 className="size-3.5" /> 삭제
                      </button>
                    </div>
                  )}
                </div>
              )
            })}

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitTodo()
              }}
              className="flex items-center gap-2 bg-bg/60 px-3 py-2.5"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-50 text-primary">
                <Plus className="size-4" />
              </span>
              <input
                ref={addRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={40}
                placeholder={`${SLOT_MAP[slot].label}에 할 일 추가`}
                aria-label="할 일 추가"
                className="h-10 min-w-0 flex-1 bg-transparent text-[0.9375rem] font-semibold outline-none placeholder:font-medium placeholder:text-mute"
              />
              {draft.trim() && (
                <button type="submit" className="h-9 shrink-0 rounded-full bg-primary px-4 text-[0.8125rem] font-bold text-white">
                  추가
                </button>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* 오늘의 도전 */}
      <section className="mt-7">
        <div className="mb-3 flex items-end justify-between px-5">
          <div>
            <h2 className="text-[1.1875rem] font-bold tracking-tight">오늘의 도전</h2>
            <p className="text-[0.75rem] font-semibold text-sub">쉬는 시간·점심 틈에 하나씩 · {picksDone}/3 완료</p>
          </div>
          <button
            onClick={() => shuffle(today)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] font-bold text-primary shadow-card"
          >
            <Shuffle className="size-4" /> 다른 도전
          </button>
        </div>
        <div className="space-y-2.5 px-5">
          {picks.map((c) => (
            <ChallengeCard key={c.id} c={c} onOpen={() => setOpenChallenge(c)} />
          ))}
          <button
            onClick={() => nav('/challenges')}
            className="flex w-full items-center gap-3 rounded-[1.25rem] bg-sun-50 px-4 py-3.5 text-left ring-1 ring-sun/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun text-ink">
              <Trophy className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-extrabold">
                {rank.name} · {points}P
              </span>
              <span className="mt-1 block">
                <ProgressBar value={rank.progress} color="bg-sun" />
              </span>
              <span className="mt-1 block text-[0.6875rem] font-semibold text-sub">
                {rank.next ? `다음 단계 '${rank.next.name}'까지 ${rank.next.min - points}P` : '최고 단계예요!'} · 도전 {CHALLENGES.length}개 전체 보기
              </span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-mute" />
          </button>
        </div>
      </section>

      {/* 틈새 시간 */}
      <section className="mt-7 px-5">
        <div className="rounded-[1.5rem] bg-white p-4 shadow-card">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-primary">
            <Clock className="size-4" /> 틈새 시간
          </p>
          <h2 className="mt-0.5 text-[1.1875rem] font-extrabold tracking-tight">손님 없는 지금, 몇 분 있으세요?</h2>
          <div className="mt-3 grid grid-cols-4 gap-2" role="radiogroup" aria-label="가용 시간">
            {GAP_MINUTES.map((m) => (
              <button
                key={m}
                role="radio"
                aria-checked={gap === m}
                onClick={() => setGap(m)}
                className={cx(
                  'h-11 rounded-full text-[0.9375rem] font-extrabold transition',
                  gap === m ? 'bg-primary text-white shadow-float' : 'bg-bg text-ink ring-1 ring-line',
                )}
              >
                {m}분
              </button>
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {gapTodos.map((it) => (
              <button
                key={it.key}
                onClick={() => toggle(it)}
                className="flex w-full items-center gap-3 rounded-2xl bg-bg px-3.5 py-3 text-left"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full ring-2 ring-line" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-bold text-teal">할 일 · {it.minutes}분</span>
                  <span className="block truncate text-[0.875rem] font-bold">{it.title}</span>
                </span>
              </button>
            ))}
            {gapChallenge && (
              <button
                onClick={() => setOpenChallenge(gapChallenge)}
                className="flex w-full items-center gap-3 rounded-2xl bg-sun-50 px-3.5 py-3 text-left"
              >
                <Trophy className="size-5 shrink-0 text-[#B7860B]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-bold text-[#B7860B]">
                    도전 · {gapChallenge.minutes}분 · +{gapChallenge.points}P
                  </span>
                  <span className="block truncate text-[0.875rem] font-bold">{gapChallenge.title}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-mute" />
              </button>
            )}
            {gapLesson ? (
              <button
                onClick={() => nav(`/lesson/${gapLesson.id}`)}
                className="flex w-full items-center gap-3 rounded-2xl bg-primary-50 px-3.5 py-3 text-left"
              >
                <Play className="size-5 shrink-0 text-primary" fill="currentColor" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-bold text-primary">레슨 · {gapLesson.minutes}분 · 듣기 가능</span>
                  <span className="block truncate text-[0.875rem] font-bold">{gapLesson.title}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-mute" />
              </button>
            ) : (
              <button
                onClick={() => tip.lessonId && nav(`/lesson/${tip.lessonId}`)}
                className="flex w-full items-start gap-3 rounded-2xl bg-sun-50/60 px-3.5 py-3 text-left"
              >
                <Lightbulb className="mt-0.5 size-5 shrink-0 text-[#B7860B]" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.6875rem] font-bold text-[#B7860B]">1분 한입 팁 · {CATEGORY_MAP[tip.category].short}</span>
                  <span className="block text-[0.84375rem] font-semibold leading-relaxed">{tip.text}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 이번 주 */}
      <section className="mt-5 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-[1rem] font-bold">이번 주 기록</p>
            <span className="flex items-center gap-2 text-[0.75rem] font-bold text-sub">
              <span className="flex items-center gap-0.5">
                <Flame className={cx('size-4', st > 0 ? 'text-orange' : 'text-mute')} fill={st > 0 ? 'currentColor' : 'none'} />
                학습 {st}일 연속
              </span>
              <span className="flex items-center gap-0.5">
                <Trophy className="size-3.5 text-[#B7860B]" />
                도전 {weekChallenges}개
              </span>
            </span>
          </div>
          <div className="mt-3 flex justify-between gap-1.5">
            {week.map((d) => {
              const isToday = d.date === today
              return (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="relative h-14 w-full max-w-8 overflow-hidden rounded-lg bg-bg">
                    <div
                      className={cx('absolute inset-x-0 bottom-0 rounded-lg transition-all', d.ratio === 1 ? 'bg-teal' : 'bg-primary/70')}
                      style={{ height: `${Math.round(d.ratio * 100)}%` }}
                    />
                  </div>
                  <span className={cx('text-[0.6875rem] font-bold', isToday ? 'text-primary' : 'text-mute')}>
                    {isToday ? '오늘' : WEEKDAY_KO[fromKey(d.date).getDay()]}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[0.6875rem] font-semibold text-mute">막대 = 그날 할 일 완료율 · 초록색은 100%</p>
        </div>
      </section>

      {/* 이어서 학습 */}
      {ongoing.length > 0 && (
        <section className="mt-7">
          <SectionHeader title="이어서 학습" action="내 학습" onAction={() => nav('/learn?tab=ongoing')} />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2">
            {ongoing.map((c) => {
              const next = nextLessonOf(c, progress)
              return (
                <button
                  key={c.id}
                  onClick={() => next && nav(`/lesson/${next.id}`)}
                  className="w-[16.25rem] shrink-0 rounded-[1.25rem] bg-white p-4 text-left shadow-card"
                >
                  <div className="flex items-center gap-3">
                    <Thumb category={c.category} className="size-12 rounded-xl" iconSize={20} />
                    <div className="min-w-0 flex-1">
                      <CategoryTag id={c.category} />
                      <p className="truncate text-[0.9375rem] font-bold">{c.title}</p>
                    </div>
                  </div>
                  <p className="mt-3 truncate text-[0.8125rem] font-semibold text-sub">다음: {next?.title}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ProgressBar value={courseProgress(c, progress)} />
                    <span className="shrink-0 text-[0.75rem] font-bold text-primary">{Math.round(courseProgress(c, progress) * 100)}%</span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* 추천 코스 */}
      <section className="mt-7">
        <SectionHeader title="사장님 맞춤 코스" action="배움 전체" onAction={() => nav('/learn')} />
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-3">
          {featured.slice(0, 6).map((c) => (
            <button key={c.id} onClick={() => nav(`/course/${c.id}`)} className="block w-[11.25rem] shrink-0 text-left">
              <Thumb category={c.category} className="h-[12.5rem] w-full rounded-[1.5rem]" iconSize={46}>
                <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                  <span className="line-clamp-2 rounded-2xl bg-ink/45 px-3 py-1.5 text-[0.8125rem] font-bold leading-snug text-white backdrop-blur">
                    {c.title}
                  </span>
                  <span className="flex w-fit items-center gap-1 rounded-full bg-ink/45 px-2.5 py-1 text-[0.75rem] font-bold text-white backdrop-blur">
                    <Clock className="size-3.5" /> {c.lessons.length}개 · {courseMinutes(c)}분
                  </span>
                </div>
              </Thumb>
            </button>
          ))}
        </div>
      </section>

      {/* 오늘의 한입 팁 */}
      {gapLesson && (
        <section className="mt-4 px-5">
          <button
            onClick={() => tip.lessonId && nav(`/lesson/${tip.lessonId}`)}
            className="flex w-full items-start gap-3 rounded-[1.25rem] bg-sun-50 p-4 text-left ring-1 ring-sun/40"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sun text-ink">
              <Lightbulb className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="text-[0.75rem] font-bold text-[#B7860B]">오늘의 한입 팁</span>
              <span className="mt-1 block text-[0.875rem] font-semibold leading-relaxed">{tip.text}</span>
              {tip.lessonId && (
                <span className="mt-1.5 block text-[0.75rem] font-bold text-primary">관련 레슨: {LESSON_MAP[tip.lessonId].title} →</span>
              )}
            </span>
          </button>
        </section>
      )}

      {/* 사장님들의 질문 */}
      <section className="mt-8">
        <SectionHeader title="사장님들이 많이 물어봤어요" action="질문 전체" onAction={() => nav('/ask')} />
        <div className="space-y-2.5 px-5">
          {popularQ.map((q) => (
            <button key={q.id} onClick={() => nav(`/ask/${q.id}`)} className="block w-full rounded-[1.25rem] bg-white p-4 text-left shadow-card">
              <div className="flex items-center gap-2">
                <Badge tone="mute">{CATEGORY_MAP[q.category].short}</Badge>
                <span className="text-[0.75rem] font-semibold text-mute">{relativeTime(q.createdAt)}</span>
              </div>
              <p className="mt-2 text-[0.9375rem] font-bold leading-snug">{q.title}</p>
              <div className="mt-2 flex items-center gap-3 text-[0.75rem] font-semibold text-sub">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="size-3.5" />
                  {q.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="size-3.5" />
                  답변 {q.answers.filter((a) => a.role !== 'helper').length}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>
      <div className="h-4" />

      <ChallengeSheet challenge={openChallenge} onClose={() => setOpenChallenge(null)} />
    </div>
  )
}
