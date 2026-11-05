import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, BookOpen, Bot, Send, ThumbsUp, Trash2 } from 'lucide-react'
import type { Answer } from '@/types'
import { useApp } from '@/store/app'
import { CATEGORY_MAP } from '@/data/categories'
import { FAQ_MAP } from '@/data/faq'
import { LESSON_MAP } from '@/data/courses'
import { relativeTime } from '@/lib/date'
import { FaqItem, Hotlines } from '@/components/QA'
import { Badge, cx, TopBar } from '@/components/ui'

const ROLE: Record<Answer['role'], { label: string; tone: 'primary' | 'teal' | 'mute' | 'sun' }> = {
  mentor: { label: '멘토', tone: 'teal' },
  owner: { label: '사장님', tone: 'mute' },
  me: { label: '나', tone: 'primary' },
  helper: { label: '자동 안내', tone: 'sun' },
}

export function QuestionDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const q = useApp((s) => s.questions.find((x) => x.id === id))
  const toggleLike = useApp((s) => s.toggleLike)
  const addAnswer = useApp((s) => s.addAnswer)
  const toggleHelpful = useApp((s) => s.toggleHelpful)
  const deleteQuestion = useApp((s) => s.deleteQuestion)
  const [text, setText] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  if (!q) return <Navigate to="/ask" replace />

  const c = CATEGORY_MAP[q.category]
  const send = () => {
    const t = text.trim()
    if (t.length < 2) return
    addAnswer(q.id, t)
    setText('')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar
        title="질문"
        right={
          q.mine && (
            <button
              onClick={() => (confirmDel ? (deleteQuestion(q.id), nav('/ask?tab=mine', { replace: true })) : setConfirmDel(true))}
              className={cx('flex h-10 items-center gap-1 rounded-full px-3 text-[0.8125rem] font-bold', confirmDel ? 'bg-coral text-white' : 'text-coral')}
            >
              <Trash2 className="size-4" />
              {confirmDel ? '삭제할까요?' : '삭제'}
            </button>
          )
        }
      />
      <div className="flex-1 space-y-4 px-5 pb-6">
        <article className="rounded-[24px] bg-white p-5 shadow-card">
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[0.75rem] font-bold" style={{ background: c.soft, color: c.color }}>
              {c.name}
            </span>
            <span className="text-[0.75rem] font-semibold text-mute">{relativeTime(q.createdAt)}</span>
          </div>
          <h1 className="mt-3 text-[1.25rem] font-extrabold leading-snug tracking-tight">{q.title}</h1>
          <p className="mt-3 whitespace-pre-line text-[0.9375rem] leading-relaxed text-ink/90">{q.body}</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[0.8125rem] font-semibold text-sub">
              {q.author}
              {q.bizLabel && ` · ${q.bizLabel}`}
            </span>
            <button
              onClick={() => toggleLike(q.id)}
              aria-pressed={!!q.liked}
              className={cx(
                'flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-bold ring-1 transition',
                q.liked ? 'bg-primary text-white ring-primary' : 'bg-white text-sub ring-line',
              )}
            >
              <ThumbsUp className="size-4" /> 나도 궁금해요 {q.likes}
            </button>
          </div>
        </article>

        <p className="px-1 text-[0.875rem] font-bold text-sub">답변 {q.answers.length}</p>
        {q.answers.length === 0 && (
          <div className="rounded-[20px] bg-white p-5 text-center text-[0.875rem] font-semibold text-sub shadow-card">
            아직 답변이 없어요. 경험이 있다면 먼저 나눠 주세요!
          </div>
        )}
        {q.answers.map((a) => (
          <div key={a.id} className={cx('rounded-[20px] p-4 shadow-card', a.role === 'helper' ? 'bg-sun-50 ring-1 ring-sun/40' : 'bg-white')}>
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  'grid size-9 place-items-center rounded-full text-[0.8125rem] font-bold text-white',
                  a.role === 'mentor' ? 'bg-teal' : a.role === 'me' ? 'bg-primary' : a.role === 'helper' ? 'bg-sun text-ink' : 'bg-mute',
                )}
              >
                {a.role === 'helper' ? <Bot className="size-5" /> : a.role === 'mentor' ? <BadgeCheck className="size-5" /> : a.author.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[0.875rem] font-bold">{a.author}</span>
                  <Badge tone={ROLE[a.role].tone}>{ROLE[a.role].label}</Badge>
                </span>
                <span className="text-[0.75rem] font-semibold text-mute">{relativeTime(a.createdAt)}</span>
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line text-[0.9062rem] leading-relaxed">{a.body}</p>
            {a.links && a.links.length > 0 && (
              <div className="mt-3 space-y-2">
                {a.links.map((l) =>
                  l.kind === 'faq' && FAQ_MAP[l.id] ? (
                    <FaqItem key={l.id} faq={FAQ_MAP[l.id]} />
                  ) : l.kind === 'lesson' && LESSON_MAP[l.id] ? (
                    <button key={l.id} onClick={() => nav(`/lesson/${l.id}`)} className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-card">
                      <BookOpen className="size-5 shrink-0 text-primary" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[0.75rem] font-bold text-primary">{LESSON_MAP[l.id].minutes}분 레슨</span>
                        <span className="block truncate text-[0.875rem] font-bold">{LESSON_MAP[l.id].title}</span>
                      </span>
                    </button>
                  ) : null,
                )}
              </div>
            )}
            {a.role === 'helper' && (!a.links || a.links.length === 0) && (
              <div className="mt-3">
                <Hotlines />
              </div>
            )}
            {(a.role === 'owner' || a.role === 'mentor') && (
              <button
                onClick={() => toggleHelpful(q.id, a.id)}
                aria-pressed={!!a.markedHelpful}
                className={cx('mt-3 flex items-center gap-1.5 text-[0.8125rem] font-bold', a.markedHelpful ? 'text-primary' : 'text-mute')}
              >
                <ThumbsUp className="size-4" fill={a.markedHelpful ? 'currentColor' : 'none'} /> 도움돼요 {a.helpful}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="pb-safe-4 sticky bottom-0 border-t border-line bg-white px-4 pt-3">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            maxLength={1000}
            placeholder="내 경험이나 답변 남기기"
            aria-label="답변 입력"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-3xl bg-bg px-4 py-3 text-[0.9375rem] outline-none ring-primary placeholder:text-mute focus:ring-2"
          />
          <button
            aria-label="답변 등록"
            onClick={send}
            disabled={text.trim().length < 2}
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-white disabled:opacity-40"
          >
            <Send className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
