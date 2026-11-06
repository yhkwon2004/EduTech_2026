import { useEffect, useMemo, useRef, useState } from 'react'
import { emote } from '../emote'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, MessageCircle, Phone, Search, Send, Volume2, VolumeX } from 'lucide-react'
import type { CategoryId, Course, Lesson } from '@/types'
import { COURSES, COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { FAQS, FAQ_MAP, HOTLINES } from '@/data/faq'
import { CATEGORIES, CATEGORY_MAP } from '@/data/categories'
import { useApp } from '@/store/app'
import { searchAll } from '@/lib/match'
import { speak, speechSupported, stopSpeaking } from '@/lib/speech'
import { relativeTime, todayKey } from '@/lib/date'
import { SKILL_EFFECT, skillMax, skillsFromProgress } from '@/game/skills'
import { useWorld } from '../store'
import { JOB_MAP } from '../jobs'
import { onLessonComplete } from '../actions'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, toast } from '../ui/kit'

export const CAT_EMOJI: Record<CategoryId, string> = {
  marketing: '📣',
  digital: '📱',
  tax: '🧾',
  service: '😊',
  ops: '📦',
  support: '🏛️',
  labor: '🤝',
  hygiene: '🧼',
}

type Tab = 'learn' | 'review' | 'ask' | 'skill'

