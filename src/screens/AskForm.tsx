import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Lightbulb } from 'lucide-react'
import type { CategoryId } from '@/types'
import { useApp } from '@/store/app'
import { CATEGORIES } from '@/data/categories'
import { searchAll } from '@/lib/match'
import { FaqItem, QuestionCard } from '@/components/QA'
import { Icon } from '@/components/Icon'
import { cx, PrimaryButton, TopBar } from '@/components/ui'

export function AskForm() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const addQuestion = useApp((s) => s.addQuestion)
  const questions = useApp((s) => s.questions)
  const interests = useApp((s) => s.profile.interests)
  const [category, setCategory] = useState<CategoryId>(interests[0] ?? 'tax')
  const [picked, setPicked] = useState(false)
  const [title, setTitle] = useState(params.get('title') ?? '')
  const [body, setBody] = useState('')

  const similar = useMemo(() => searchAll(`${title} ${body}`, questions, 2), [title, body, questions])
  const valid = title.trim().length >= 5 && body.trim().length >= 5
  const hasSimilar = title.trim().length >= 2 && (similar.faqs.length > 0 || similar.questions.length > 0)

  // 사장님이 직접 고르기 전까지는 내용과 가장 비슷한 분야로 자동 선택
  const guess = similar.faqs[0]?.category ?? similar.questions[0]?.category
  useEffect(() => {
    if (!picked && guess) setCategory(guess)
  }, [guess, picked])

  const submit = () => {
    if (!valid) return
    const id = addQuestion({ category, title: title.trim(), body: body.trim() })
    nav(`/ask/${id}`, { replace: true })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title="질문하기" />
      <div className="flex-1 space-y-5 px-5 pb-6">
        <div>
          <p className="text-[0.8125rem] font-bold text-sub">분야 {!picked && guess && <span className="font-semibold text-primary">· 내용을 보고 골라 뒀어요</span>}</p>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => {
              const on = category === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategory(c.id)
                    setPicked(true)
                  }}
                  aria-pressed={on}
                  className={cx('flex flex-col items-center gap-1.5 rounded-2xl py-3 text-[0.75rem] font-bold transition', on ? 'text-white shadow-card' : 'bg-white text-ink shadow-card')}
                  style={on ? { background: c.color } : undefined}
                >
                  <Icon name={c.icon} className="size-5" />
                  {c.short}
                </button>
              )
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-[0.8125rem] font-bold text-sub">제목</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="한 줄로 질문을 적어 주세요"
            className="mt-2 h-14 w-full rounded-2xl bg-white px-4 text-[1rem] font-semibold shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="text-[0.8125rem] font-bold text-sub">내용</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            maxLength={1000}
            placeholder={'상황을 조금 더 알려 주시면 답하기 쉬워요.\n예: 업종, 직원 수, 언제부터 생긴 일인지'}
            className="mt-2 w-full resize-none rounded-2xl bg-white p-4 text-[0.9375rem] leading-relaxed shadow-card outline-none ring-primary placeholder:text-mute focus:ring-2"
          />
          <span className="mt-1 block text-right text-[0.75rem] font-semibold text-mute">{body.length}/1000</span>
        </label>

        {hasSimilar && (
          <div className="space-y-2.5 rounded-[24px] bg-sun-50 p-4 ring-1 ring-sun/40">
            <p className="flex items-center gap-1.5 text-[0.875rem] font-bold">
              <Lightbulb className="size-5 text-[#B7860B]" /> 올리기 전에 이 답을 확인해 보세요
            </p>
            {similar.faqs.map((f) => (
              <FaqItem key={f.id} faq={f} />
            ))}
            {similar.questions.map((q) => (
              <QuestionCard key={q.id} q={q} />
            ))}
          </div>
        )}

        <p className="text-[0.7812rem] leading-relaxed text-mute">
          전화번호·주민번호 같은 개인정보는 적지 말아 주세요. 세무·노무 답변은 일반적인 안내이며, 개별 상황은 전문가 상담을 권해요.
        </p>
      </div>
      <div className="pb-safe-5 sticky bottom-0 bg-bg/95 px-5 pt-3 backdrop-blur">
        <PrimaryButton onClick={submit} disabled={!valid}>
          질문 올리기
        </PrimaryButton>
      </div>
    </div>
  )
}
