import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, Search as SearchIcon, X } from 'lucide-react'
import { useApp } from '@/store/app'
import { COURSES, COURSE_MAP } from '@/data/courses'
import { searchAll, scoreText } from '@/lib/match'
import { FaqItem, QuestionCard } from '@/components/QA'
import { CourseRow } from '@/components/CourseRow'
import { CategoryTag, EmptyState } from '@/components/ui'

const SUGGEST = ['부가세 신고', '리뷰 답글', '주휴수당', '원가율', '지원사업 서류', '냉장고 온도', '인스타 해시태그', '컴플레인']

export function Search() {
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const questions = useApp((s) => s.questions)
  const r = useMemo(() => searchAll(q, questions), [q, questions])
  const courses = useMemo(
    () =>
      q.trim().length < 2
        ? []
        : COURSES.map((c) => ({ c, s: scoreText(q, `${c.title} ${c.subtitle} ${c.description}`, c.tags) }))
            .filter((x) => x.s >= 0.34)
            .sort((a, b) => b.s - a.s)
            .slice(0, 3)
            .map((x) => x.c),
    [q],
  )
  const active = q.trim().length >= 2
  const empty = active && !courses.length && !r.lessons.length && !r.faqs.length && !r.questions.length

  return (
    <div className="min-h-dvh">
      <header className="pt-safe sticky top-0 z-30 bg-bg/95 backdrop-blur">
        <div className="flex items-center gap-2 px-3 py-3">
          <button aria-label="뒤로" onClick={() => nav(-1)} className="grid size-10 shrink-0 place-items-center rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-white px-3.5 shadow-card">
            <SearchIcon className="size-5 shrink-0 text-sub" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="레슨, 질문, 자주 묻는 질문 검색"
              aria-label="검색어"
              className="h-full min-w-0 flex-1 bg-transparent text-[1rem] font-semibold outline-none placeholder:font-medium placeholder:text-mute"
            />
            {q && (
              <button aria-label="지우기" onClick={() => setQ('')} className="grid size-7 place-items-center rounded-full bg-bg">
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-6 px-5 pb-10 pt-2">
        {!active && (
          <div>
            <p className="text-[0.875rem] font-bold text-sub">이런 걸 많이 찾아요</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {SUGGEST.map((s) => (
                <button key={s} onClick={() => setQ(s)} className="rounded-full bg-white px-3.5 py-2 text-[0.875rem] font-semibold text-ink shadow-card">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {courses.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[0.875rem] font-bold text-sub">코스</p>
            {courses.map((c) => (
              <CourseRow key={c.id} course={c} />
            ))}
          </div>
        )}
        {r.lessons.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[0.875rem] font-bold text-sub">레슨</p>
            {r.lessons.map((l) => (
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
        {r.faqs.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[0.875rem] font-bold text-sub">자주 묻는 질문</p>
            {r.faqs.map((f) => (
              <FaqItem key={f.id} faq={f} />
            ))}
          </div>
        )}
        {r.questions.length > 0 && (
          <div className="space-y-2.5">
            <p className="text-[0.875rem] font-bold text-sub">커뮤니티</p>
            {r.questions.map((x) => (
              <QuestionCard key={x.id} q={x} />
            ))}
          </div>
        )}
        {empty && (
          <EmptyState
            icon={<SearchIcon className="size-7" />}
            title="검색 결과가 없어요"
            body="다른 말로 찾아보거나, 사장님들께 직접 물어보세요."
            action={
              <button onClick={() => nav(`/ask/new?title=${encodeURIComponent(q.trim())}`)} className="h-12 w-full rounded-full bg-primary text-[0.9375rem] font-bold text-white">
                질문 올리기
              </button>
            }
          />
        )}
      </div>
    </div>
  )
}
