import { useMemo, useRef, useState } from 'react'
import { ArrowLeft, Heart, MessageCircle, Phone, Search, Send } from 'lucide-react'
import type { CategoryId } from '@/types'
import { COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { FAQS, FAQ_MAP, HOTLINES } from '@/data/faq'
import { CATEGORIES, CATEGORY_MAP } from '@/data/categories'
import { useApp } from '@/store/app'
import { searchAll } from '@/lib/match'
import { stopSpeaking } from '@/lib/speech'
import { relativeTime, todayKey } from '@/lib/date'
import { SKILL_EFFECT, skillMax, skillsFromProgress } from '@/game/skills'
import { useWorld } from '../store'
import { Bar, Card, Chip, cx, GameButton, Panel, Tabs, toast } from '../ui/kit'
import { CAT_EMOJI } from '../learn'
import { CollectionTab, LessonStage, StageMap } from './LearnGame'
import { sfx } from '../audio'

export { CAT_EMOJI }

type Tab = 'learn' | 'book' | 'review' | 'ask' | 'skill'

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
                useApp.setState({
                  review: [...app.review.filter((r) => r !== item), item],
                })
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
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    category: 'tax' as CategoryId,
  })
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
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 부가세 언제 내요? / 알바 주휴수당"
                className="h-full flex-1 bg-transparent text-[0.875rem] font-bold outline-none"
              />
            </label>
            {query.trim().length >= 2 && !faqs.length && !found.lessons.length && (
              <p className="py-4 text-center text-[0.8125rem] font-semibold text-sub">찾는 답이 없어요. "질문하기"로 사장님들께 물어보세요.</p>
            )}
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
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="경험을 나눠 주세요"
                className="h-10 flex-1 rounded-xl border-2 border-black/10 bg-white px-3 text-[0.875rem] font-bold outline-none focus:border-primary"
              />
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
                <button
                  key={c.id}
                  onClick={() => setDraft({ ...draft, category: c.id })}
                  className={cx('h-8 shrink-0 rounded-xl px-2.5 text-[0.75rem] font-black', draft.category === c.id ? 'bg-ink text-white' : 'bg-black/5')}
                >
                  {CAT_EMOJI[c.id]} {c.short}
                </button>
              ))}
            </div>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              maxLength={40}
              placeholder="제목 (예: 알바 주휴수당 계산이 헷갈려요)"
              className="h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 text-[0.875rem] font-bold outline-none focus:border-primary"
            />
            <textarea
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
              rows={3}
              placeholder="상황을 적어 주세요"
              className="w-full rounded-xl border-2 border-black/10 bg-white p-3 text-[0.875rem] font-medium outline-none focus:border-primary"
            />
            <GameButton
              tone="green"
              disabled={draft.title.trim().length < 2}
              onClick={() => {
                const id = app.addQuestion({
                  category: draft.category,
                  title: draft.title.trim(),
                  body: draft.body.trim(),
                  author: name || '나',
                })
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
            onChange={(t) => {
              sfx('tap')
              setTab(t)
            }}
            tabs={[
              { id: 'learn', label: '🗺️ 스테이지' },
              { id: 'book', label: '📖 도감' },
              { id: 'review', label: '🔁 복습', badge: review },
              { id: 'ask', label: '💬 상담 창구' },
              { id: 'skill', label: '⭐ 노하우' },
            ]}
          />
        )
      }
    >
      {lesson ? (
        <LessonStage
          key={lesson.id}
          lesson={lesson}
          course={COURSE_MAP[lesson.courseId]}
          onBack={() => {
            stopSpeaking()
            fromOutside.current = false
            setActive(null)
            setTab('learn')
          }}
          onNext={(id) => {
            fromOutside.current = false
            setActive(id)
          }}
          onDone={fromOutside.current ? onClose : undefined}
        />
      ) : (
        <>
          {tab === 'learn' && <StageMap open={setActive} />}
          {tab === 'book' && <CollectionTab open={setActive} />}
          {tab === 'review' && <ReviewTab open={setActive} />}
          {tab === 'ask' && <AskTab open={setActive} />}
          {tab === 'skill' && <SkillTab />}
        </>
      )}
    </Panel>
  )
}
