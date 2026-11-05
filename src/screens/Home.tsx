import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Headphones,
  Lightbulb,
  MessageCircle,
  Play,
  Plus,
  RotateCcw,
  Search,
  ThumbsUp,
} from 'lucide-react'
import { useApp } from '@/store/app'
import { useAllEvents, useUnreadCount } from '@/store/selectors'
import { CATEGORIES, CATEGORY_MAP, EVENT_TYPES } from '@/data/categories'
import { COURSES, courseMinutes, LESSON_MAP } from '@/data/courses'
import { tipOfDay } from '@/data/tips'
import { courseProgress, inProgressCourses, nextLessonOf, recommendLessons } from '@/lib/recommend'
import { lastNDays, minutesByDate, streak } from '@/lib/stats'
import { dDayLabel, formatKo, formatTime, greeting, todayKey, WEEKDAY_KO, fromKey } from '@/lib/date'
import { occurrencesOn, upcomingDeadlines } from '@/lib/schedule'
import { relativeTime } from '@/lib/date'
import { Icon } from '@/components/Icon'
import { Badge, CategoryTag, cx, ProgressBar, ProgressRing, SectionHeader, Thumb } from '@/components/ui'

const TIME_OPTIONS = [1, 3, 5, 10]

export function Home() {
  const nav = useNavigate()
  const profile = useApp((s) => s.profile)
  const progress = useApp((s) => s.progress)
  const logs = useApp((s) => s.logs)
  const bookmarks = useApp((s) => s.bookmarks)
  const toggleBookmark = useApp((s) => s.toggleBookmark)
  const toggleDone = useApp((s) => s.toggleDone)
  const questions = useApp((s) => s.questions)
  const reviewCount = useApp((s) => s.review.length)
  const events = useAllEvents()
  const unread = useUnreadCount()
  const [minutes, setMinutes] = useState(3)

  const today = todayKey()
  const now = new Date()
  const tip = tipOfDay(now)
  const recs = useMemo(
    () => recommendLessons({ minutes, interests: profile.interests, progress, limit: 3 }),
    [minutes, profile.interests, progress],
  )
  const todayMin = minutesByDate(logs)[today] ?? 0
  const st = streak(logs, today)
  const week = lastNDays(logs, today, 7)
  const todays = occurrencesOn(events, today)
  const deadline = upcomingDeadlines(events, today, 30)[0]
  const ongoing = inProgressCourses(progress)
  const popularQ = [...questions].sort((a, b) => b.likes - a.likes).slice(0, 2)
  const featured = [...COURSES].sort(
    (a, b) => Number(profile.interests.includes(b.category)) - Number(profile.interests.includes(a.category)),
  )

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

      {/* 검색 (EDUPRO) */}
      <div className="px-5">
        <button
          onClick={() => nav('/search')}
          className="flex h-14 w-full items-center gap-3 rounded-2xl bg-white pl-4 pr-2 text-left shadow-card"
        >
          <Search className="size-5 text-ink" />
          <span className="flex-1 text-[0.9375rem] text-mute">부가세, 리뷰 답글, 주휴수당…</span>
          <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
            <MessageCircle className="size-5" />
          </span>
        </button>
      </div>

      {/* 지금 몇 분? — 핵심 진입점 */}
      <section className="mt-5 px-5">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#3D8BFF] via-primary to-primary-700 p-5 text-white shadow-float">
          <span className="absolute -right-10 -top-12 size-40 rounded-full bg-white/10" />
          <span className="absolute -bottom-16 left-10 size-36 rounded-full bg-white/10" />
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-white/80">
              <Clock className="size-4" /> 틈새 학습
            </p>
            <h2 className="mt-1 text-[1.375rem] font-extrabold tracking-tight">지금 몇 분 있으세요?</h2>
            <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="가용 시간">
              {TIME_OPTIONS.map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={minutes === m}
                  onClick={() => setMinutes(m)}
                  className={cx(
                    'h-11 rounded-full text-[0.9375rem] font-extrabold transition',
                    minutes === m ? 'bg-white text-primary shadow-lg' : 'bg-white/15 text-white ring-1 ring-white/25',
                  )}
                >
                  {m}분
                </button>
              ))}
            </div>

            {minutes === 1 ? (
              <div className="mt-4 space-y-2.5">
                <button
                  onClick={() => (tip.lessonId ? nav(`/lesson/${tip.lessonId}`) : undefined)}
                  className="block w-full rounded-[20px] bg-white p-4 text-left text-ink"
                >
                  <p className="flex items-center gap-1.5 text-[0.75rem] font-bold text-[#B7860B]">
                    <Lightbulb className="size-4" /> 오늘의 한입 팁 · {CATEGORY_MAP[tip.category].short}
                  </p>
                  <p className="mt-2 text-[0.9375rem] font-semibold leading-relaxed">{tip.text}</p>
                </button>
                {reviewCount > 0 && (
                  <button
                    onClick={() => nav('/review')}
                    className="flex w-full items-center gap-3 rounded-[20px] bg-white/15 p-3.5 text-left ring-1 ring-white/25"
                  >
                    <RotateCcw className="size-5" />
                    <span className="flex-1 text-[0.875rem] font-bold">틀린 문제 {reviewCount}개 복습하기</span>
                    <ChevronRight className="size-5" />
                  </button>
                )}
              </div>
            ) : recs.length ? (
              <div className="mt-4 space-y-2.5">
                <button
                  onClick={() => nav(`/lesson/${recs[0].id}`)}
                  className="flex w-full items-center gap-3.5 rounded-[20px] bg-white p-3.5 text-left text-ink"
                >
                  <Thumb category={recs[0].course.category} className="size-16 shrink-0 rounded-2xl" iconSize={24} />
                  <span className="min-w-0 flex-1">
                    <CategoryTag id={recs[0].course.category} />
                    <span className="mt-0.5 line-clamp-2 block text-[1rem] font-bold leading-snug">{recs[0].title}</span>
                    <span className="mt-1 flex items-center gap-2 text-[0.75rem] font-semibold text-sub">
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {recs[0].minutes}분
                      </span>
                      <span className="flex items-center gap-1">
                        <Headphones className="size-3.5" />
                        듣기 가능
                      </span>
                    </span>
                  </span>
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white">
                    <Play className="size-5 translate-x-px" fill="currentColor" />
                  </span>
                </button>
                {recs.slice(1).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => nav(`/lesson/${r.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white/12 px-3.5 py-3 text-left ring-1 ring-white/20"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/20 text-[0.75rem] font-bold">{r.minutes}분</span>
                    <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold">{r.title}</span>
                    <ChevronRight className="size-4 shrink-0 opacity-70" />
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[20px] bg-white p-4 text-ink">
                <p className="text-[0.9375rem] font-bold">{minutes}분 안에 끝나는 새 레슨을 모두 들으셨어요!</p>
                <p className="mt-1 text-[0.8125rem] text-sub">시간을 늘리거나 복습으로 다져 보세요.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 오늘 목표 */}
      <section className="mt-5 px-5">
        <div className="flex items-center gap-4 rounded-[20px] bg-white p-4 shadow-card">
          <ProgressRing value={todayMin / profile.dailyGoal} size={68} stroke={7}>
            <span className="text-center leading-none">
              <span className="block text-[1.0625rem] font-extrabold">{todayMin}</span>
              <span className="text-[0.625rem] font-bold text-mute">/{profile.dailyGoal}분</span>
            </span>
          </ProgressRing>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[0.9375rem] font-bold">
              <Flame className={cx('size-5', st > 0 ? 'text-orange' : 'text-mute')} fill={st > 0 ? 'currentColor' : 'none'} />
              {st > 0 ? `${st}일 연속 학습 중` : '오늘 첫 학습을 시작해요'}
            </p>
            <div className="mt-2.5 flex justify-between">
              {week.map((d) => {
                const on = d.minutes > 0
                const isToday = d.date === today
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1">
                    <span
                      className={cx(
                        'grid size-7 place-items-center rounded-full text-[0.6875rem] font-bold',
                        on ? 'bg-primary text-white' : isToday ? 'bg-primary-50 text-primary ring-1 ring-primary/30' : 'bg-bg text-mute',
                      )}
                    >
                      {on ? <Check className="size-3.5" strokeWidth={3} /> : fromKey(d.date).getDate()}
                    </span>
                    <span className={cx('text-[0.625rem] font-semibold', isToday ? 'text-primary' : 'text-mute')}>
                      {WEEKDAY_KO[fromKey(d.date).getDay()]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 오늘 일정 */}
      <section className="mt-7">
        <SectionHeader title="오늘 할 일" action="일정 전체" onAction={() => nav('/schedule')} />
        <div className="px-5">
          {deadline && (
            <button
              onClick={() => nav(`/schedule?date=${deadline.date}`)}
              className="mb-2.5 flex w-full items-center gap-3 rounded-2xl bg-coral-50 px-4 py-3 text-left"
            >
              <span className="rounded-full bg-coral px-2.5 py-1 text-[0.75rem] font-extrabold text-white">{dDayLabel(today, deadline.date)}</span>
              <span className="min-w-0 flex-1 truncate text-[0.875rem] font-bold text-ink">{deadline.event.title}</span>
              <span className="text-[0.75rem] font-semibold text-sub">{formatKo(deadline.date, { weekday: false })}</span>
            </button>
          )}
          <div className="overflow-hidden rounded-[20px] bg-white shadow-card">
            {todays.filter((o) => o.event.type !== 'deadline').length === 0 ? (
              <button onClick={() => nav('/schedule?new=1')} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary">
                  <Plus className="size-5" />
                </span>
                <span className="text-[0.875rem] font-semibold text-sub">오늘 일정이 없어요. 발주·점검 일정을 추가해 보세요.</span>
              </button>
            ) : (
              todays
                .filter((o) => o.event.type !== 'deadline')
                .slice(0, 4)
                .map((o, i) => {
                  const t = EVENT_TYPES[o.event.type]
                  return (
                    <div key={o.event.id} className={cx('flex items-center gap-3 px-4 py-3.5', i > 0 && 'border-t border-line')}>
                      <button
                        aria-label={o.done ? '완료 취소' : '완료'}
                        onClick={() => toggleDone(o.event, today)}
                        className={cx(
                          'grid size-7 shrink-0 place-items-center rounded-full ring-2 transition',
                          o.done ? 'bg-teal text-white ring-teal' : 'ring-line',
                        )}
                      >
                        {o.done && <Check className="size-4" strokeWidth={3} />}
                      </button>
                      <button
                        className="min-w-0 flex-1 text-left"
                        onClick={() => (o.event.lessonId ? nav(`/lesson/${o.event.lessonId}`) : nav('/schedule'))}
                      >
                        <span className={cx('block truncate text-[0.9375rem] font-bold', o.done && 'text-mute line-through')}>{o.event.title}</span>
                        <span className="text-[0.75rem] font-semibold text-mute">{formatTime(o.event.start)}</span>
                      </button>
                      <span className="rounded-full px-2.5 py-1 text-[0.6875rem] font-bold" style={{ background: t.soft, color: t.color }}>
                        {t.label}
                      </span>
                    </div>
                  )
                })
            )}
          </div>
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
                  className="w-[16.25rem] shrink-0 rounded-[20px] bg-white p-4 text-left shadow-card"
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

      {/* 카테고리 */}
      <section className="mt-7">
        <SectionHeader title="분야별 배움" action="전체 보기" onAction={() => nav('/learn')} />
        <div className="grid grid-cols-4 gap-y-4 px-4">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => nav(`/learn?cat=${c.id}`)} className="flex flex-col items-center gap-2">
              <span className="grid size-14 place-items-center rounded-[18px] shadow-card" style={{ background: c.soft, color: c.color }}>
                <Icon name={c.icon} className="size-6" />
              </span>
              <span className="text-[0.7812rem] font-bold text-ink">{c.short}</span>
            </button>
          ))}
        </div>
      </section>

      {/* 추천 코스 (Aspen 카드) */}
      <section className="mt-8">
        <SectionHeader title="사장님 맞춤 코스" action="더 보기" onAction={() => nav('/learn')} />
        <div className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-3">
          {featured.slice(0, 6).map((c) => {
            const saved = bookmarks.includes(c.id)
            return (
              <div key={c.id} className="relative w-[12.5rem] shrink-0">
                <button onClick={() => nav(`/course/${c.id}`)} className="block w-full text-left">
                  <Thumb category={c.category} className="h-[15rem] w-full rounded-[24px]" iconSize={52}>
                    <div className="absolute inset-x-3 bottom-3 space-y-1.5">
                      <span className="inline-block max-w-full truncate rounded-full bg-ink/45 px-3 py-1.5 text-[0.8125rem] font-bold text-white backdrop-blur">
                        {c.title}
                      </span>
                      <span className="flex w-fit items-center gap-1 rounded-full bg-ink/45 px-2.5 py-1 text-[0.75rem] font-bold text-white backdrop-blur">
                        <Clock className="size-3.5" /> {c.lessons.length}개 · {courseMinutes(c)}분
                      </span>
                    </div>
                  </Thumb>
                </button>
                <button
                  aria-label={saved ? '저장 취소' : '저장'}
                  onClick={() => toggleBookmark(c.id)}
                  className="absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-white shadow-card"
                >
                  <Bookmark className={cx('size-4', saved ? 'text-coral' : 'text-sub')} fill={saved ? 'currentColor' : 'none'} />
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* 오늘의 한입 팁 */}
      {minutes !== 1 && (
        <section className="mt-6 px-5">
          <button
            onClick={() => tip.lessonId && nav(`/lesson/${tip.lessonId}`)}
            className="flex w-full items-start gap-3 rounded-[20px] bg-sun-50 p-4 text-left ring-1 ring-sun/40"
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
            <button key={q.id} onClick={() => nav(`/ask/${q.id}`)} className="block w-full rounded-[20px] bg-white p-4 text-left shadow-card">
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
    </div>
  )
}