/* ───────── 레슨 진행 (카드 → 퀴즈 → 완료) ───────── */
function LessonView({ lesson, course, onBack, onDone }: { lesson: Lesson; course: Course; onBack: () => void; onDone?: () => void }) {
  const app = useApp()
  const cat = CATEGORY_MAP[course.category]
  const start = Math.min(app.progress[lesson.id]?.card ?? 0, lesson.cards.length - 1)
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'done'>('cards')
  const [i, setI] = useState(start)
  const [q, setQ] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState<boolean[]>([])
  const [listening, setListening] = useState(false)
  const [reward, setReward] = useState<{ first: boolean; score: number } | null>(null)
  const finished = useRef(false)
  const card = lesson.cards[i]

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    if (phase === 'cards') app.setCard(lesson.id, i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase])

  // 듣기 모드: 카드를 읽고 다 읽으면 다음 카드
  useEffect(() => {
    if (!listening || phase !== 'cards') return
    const text = `${card.title}. ${card.body} ${card.items?.join(', ') ?? ''}`
    speak(text, {
      rate: app.settings.speechRate,
      onEnd: () => {
        if (i < lesson.cards.length - 1) setI(i + 1)
        else setListening(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, i, phase])

  const finish = (answers: boolean[]) => {
    if (finished.current) return
    finished.current = true
    stopSpeaking()
    const first = app.completeLesson(lesson.id, answers)
    onLessonComplete(first)
    const score = answers.length ? Math.round((answers.filter(Boolean).length / answers.length) * 100) : 100
    setReward({ first, score })
    setPhase('done')
    toast(first ? '레슨 완료! +30 EXP · 체력 +5' : '복습 완료! +8 EXP · 체력 +2', 'good')
    emote(score >= 50 ? 'cheer' : 'nod', '📚')
  }

  const kindLabel = { concept: '개념', tip: '실전 팁', example: '예시', check: '체크리스트' }[card?.kind ?? 'concept']

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-0.5 rounded-xl bg-black/5 px-2 py-1 text-[0.75rem] font-black">
          <ArrowLeft className="size-3.5" /> 목록
        </button>
        <span className="min-w-0 flex-1 truncate text-[0.875rem] font-black">
          {CAT_EMOJI[course.category]} {lesson.title}
        </span>
        <Chip tone="blue">⏱ {lesson.minutes}분</Chip>
      </div>
      {/* 진행 점 */}
      <div className="mb-2 flex gap-1">
        {lesson.cards.map((_, k) => (
          <span key={k} className={cx('h-1.5 flex-1 rounded-full', phase !== 'cards' || k <= i ? 'bg-primary' : 'bg-black/10')} />
        ))}
        {lesson.quiz.map((_, k) => (
          <span key={`q${k}`} className={cx('h-1.5 flex-1 rounded-full', phase === 'done' || (phase === 'quiz' && k <= q) ? 'bg-sun' : 'bg-black/10')} />
        ))}
      </div>

      {phase === 'cards' && (
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1fr_12rem]">
          <div className="thin-scroll min-h-0 overflow-y-auto rounded-2xl border-2 border-black/5 bg-white p-3.5 shadow-sm">
            <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-black text-white" style={{ background: cat.color }}>
              {kindLabel} · {i + 1}/{lesson.cards.length}
            </span>
            <h3 className="mt-2 text-[1.125rem] font-black leading-snug">{card.title}</h3>
            <p className="mt-1.5 text-[0.9375rem] font-medium leading-relaxed text-ink/85">{card.body}</p>
            {card.items && (
              <ul className="mt-2 space-y-1">
                {card.items.map((it) => (
                  <li key={it} className="flex items-start gap-1.5 text-[0.875rem] font-semibold">
                    <Check className="mt-0.5 size-4 shrink-0 text-teal" strokeWidth={3} /> {it}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-row gap-2 md:flex-col">
            {speechSupported() && (
              <GameButton
                tone={listening ? 'coral' : 'white'}
                className="flex-1 md:flex-none"
                onClick={() => {
                  if (listening) stopSpeaking()
                  setListening(!listening)
                }}
              >
                {listening ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {listening ? '그만 듣기' : '듣기 모드'}
              </GameButton>
            )}
            <div className="flex flex-1 gap-2 md:flex-none">
              <GameButton tone="white" disabled={i === 0} onClick={() => setI(i - 1)} className="flex-1">
                <ChevronLeft className="size-4" />
              </GameButton>
              <GameButton
                className="flex-[2]"
                onClick={() => {
                  if (i < lesson.cards.length - 1) setI(i + 1)
                  else {
                    stopSpeaking()
                    setListening(false)
                    if (lesson.quiz.length) setPhase('quiz')
                    else finish([])
                  }
                }}
              >
                {i < lesson.cards.length - 1 ? '다음' : '퀴즈 풀기'} <ChevronRight className="size-4" />
              </GameButton>
            </div>
            <p className="hidden text-[0.6875rem] font-semibold text-sub md:block">💡 손이 바쁠 땐 듣기 모드로 들어 보세요. 레슨을 끝내면 체력이 회복되고 가게 노하우가 올라요.</p>
          </div>
        </div>
      )}

      {phase === 'quiz' && (
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl bg-gradient-to-br from-[#FFF4D6] to-[#FFE6A8] p-3.5">
            <p className="text-[0.6875rem] font-black text-[#B7860B]">
              확인 퀴즈 {q + 1}/{lesson.quiz.length}
            </p>
            <p className="mt-1 text-[1rem] font-black leading-snug">{lesson.quiz[q].q}</p>
            {picked !== null && (
              <p className={cx('mt-2 rounded-xl p-2 text-[0.8125rem] font-semibold', picked === lesson.quiz[q].answer ? 'bg-teal-50 text-teal' : 'bg-coral-50 text-coral')}>
                {picked === lesson.quiz[q].answer ? '⭕ 정답! ' : '❌ 아쉬워요. '}
                {lesson.quiz[q].explain}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            {lesson.quiz[q].options.map((o, k) => {
              const show = picked !== null
              const right = k === lesson.quiz[q].answer
              return (
                <button
                  key={k}
                  disabled={show}
                  onClick={() => {
                    setPicked(k)
                    setCorrect([...correct, right])
                  }}
                  className={cx(
                    'rounded-2xl border-2 px-3 py-2.5 text-left text-[0.875rem] font-bold transition',
                    !show && 'border-black/10 bg-white active:scale-[0.98]',
                    show && right && 'border-teal bg-teal-50',
                    show && !right && picked === k && 'border-coral bg-coral-50',
                    show && !right && picked !== k && 'border-black/5 bg-white opacity-60',
                  )}
                >
                  {o}
                </button>
              )
            })}
            {picked !== null && (
              <GameButton
                tone="green"
                className="mt-auto"
                onClick={() => {
                  if (q < lesson.quiz.length - 1) {
                    setQ(q + 1)
                    setPicked(null)
                  } else finish(correct)
                }}
              >
                {q < lesson.quiz.length - 1 ? '다음 문제' : '레슨 끝내기'}
              </GameButton>
            )}
          </div>
        </div>
      )}

      {phase === 'done' && reward && (
        <div className="grid min-h-0 flex-1 place-items-center">
          <div className="w-full max-w-[34rem] text-center">
            <p className="text-[2.5rem] leading-none">{reward.score >= 100 ? '🏆' : reward.score >= 50 ? '🎉' : '📘'}</p>
            <p className="mt-1 text-[1.25rem] font-black">레슨 완료 · 정답률 {reward.score}%</p>
            <div className="mt-2 flex justify-center gap-1.5">
              <Chip tone="sun">+{reward.first ? 30 : 8} EXP</Chip>
              <Chip tone="coral">⚡ 체력 +{reward.first ? 5 : 2}</Chip>
              {reward.first && (
                <Chip tone="blue">
                  {CAT_EMOJI[course.category]} {cat.short} 노하우 UP
                </Chip>
              )}
            </div>
            <p className="mx-auto mt-2 max-w-[28rem] rounded-2xl bg-primary-50 p-2.5 text-[0.875rem] font-bold text-primary">📌 {lesson.takeaway}</p>
            {reward.first && <p className="mt-1.5 text-[0.75rem] font-semibold text-sub">가게 효과: {SKILL_EFFECT[course.category]}</p>}
            {reward.score < 100 && <p className="mt-1 text-[0.75rem] font-semibold text-sub">틀린 문제는 "복습" 탭에 모아 뒀어요.</p>}
            <div className="mt-3 flex justify-center gap-2">
              <GameButton tone="white" onClick={onBack}>
                목록으로
              </GameButton>
              {onDone && (
                <GameButton tone="green" onClick={onDone}>
                  돌아가기
                </GameButton>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────── 코스 목록 ───────── */
function LearnTab({ open }: { open: (lessonId: string) => void }) {
  const progress = useApp((s) => s.progress)
  const job = useWorld((s) => s.job)
  const [cat, setCat] = useState<CategoryId | 'all'>(job ? JOB_MAP[job.id].category : 'all')
  const [course, setCourse] = useState<Course | null>(null)
  const list = COURSES.filter((c) => cat === 'all' || c.category === cat)

  if (course) {
    const meta = CATEGORY_MAP[course.category]
    return (
      <div>
        <button onClick={() => setCourse(null)} className="mb-2 flex items-center gap-0.5 rounded-xl bg-black/5 px-2 py-1 text-[0.75rem] font-black">
          <ArrowLeft className="size-3.5" /> 코스 목록
        </button>
        <div className="grid gap-3 md:grid-cols-[15rem_1fr]">
          <div className="rounded-2xl p-3 text-white" style={{ background: meta.gradient }}>
            <p className="text-[1.75rem] leading-none">{CAT_EMOJI[course.category]}</p>
            <p className="mt-1 text-[0.6875rem] font-black opacity-90">
              {meta.name} · {course.level}
            </p>
            <p className="text-[1rem] font-black leading-snug">{course.title}</p>
            <p className="mt-1 text-[0.75rem] font-semibold opacity-90">{course.description}</p>
          </div>
          <div className="space-y-1.5">
            {course.lessons.map((l, k) => {
              const done = progress[l.id]?.done
              return (
                <Card key={l.id} onClick={() => open(l.id)} className="flex w-full items-center gap-2.5 py-2.5">
                  <span className={cx('grid size-8 shrink-0 place-items-center rounded-xl text-[0.8125rem] font-black', done ? 'bg-teal text-white' : 'bg-black/5')}>{done ? <Check className="size-4" strokeWidth={3} /> : k + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-black">{l.title}</span>
                    <span className="block truncate text-[0.6875rem] font-semibold text-sub">{l.takeaway}</span>
                  </span>
                  <Chip tone={done ? 'green' : 'blue'}>{done ? `복습 · ${progress[l.id]?.score ?? 100}점` : `▶ ${l.minutes}분`}</Chip>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-full gap-3 md:grid-cols-[9.5rem_1fr]">
      <div className="no-scrollbar flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {(['all', ...CATEGORIES.map((c) => c.id)] as const).map((id) => {
          const total = id === 'all' ? COURSES.reduce((n, c) => n + c.lessons.length, 0) : skillMax(id)
          const done = COURSES.filter((c) => id === 'all' || c.category === id).reduce((n, c) => n + c.lessons.filter((l) => progress[l.id]?.done).length, 0)
          return (
            <button
              key={id}
              onClick={() => setCat(id)}
              className={cx('flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-left text-[0.75rem] font-black', cat === id ? 'bg-ink text-white' : 'bg-black/5')}
            >
              <span>{id === 'all' ? '🏫' : CAT_EMOJI[id]}</span>
              <span className="flex-1 whitespace-nowrap">{id === 'all' ? '전체' : CATEGORY_MAP[id].short}</span>
              <span className={cx('text-[0.625rem]', cat === id ? 'text-white/70' : 'text-mute')}>
                {done}/{total}
              </span>
            </button>
          )
        })}
      </div>
      <div className="grid content-start gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((c) => {
          const meta = CATEGORY_MAP[c.category]
          const done = c.lessons.filter((l) => progress[l.id]?.done).length
          const next = c.lessons.find((l) => !progress[l.id]?.done)
          return (
            <Card key={c.id} className="overflow-hidden p-0">
              <button onClick={() => setCourse(c)} className="block w-full text-left">
                <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ background: meta.gradient }}>
                  <span className="text-[1.375rem]">{CAT_EMOJI[c.category]}</span>
                  <span className="min-w-0">
                    <span className="block text-[0.625rem] font-black opacity-90">
                      {meta.short} · {c.level}
                    </span>
                    <span className="block truncate text-[0.8125rem] font-black">{c.title}</span>
                  </span>
                </div>
              </button>
              <div className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <Bar value={done / c.lessons.length} color="bg-teal" />
                  <p className="mt-0.5 text-[0.625rem] font-bold text-sub">
                    {done}/{c.lessons.length} 레슨
                  </p>
                </div>
                {next ? (
                  <GameButton size="sm" onClick={() => open(next.id)}>
                    ▶ {next.minutes}분
                  </GameButton>
                ) : (
                  <Chip tone="green">수료 ✓</Chip>
                )}
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── 복습 (틀린 문제) ───────── */
function ReviewTab({ open }: { open: (lessonId: string) => void }) {
  const app = useApp()
  const [picked, setPicked] = useState<number | null>(null)
  const item = app.review.find((r) => LESSON_MAP[r.lessonId]?.quiz[r.quizIndex])
  if (!item)
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-[2.5rem]">✨</p>
          <p className="text-[1rem] font-black">복습할 문제가 없어요</p>
          <p className="text-[0.8125rem] text-sub">레슨 퀴즈에서 틀린 문제가 여기에 모여요.</p>
        </div>
      </div>
    )
  const lesson = LESSON_MAP[item.lessonId]
  const quiz = lesson.quiz[item.quizIndex]
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl bg-gradient-to-br from-[#EEF4FF] to-[#DDE8FF] p-3.5">
        <p className="text-[0.6875rem] font-black text-primary">
          복습 카드 · 남은 {app.review.length}장 · {lesson.title}
        </p>
        <p className="mt-1 text-[1rem] font-black leading-snug">{quiz.q}</p>
        {picked !== null && (
          <p className={cx('mt-2 rounded-xl p-2 text-[0.8125rem] font-semibold', picked === quiz.answer ? 'bg-teal-50 text-teal' : 'bg-coral-50 text-coral')}>
            {picked === quiz.answer ? '⭕ 이번엔 맞혔어요! ' : '❌ 다시 한번 볼까요? '}
            {quiz.explain}
          </p>
        )}
        <button onClick={() => open(item.lessonId)} className="mt-2 text-[0.75rem] font-black text-primary">
          📘 레슨 다시 보기
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {quiz.options.map((o, k) => (
          <button
            key={k}
            disabled={picked !== null}
            onClick={() => setPicked(k)}
            className={cx(
              'rounded-2xl border-2 px-3 py-2.5 text-left text-[0.875rem] font-bold',
              picked === null ? 'border-black/10 bg-white' : k === quiz.answer ? 'border-teal bg-teal-50' : picked === k ? 'border-coral bg-coral-50' : 'border-black/5 bg-white opacity-60',
            )}
          >
            {o}
          </button>
        ))}
        {picked !== null && (
          <GameButton
            tone="green"
            onClick={() => {
              if (picked === quiz.answer) {
                app.resolveReview(item.lessonId, item.quizIndex)
                useWorld.getState().addExp(5)
                toast('복습 정답 +5 EXP')
              } else {
                // 맨 뒤로 보내 다시 보기
                useApp.setState({ review: [...app.review.filter((r) => r !== item), item] })
              }
              setPicked(null)
            }}
          >
            다음
          </GameButton>
        )}
      </div>
    </div>
  )
}

/* ───────── 상담 창구 (FAQ 검색 + 사장님 커뮤니티) ───────── */
const readThisSession = new Set<string>()

function AskTab({ open }: { open: (lessonId: string) => void }) {
  const app = useApp()
  const name = useWorld((s) => s.name)
  const [query, setQuery] = useState('')
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [mode, setMode] = useState<'faq' | 'community' | 'write'>('faq')
  const [qid, setQid] = useState<string | null>(null)
  const [draft, setDraft] = useState({ title: '', body: '', category: 'tax' as CategoryId })
  const [reply, setReply] = useState('')
  const found = useMemo(() => searchAll(query, app.questions, 6), [query, app.questions])
  const faqs = query.trim().length >= 2 ? found.faqs : FAQS.slice(0, 12)

  const toggleFaq = (id: string) => {
    const next = openFaq === id ? null : id
    setOpenFaq(next)
    if (next) {
      app.readFaq(id)
      const key = `${todayKey()}:${id}`
      if (!readThisSession.has(key)) {
        readThisSession.add(key)
        useWorld.getState().bump('faq')
      }
    }
  }

  const question = qid ? app.questions.find((x) => x.id === qid) : null

  return (
    <div className="grid h-full gap-3 md:grid-cols-[1fr_14rem]">
      <div className="min-w-0">
        <div className="mb-2 flex gap-1">
          {(
            [
              ['faq', '❓ 자주 묻는 질문'],
              ['community', '💬 사장님 질문방'],
              ['write', '✏️ 질문하기'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                setMode(id)
                setQid(null)
              }}
              className={cx('h-8 rounded-xl px-3 text-[0.75rem] font-black', mode === id ? 'bg-ink text-white' : 'bg-black/5')}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'faq' && (
          <>
            <label className="mb-2 flex h-10 items-center gap-2 rounded-xl border-2 border-black/10 bg-white px-3 focus-within:border-primary">
              <Search className="size-4 text-mute" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 부가세 언제 내요? / 알바 주휴수당" className="h-full flex-1 bg-transparent text-[0.875rem] font-bold outline-none" />
            </label>
            {query.trim().length >= 2 && !faqs.length && !found.lessons.length && <p className="py-4 text-center text-[0.8125rem] font-semibold text-sub">찾는 답이 없어요. "질문하기"로 사장님들께 물어보세요.</p>}
            <div className="space-y-1.5">
              {faqs.map((f) => (
                <Card key={f.id} className="p-0">
                  <button onClick={() => toggleFaq(f.id)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
                    <span>{CAT_EMOJI[f.category]}</span>
                    <span className="flex-1 text-[0.875rem] font-black">{f.q}</span>
                    {app.faqRead.includes(f.id) && <Chip tone="green">읽음</Chip>}
                  </button>
                  {openFaq === f.id && (
                    <div className="border-t-2 border-black/5 px-3 py-2.5">
                      <p className="text-[0.8125rem] font-medium leading-relaxed text-ink/85">{f.a}</p>
                      {f.lessonId && LESSON_MAP[f.lessonId] && (
                        <button onClick={() => open(f.lessonId!)} className="mt-1.5 text-[0.75rem] font-black text-primary">
                          📘 관련 레슨: {LESSON_MAP[f.lessonId].title}
                        </button>
                      )}
                    </div>
                  )}
                </Card>
              ))}
              {found.lessons.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {found.lessons.map((l) => (
                    <button key={l.id} onClick={() => open(l.id)} className="rounded-full bg-primary-50 px-2.5 py-1 text-[0.75rem] font-black text-primary">
                      📘 {l.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'community' && !question && (
          <div className="space-y-1.5">
            {app.questions.map((x) => (
              <Card key={x.id} onClick={() => setQid(x.id)} className="w-full py-2.5">
                <span className="flex items-center gap-1.5">
                  <span>{CAT_EMOJI[x.category]}</span>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] font-black">{x.title}</span>
                  {x.mine && <Chip tone="violet">내 질문</Chip>}
                </span>
                <span className="mt-0.5 flex items-center gap-2 text-[0.6875rem] font-semibold text-sub">
                  <span>{x.author}</span>
                  <span>{relativeTime(x.createdAt)}</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="size-3" /> {x.likes}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="size-3" /> {x.answers.length}
                  </span>
                </span>
              </Card>
            ))}
          </div>
        )}

        {mode === 'community' && question && (
          <div>
            <button onClick={() => setQid(null)} className="mb-2 flex items-center gap-0.5 rounded-xl bg-black/5 px-2 py-1 text-[0.75rem] font-black">
              <ArrowLeft className="size-3.5" /> 질문 목록
            </button>
            <Card>
              <p className="text-[0.6875rem] font-black text-sub">
                {CAT_EMOJI[question.category]} {CATEGORY_MAP[question.category].short} · {question.author}
              </p>
              <p className="text-[0.9375rem] font-black">{question.title}</p>
              <p className="mt-1 text-[0.8125rem] font-medium text-ink/85">{question.body}</p>
              <button onClick={() => app.toggleLike(question.id)} className={cx('mt-1.5 flex items-center gap-1 text-[0.75rem] font-black', question.liked ? 'text-coral' : 'text-sub')}>
                <Heart className="size-3.5" fill={question.liked ? 'currentColor' : 'none'} /> 나도 궁금해요 {question.likes}
              </button>
            </Card>
            <div className="mt-2 space-y-1.5">
              {question.answers.map((a) => (
                <div key={a.id} className={cx('rounded-2xl p-2.5', a.role === 'helper' ? 'bg-primary-50' : a.role === 'mentor' ? 'bg-teal-50' : 'bg-black/5')}>
                  <p className="text-[0.6875rem] font-black text-sub">
                    {a.role === 'helper' ? '🤖' : a.role === 'mentor' ? '🎓' : a.role === 'me' ? '🙋' : '🧑‍🍳'} {a.author} · {relativeTime(a.createdAt)}
                  </p>
                  <p className="text-[0.8125rem] font-medium">{a.body}</p>
                  {a.links?.map((lk) =>
                    lk.kind === 'lesson' && LESSON_MAP[lk.id] ? (
                      <button key={lk.id} onClick={() => open(lk.id)} className="mr-2 mt-1 text-[0.75rem] font-black text-primary">
                        📘 {LESSON_MAP[lk.id].title}
                      </button>
                    ) : lk.kind === 'faq' && FAQ_MAP[lk.id] ? (
                      <button
                        key={lk.id}
                        onClick={() => {
                          setMode('faq')
                          setQuery(FAQ_MAP[lk.id].q)
                          setOpenFaq(null)
                        }}
                        className="mr-2 mt-1 text-[0.75rem] font-black text-primary"
                      >
                        ❓ {FAQ_MAP[lk.id].q}
                      </button>
                    ) : null,
                  )}
                  {a.role !== 'helper' && a.role !== 'me' && (
                    <button onClick={() => app.toggleHelpful(question.id, a.id)} className={cx('mt-1 block text-[0.6875rem] font-black', a.markedHelpful ? 'text-teal' : 'text-sub')}>
                      👍 도움이 됐어요 {a.helpful}
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="경험을 나눠 주세요" className="h-10 flex-1 rounded-xl border-2 border-black/10 bg-white px-3 text-[0.875rem] font-bold outline-none focus:border-primary" />
              <GameButton
                disabled={!reply.trim()}
                onClick={() => {
                  app.addAnswer(question.id, reply.trim(), name || '나')
                  setReply('')
                  useWorld.getState().addExp(5)
                  toast('답변을 남겼어요 +5 EXP')
                }}
              >
                <Send className="size-4" />
              </GameButton>
            </div>
          </div>
        )}

        {mode === 'write' && (
          <div className="space-y-2">
            <div className="no-scrollbar flex gap-1 overflow-x-auto">
              {CATEGORIES.map((c) => (
                <button key={c.id} onClick={() => setDraft({ ...draft, category: c.id })} className={cx('h-8 shrink-0 rounded-xl px-2.5 text-[0.75rem] font-black', draft.category === c.id ? 'bg-ink text-white' : 'bg-black/5')}>
                  {CAT_EMOJI[c.id]} {c.short}
                </button>
              ))}
            </div>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={40} placeholder="제목 (예: 알바 주휴수당 계산이 헷갈려요)" className="h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 text-[0.875rem] font-bold outline-none focus:border-primary" />
            <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={3} placeholder="상황을 적어 주세요" className="w-full rounded-xl border-2 border-black/10 bg-white p-3 text-[0.875rem] font-medium outline-none focus:border-primary" />
            <GameButton
              tone="green"
              disabled={draft.title.trim().length < 2}
              onClick={() => {
                const id = app.addQuestion({ category: draft.category, title: draft.title.trim(), body: draft.body.trim(), author: name || '나' })
                setDraft({ title: '', body: '', category: draft.category })
                setMode('community')
                setQid(id)
                useWorld.getState().addExp(5)
                toast('질문을 올렸어요. 도우미가 관련 자료를 찾아 줬어요')
              }}
            >
              질문 올리기
            </GameButton>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[0.75rem] font-black">📞 진짜 상담이 필요할 때</p>
        {HOTLINES.map((h) => (
          <a key={h.tel} href={`tel:${h.tel}`} className="flex items-center gap-2 rounded-2xl border-2 border-black/5 bg-white p-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-teal-50 text-teal">
              <Phone className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.8125rem] font-black">
                {h.tel} <span className="text-[0.6875rem] font-bold text-sub">{h.name}</span>
              </span>
              <span className="block truncate text-[0.6875rem] font-semibold text-sub">{h.desc}</span>
            </span>
          </a>
        ))}
        <p className="text-[0.625rem] font-semibold text-mute">세금·노무 내용은 일반 안내예요. 기준은 바뀔 수 있으니 공식 기관에서 꼭 확인하세요.</p>
      </div>
    </div>
  )
}

/* ───────── 노하우 (배운 만큼 가게가 강해져요) ───────── */
function SkillTab() {
  const progress = useApp((s) => s.progress)
  const skills = skillsFromProgress(progress)
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {CATEGORIES.map((c) => {
        const lv = skills[c.id]
        const max = skillMax(c.id)
        return (
          <Card key={c.id} className="flex items-center gap-2.5">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl text-[1.375rem]" style={{ background: c.soft }}>
              {CAT_EMOJI[c.id]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between">
                <span className="text-[0.875rem] font-black">{c.name}</span>
                <span className="text-[0.75rem] font-black" style={{ color: c.color }}>
                  Lv {lv}/{max}
                </span>
              </span>
              <Bar value={lv / max} className="mt-1" color="bg-primary" />
              <span className="mt-0.5 block text-[0.6875rem] font-semibold text-sub">{SKILL_EFFECT[c.id]}</span>
            </span>
          </Card>
        )
      })}
    </div>
  )
}

export function AcademyPanel({ onClose, lessonId }: { onClose: () => void; lessonId?: string }) {
  const review = useApp((s) => s.review.length)
  const [tab, setTab] = useState<Tab>('learn')
  const [active, setActive] = useState<string | null>(lessonId ?? null)
  const lesson = active ? LESSON_MAP[active] : null
  const fromOutside = useRef(!!lessonId)

  return (
    <Panel
      title="배움터"
      icon="🏫"
      color="#7B61FF"
      wide
      onClose={() => {
        stopSpeaking()
        onClose()
      }}
      tabs={
        !lesson && (
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'learn', label: '📚 3분 레슨' },
              { id: 'review', label: '🔁 복습', badge: review },
              { id: 'ask', label: '💬 상담 창구' },
              { id: 'skill', label: '⭐ 노하우' },
            ]}
          />
        )
      }
    >
      {lesson ? (
        <LessonView
          key={lesson.id}
          lesson={lesson}
          course={COURSE_MAP[lesson.courseId]}
          onBack={() => {
            stopSpeaking()
            setActive(null)
          }}
          onDone={fromOutside.current ? onClose : undefined}
        />
      ) : (
        <>
          {tab === 'learn' && <LearnTab open={setActive} />}
          {tab === 'review' && <ReviewTab open={setActive} />}
          {tab === 'ask' && <AskTab open={setActive} />}
          {tab === 'skill' && <SkillTab />}
        </>
      )}
    </Panel>
  )
}
