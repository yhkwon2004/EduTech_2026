import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, Info, MessageCircleQuestionMark, PenLine, Search, X } from 'lucide-react'
import type { CategoryId } from '@/types'
import { useApp } from '@/store/app'
import { CATEGORIES } from '@/data/categories'
import { FAQS } from '@/data/faq'
import { COURSE_MAP } from '@/data/courses'
import { searchAll } from '@/lib/match'
import { FaqItem, Hotlines, QuestionCard } from '@/components/QA'
import { CategoryTag, Chip, EmptyState, Segmented } from '@/components/ui'

type Tab = 'faq' | 'community' | 'mine'

export function Ask() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'faq'
  const [cat, setCat] = useState<CategoryId | null>(null)
  const [query, setQuery] = useState('')
  const questions = useApp((s) => s.questions)
  const results = useMemo(() => searchAll(query, questions), [query, questions])
  const searching = query.trim().length >= 2
  const nothing = searching && !results.faqs.length && !results.lessons.length && !results.questions.length

  const faqs = cat ? FAQS.filter((f) => f.category === cat) : FAQS
  const community = cat ? questions.filter((q) => q.category === cat) : questions
  const mine = questions.filter((q) => q.mine)

  return (
    <div className="pt-safe">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <h1 className="text-[1.625rem] font-extrabold tracking-tight">궁금한 점</h1>
        <button
          onClick={() => nav('/ask/new')}
          className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-[0.875rem] font-bold text-white shadow-float"
        >
          <PenLine className="size-4" /> 질문하기
        </button>
      </header>

      {/* 바로 찾기 */}
      <div className="px-5 pt-2">
        <div className="rounded-[24px] bg-gradient-to-br from-teal to-[#0D5A50] p-5 text-white shadow-[0_10px_30px_rgba(22,127,113,0.28)]">
          <p className="text-[1.125rem] font-extrabold">무엇이 궁금하세요?</p>
          <p className="mt-0.5 text-[0.8125rem] font-semibold text-white/80">입력하는 동안 바로 답을 찾아 드려요</p>
          <div className="mt-3 flex h-14 items-center gap-2 rounded-2xl bg-white px-4 text-ink">
            <Search className="size-5 shrink-0 text-sub" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 알바 주휴수당 기준"
              aria-label="질문 검색"
              className="h-full min-w-0 flex-1 bg-transparent text-[1rem] font-semibold outline-none placeholder:font-medium placeholder:text-mute"
            />
            {query && (
              <button aria-label="지우기" onClick={() => setQuery('')} className="grid size-7 place-items-center rounded-full bg-bg text-sub">
                <X className="size-4" />
              </button>
            )}
          </div>
          {!searching && (
            <div className="no-scrollbar -mx-5 mt-3 flex gap-2 overflow-x-auto px-5">
              {['부가세 신고', '주휴수당', '악성 리뷰', '지원사업', '원가율'].map((k) => (
                <button key={k} onClick={() => setQuery(k)} className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[0.7812rem] font-bold ring-1 ring-white/25">
                  #{k}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {searching ? (
        <div className="mt-5 space-y-5 px-5">
          {results.faqs.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[0.875rem] font-bold text-sub">바로 찾은 답</p>
              {results.faqs.map((f, i) => (
                <FaqItem key={f.id} faq={f} defaultOpen={i === 0} />
              ))}
            </div>
          )}
          {results.lessons.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[0.875rem] font-bold text-sub">관련 레슨</p>
              {results.lessons.map((l) => (
                <button key={l.id} onClick={() => nav(`/lesson/${l.id}`)} className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3.5 text-left shadow-card">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary">
                    <BookOpen className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <CategoryTag id={COURSE_MAP[l.courseId].category} />
                    <span className="block truncate text-[0.9375rem] font-bold">{l.title}</span>
                  </span>
                  <span className="text-[0.75rem] font-bold text-mute">{l.minutes}분</span>
                </button>
              ))}
            </div>
          )}
          {results.questions.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[0.875rem] font-bold text-sub">다른 사장님들의 비슷한 질문</p>
              {results.questions.map((q) => (
                <QuestionCard key={q.id} q={q} />
              ))}
            </div>
          )}
          {nothing && (
            <EmptyState icon={<MessageCircleQuestionMark className="size-7" />} title="딱 맞는 답을 아직 못 찾았어요" body="사장님들께 직접 물어보세요. 관련 자료도 함께 찾아 드려요." />
          )}
          <button
            onClick={() => nav(`/ask/new?title=${encodeURIComponent(query.trim())}`)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-[0.9375rem] font-bold text-primary ring-1 ring-primary/30"
          >
            <PenLine className="size-4.5" /> 원하는 답이 없나요? 질문 올리기
          </button>
        </div>
      ) : (
        <>
          <div className="mt-5 px-5">
            <Segmented<Tab>
              value={tab}
              onChange={(v) => setParams({ tab: v }, { replace: true })}
              options={[
                { value: 'faq', label: '자주 묻는 질문' },
                { value: 'community', label: '사장님 커뮤니티' },
                { value: 'mine', label: `내 질문${mine.length ? ` ${mine.length}` : ''}` },
              ]}
            />
          </div>
          {tab !== 'mine' && (
            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
              <Chip size="sm" active={!cat} onClick={() => setCat(null)}>
                전체
              </Chip>
              {CATEGORIES.map((c) => (
                <Chip size="sm" key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
                  {c.short}
                </Chip>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-2.5 px-5">
            {tab === 'faq' && (faqs.length ? faqs.map((f) => <FaqItem key={f.id} faq={f} />) : <EmptyState icon={<Info className="size-7" />} title="이 분야 FAQ를 준비 중이에요" />)}
            {tab === 'community' && (
              <>
                <p className="flex items-start gap-1.5 rounded-2xl bg-primary-50 p-3 text-[0.7812rem] font-semibold leading-relaxed text-primary-700">
                  <Info className="mt-0.5 size-4 shrink-0" />
                  커뮤니티 미리보기예요. 서버 연결 전까지는 예시 글과 내가 쓴 글·답변이 이 기기에만 저장돼요.
                </p>
                {community.length ? community.map((q) => <QuestionCard key={q.id} q={q} />) : <EmptyState icon={<MessageCircleQuestionMark className="size-7" />} title="아직 글이 없어요" />}
              </>
            )}
            {tab === 'mine' &&
              (mine.length ? (
                mine.map((q) => <QuestionCard key={q.id} q={q} />)
              ) : (
                <EmptyState
                  icon={<PenLine className="size-7" />}
                  title="아직 올린 질문이 없어요"
                  body="세금, 직원, 홍보… 무엇이든 물어보세요."
                  action={
                    <button onClick={() => nav('/ask/new')} className="h-12 w-full rounded-full bg-primary text-[0.9375rem] font-bold text-white">
                      첫 질문 올리기
                    </button>
                  }
                />
              ))}
          </div>

          <div className="mt-6 px-5">
            <Hotlines />
          </div>
        </>
      )}
    </div>
  )
}
