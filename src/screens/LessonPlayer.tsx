import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Bookmark,
  CalendarPlus,
  Check,
  CircleCheck,
  CircleX,
  Clock,
  Flame,
  Headphones,
  House,
  Lightbulb,
  ListChecks,
  MessageSquareQuote,
  PartyPopper,
  Sparkles,
  Square,
  SquareCheck,
  X,
} from 'lucide-react'
import type { LessonCard } from '@/types'
import { useApp } from '@/store/app'
import { COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { CATEGORY_MAP, TYPICAL_LULLS } from '@/data/categories'
import { speak, speechSupported, stopSpeaking } from '@/lib/speech'
import { addDays, formatKo, minToTime, timeToMin, todayKey } from '@/lib/date'
import { streak } from '@/lib/stats'
import { cx, GhostButton, PrimaryButton } from '@/components/ui'

const KIND: Record<LessonCard['kind'], { label: string; icon: typeof Lightbulb; color: string; soft: string }> = {
  concept: { label: '핵심 개념', icon: Sparkles, color: '#176FF2', soft: '#EEF4FF' },
  tip: { label: '실전 팁', icon: Lightbulb, color: '#B7860B', soft: '#FFF8E1' },
  example: { label: '이렇게 말해요', icon: MessageSquareQuote, color: '#7B61FF', soft: '#F1EEFF' },
  check: { label: '체크리스트', icon: ListChecks, color: '#167F71', soft: '#E8F6F3' },
}

function cardSpeech(c: LessonCard): string {
  return [c.title, c.body, ...(c.items ?? [])].join('. ')
}

export function LessonPlayer() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const lesson = LESSON_MAP[id]
  const saved = useApp((s) => s.bookmarks.includes(id))
  const toggleBookmark = useApp((s) => s.toggleBookmark)
  const setCard = useApp((s) => s.setCard)
  const completeLesson = useApp((s) => s.completeLesson)
  const startCard = useApp((s) => s.progress[id]?.card ?? 0)
  const rate = useApp((s) => s.settings.speechRate)

  const [phase, setPhase] = useState<'cards' | 'quiz' | 'done'>('cards')
  const [idx, setIdx] = useState(() => Math.min(startCard, (lesson?.cards.length ?? 1) - 1))
  const [qIdx, setQIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [listen, setListen] = useState(false)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const speakId = useRef(0)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const total = lesson ? lesson.cards.length + lesson.quiz.length : 0
  const step = phase === 'cards' ? idx : phase === 'quiz' ? lesson.cards.length + qIdx : total

  const next = useCallback(() => {
    if (!lesson) return
    if (phase === 'cards') {
      if (idx < lesson.cards.length - 1) {
        setIdx(idx + 1)
        setCard(lesson.id, idx + 1)
      } else if (lesson.quiz.length) {
        setPhase('quiz')
      } else {
        completeLesson(lesson.id, [])
        setPhase('done')
      }
    }
  }, [lesson, phase, idx, setCard, completeLesson])

  const prev = useCallback(() => {
    if (phase === 'cards' && idx > 0) setIdx(idx - 1)
    if (phase === 'quiz' && picked === null) {
      if (qIdx > 0) setQIdx(qIdx - 1)
      else {
        setPhase('cards')
        setIdx(lesson.cards.length - 1)
      }
    }
  }, [phase, idx, qIdx, picked, lesson])

  // 듣기 모드: 카드를 읽고 끝나면 자동으로 다음 카드
  useEffect(() => {
    if (!lesson || !listen) return
    const my = ++speakId.current
    if (phase === 'cards') {
      speak(cardSpeech(lesson.cards[idx]), {
        rate,
        onEnd: () => {
          if (speakId.current !== my) return
          window.setTimeout(() => speakId.current === my && next(), 700)
        },
      })
    } else if (phase === 'quiz' && picked === null) {
      const q = lesson.quiz[qIdx]
      speak(`확인 문제. ${q.q}. ${q.options.map((o, i) => `${i + 1}번, ${o}`).join('. ')}`, { rate })
    } else if (phase === 'done') {
      speak(`레슨 완료! 핵심 한 줄. ${lesson.takeaway}`, { rate })
    }
    return () => {
      speakId.current++
    }
  }, [listen, phase, idx, qIdx, picked, lesson, rate, next])

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    if (!listen) stopSpeaking()
  }, [listen])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, prev])

  if (!lesson) return <Navigate to="/learn" replace />
  const course = COURSE_MAP[lesson.courseId]
  const cat = CATEGORY_MAP[course.category]

  const answer = (i: number) => {
    if (picked !== null) return
    setPicked(i)
    setResults((r) => {
      const copy = [...r]
      copy[qIdx] = i === lesson.quiz[qIdx].answer
      return copy
    })
  }

  const afterQuiz = () => {
    if (qIdx < lesson.quiz.length - 1) {
      setQIdx(qIdx + 1)
      setPicked(null)
    } else {
      completeLesson(lesson.id, results)
      setPhase('done')
    }
  }

  if (phase === 'done') return <Done lessonId={lesson.id} results={results} listen={listen} />

  return (
    <div className="pt-safe flex min-h-dvh flex-col bg-bg">
      {/* 진행 바 */}
      <div className="flex gap-1 px-4 pt-3">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-line">
            <span className={cx('block h-full rounded-full bg-primary transition-all duration-300', i <= step ? 'w-full' : 'w-0')} />
          </span>
        ))}
      </div>

      <header className="flex items-center gap-2 px-3 py-2">
        <button aria-label="닫기" onClick={() => nav(-1)} className="grid size-10 place-items-center rounded-full hover:bg-white">
          <X className="size-6" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.75rem] font-bold" style={{ color: cat.color }}>
            {course.title}
          </p>
          <p className="truncate text-[0.9375rem] font-bold">{lesson.title}</p>
        </div>
        {speechSupported() && (
          <button
            aria-label={listen ? '듣기 끄기' : '듣기 모드'}
            aria-pressed={listen}
            onClick={() => setListen(!listen)}
            className={cx(
              'flex h-10 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-bold transition',
              listen ? 'bg-violet text-white shadow-[0_8px_20px_rgba(123,97,255,0.35)]' : 'bg-white text-ink shadow-card',
            )}
          >
            <Headphones className="size-4.5" />
            {listen ? '듣는 중' : '듣기'}
          </button>
        )}
        <button
          aria-label={saved ? '저장 취소' : '레슨 저장'}
          onClick={() => toggleBookmark(lesson.id)}
          className="grid size-10 place-items-center rounded-full bg-white shadow-card"
        >
          <Bookmark className={cx('size-4.5', saved ? 'text-coral' : 'text-ink')} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </header>

      <main
        className="flex flex-1 flex-col px-4 pb-4 pt-2"
        onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
        onTouchEnd={(e) => {
          if (!touch.current) return
          const dx = e.changedTouches[0].clientX - touch.current.x
          const dy = e.changedTouches[0].clientY - touch.current.y
          touch.current = null
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx < 0 ? next : prev)()
        }}
      >
        {phase === 'cards' ? (
          <CardView
            key={idx}
            card={lesson.cards[idx]}
            n={idx + 1}
            total={lesson.cards.length}
            checked={checked}
            onCheck={(k) => setChecked((c) => ({ ...c, [k]: !c[k] }))}
          />
        ) : (
          <div key={qIdx} className="flex min-h-[58dvh] animate-slide-in flex-col rounded-[28px] bg-white p-6 shadow-card">
            <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-coral">
              <CircleCheck className="size-4" /> 확인 문제 {qIdx + 1}/{lesson.quiz.length}
            </p>
            <h2 className="mt-3 text-[1.3125rem] font-extrabold leading-snug tracking-tight">{lesson.quiz[qIdx].q}</h2>
            <div className="mt-6 space-y-2.5">
              {lesson.quiz[qIdx].options.map((o, i) => {
                const q = lesson.quiz[qIdx]
                const reveal = picked !== null
                const correct = i === q.answer
                const mine = picked === i
                return (
                  <button
                    key={i}
                    onClick={() => answer(i)}
                    disabled={reveal}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-[1rem] font-bold ring-2 transition',
                      !reveal && 'ring-line hover:ring-primary/40 active:scale-[0.99]',
                      reveal && correct && 'bg-teal-50 text-teal ring-teal',
                      reveal && mine && !correct && 'bg-coral-50 text-coral ring-coral',
                      reveal && !mine && !correct && 'opacity-50 ring-line',
                    )}
                  >
                    <span
                      className={cx(
                        'grid size-8 shrink-0 place-items-center rounded-full text-[0.875rem]',
                        reveal && correct ? 'bg-teal text-white' : reveal && mine ? 'bg-coral text-white' : 'bg-bg text-sub',
                      )}
                    >
                      {reveal && correct ? <Check className="size-4" strokeWidth={3} /> : reveal && mine ? <X className="size-4" strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="flex-1">{o}</span>
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <div
                className={cx(
                  'mt-5 animate-fade-in rounded-2xl p-4 text-[0.9062rem] font-semibold leading-relaxed',
                  picked === lesson.quiz[qIdx].answer ? 'bg-teal-50 text-ink' : 'bg-coral-50 text-ink',
                )}
              >
                <p className={cx('mb-1 flex items-center gap-1.5 font-extrabold', picked === lesson.quiz[qIdx].answer ? 'text-teal' : 'text-coral')}>
                  {picked === lesson.quiz[qIdx].answer ? (
                    <>
                      <CircleCheck className="size-5" /> 정답이에요!
                    </>
                  ) : (
                    <>
                      <CircleX className="size-5" /> 아쉬워요 — 복습 목록에 담았어요
                    </>
                  )}
                </p>
                {lesson.quiz[qIdx].explain}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="pb-safe-5 flex items-center gap-3 px-4">
        <button
          aria-label="이전"
          onClick={prev}
          disabled={(phase === 'cards' && idx === 0) || picked !== null}
          className="grid size-[3.75rem] shrink-0 place-items-center rounded-full bg-white text-ink shadow-card disabled:opacity-30"
        >
          <ArrowLeft className="size-6" />
        </button>
        {phase === 'cards' ? (
          <PrimaryButton onClick={next}>{idx === lesson.cards.length - 1 ? '확인 문제 풀기' : '다음'}</PrimaryButton>
        ) : (
          <PrimaryButton onClick={afterQuiz} disabled={picked === null}>
            {qIdx < lesson.quiz.length - 1 ? '다음 문제' : '레슨 완료'}
          </PrimaryButton>
        )}
      </footer>
    </div>
  )
}

function CardView({
  card,
  n,
  total,
  checked,
  onCheck,
}: {
  card: LessonCard
  n: number
  total: number
  checked: Record<string, boolean>
  onCheck: (k: string) => void
}) {
  const k = KIND[card.kind]
  const I = k.icon
  return (
    <article className="relative flex min-h-[58dvh] animate-slide-in flex-col overflow-hidden rounded-[28px] bg-white p-6 shadow-card">
      <I aria-hidden className="pointer-events-none absolute -bottom-6 -right-6 size-44 opacity-[0.06]" style={{ color: k.color }} strokeWidth={1.5} />
      <div className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.8125rem] font-bold" style={{ background: k.soft, color: k.color }}>
          <I className="size-4" />
          {k.label}
        </span>
        <span className="text-[0.8125rem] font-bold text-mute">
          {n} / {total}
        </span>
      </div>
      <h2 className="relative mt-5 text-[1.5rem] font-extrabold leading-snug tracking-tight">{card.title}</h2>
      <p
        className={cx(
          'relative mt-4 text-[1.0625rem] font-medium leading-[1.75] text-ink/90',
          card.kind === 'example' && 'rounded-2xl bg-violet-50 p-4 font-semibold text-ink',
        )}
      >
        {card.body}
      </p>
      {card.items && (
        <ul className="relative mt-5 space-y-2">
          {card.items.map((it) => {
            const on = checked[it]
            return (
              <li key={it}>
                <button
                  onClick={() => onCheck(it)}
                  aria-pressed={on}
                  className={cx(
                    'flex w-full items-start gap-3 rounded-2xl px-3.5 py-3 text-left text-[0.9375rem] font-semibold transition',
                    on ? 'bg-teal-50 text-teal' : 'bg-bg text-ink',
                  )}
                >
                  {on ? <SquareCheck className="mt-0.5 size-5 shrink-0" /> : <Square className="mt-0.5 size-5 shrink-0 text-mute" />}
                  <span className={cx(on && 'line-through decoration-2')}>{it}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="relative mt-auto pt-6 text-center text-[0.75rem] font-semibold text-mute">옆으로 넘기거나 아래 버튼을 눌러요</p>
    </article>
  )
}

function Done({ lessonId, results, listen }: { lessonId: string; results: boolean[]; listen: boolean }) {
  const nav = useNavigate()
  const lesson = LESSON_MAP[lessonId]
  const course = COURSE_MAP[lesson.courseId]
  const logs = useApp((s) => s.logs)
  const note = useApp((s) => s.notes[lessonId] ?? '')
  const setNote = useApp((s) => s.setNote)
  const addEvent = useApp((s) => s.addEvent)
  const bizType = useApp((s) => s.profile.bizType)
  const progress = useApp((s) => s.progress)
  const [draft, setDraft] = useState(note)
  const [scheduled, setScheduled] = useState<string | null>(null)

  const correct = results.filter(Boolean).length
  const nextLesson = course.lessons.find((l) => !progress[l.id]?.done && l.id !== lessonId)
  const st = streak(logs, todayKey())

  const scheduleReview = () => {
    const date = addDays(todayKey(), 1)
    const lull = TYPICAL_LULLS[bizType][TYPICAL_LULLS[bizType].length - 1]
    addEvent({
      title: `복습: ${lesson.title}`,
      date,
      start: lull.start,
      end: minToTime(timeToMin(lull.start) + 5),
      type: 'learn',
      repeat: 'none',
      lessonId,
      memo: `핵심: ${lesson.takeaway}`,
    })
    setScheduled(`${formatKo(date)} ${lull.start}`)
  }

  return (
    <div className="pt-safe min-h-dvh bg-bg pb-10">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#3D8BFF] via-primary to-primary-700 px-6 pb-16 pt-10 text-center text-white">
        <span className="absolute -left-10 top-6 size-32 rounded-full bg-white/10" />
        <span className="absolute -right-8 bottom-0 size-40 rounded-full bg-white/10" />
        <div className="relative mx-auto grid size-20 animate-pop place-items-center rounded-full bg-white text-primary shadow-lg">
          <PartyPopper className="size-10" />
        </div>
        <h1 className="relative mt-5 text-[1.625rem] font-extrabold tracking-tight">레슨 완료!</h1>
        <p className="relative mt-1 text-[0.9375rem] font-semibold text-white/85">{lesson.title}</p>
        <div className="relative mt-5 flex justify-center gap-2.5">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[0.8125rem] font-bold ring-1 ring-white/25">
            <Clock className="size-4" />+{lesson.minutes}분
          </span>
          {results.length > 0 && (
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[0.8125rem] font-bold ring-1 ring-white/25">
              <CircleCheck className="size-4" />
              {correct}/{results.length} 정답
            </span>
          )}
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-2 text-[0.8125rem] font-bold ring-1 ring-white/25">
            <Flame className="size-4" />
            {st}일 연속
          </span>
        </div>
        {listen && <p className="relative mt-3 text-[0.75rem] font-semibold text-white/70">핵심 한 줄을 읽어 드리고 있어요</p>}
      </div>

      <div className="relative -mt-10 space-y-4 px-5">
        <div className="rounded-[24px] bg-white p-5 shadow-card">
          <p className="flex items-center gap-1.5 text-[0.8125rem] font-bold text-[#B7860B]">
            <Lightbulb className="size-4" /> 핵심 한 줄
          </p>
          <p className="mt-2 text-[1.1875rem] font-extrabold leading-snug tracking-tight">{lesson.takeaway}</p>
        </div>

        <div className="rounded-[24px] bg-white p-5 shadow-card">
          <label htmlFor="note" className="text-[0.875rem] font-bold">
            우리 가게에 적용할 점 메모
          </label>
          <textarea
            id="note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => setNote(lessonId, draft)}
            rows={3}
            maxLength={500}
            placeholder="예: 이번 주에 대표 메뉴 사진 3장 다시 찍기"
            className="mt-2 w-full resize-none rounded-2xl bg-bg p-3.5 text-[0.9375rem] outline-none ring-primary placeholder:text-mute focus:ring-2"
          />
          {draft !== note && (
            <button onClick={() => setNote(lessonId, draft)} className="mt-2 text-[0.8125rem] font-bold text-primary">
              메모 저장
            </button>
          )}
        </div>

        <button
          onClick={scheduleReview}
          disabled={!!scheduled}
          className="flex w-full items-center gap-3 rounded-[20px] bg-violet-50 p-4 text-left ring-1 ring-violet/20 disabled:opacity-80"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-violet text-white">
            {scheduled ? <Check className="size-5" strokeWidth={3} /> : <CalendarPlus className="size-5" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-bold">{scheduled ? '복습 일정이 잡혔어요' : '내일 틈새 시간에 복습 넣기'}</span>
            <span className="text-[0.7812rem] font-semibold text-sub">{scheduled ?? '하루 뒤에 다시 보면 훨씬 오래 기억나요'}</span>
          </span>
        </button>

        <div className="space-y-3 pt-2">
          {nextLesson ? (
            <PrimaryButton onClick={() => nav(`/lesson/${nextLesson.id}`, { replace: true })}>다음 레슨: {nextLesson.minutes}분</PrimaryButton>
          ) : (
            <PrimaryButton tone="ink" onClick={() => nav(`/course/${course.id}`, { replace: true })}>
              코스 수료! 코스로 돌아가기
            </PrimaryButton>
          )}
          <GhostButton onClick={() => nav('/', { replace: true })}>
            <House className="size-5" /> 홈으로
          </GhostButton>
        </div>
      </div>
    </div>
  )
}
