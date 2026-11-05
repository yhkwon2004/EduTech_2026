import { useNavigate, useSearchParams } from 'react-router-dom'
import { BookOpen, ChevronRight, MessageCircleQuestionMark, NotebookPen, RotateCcw, Search } from 'lucide-react'
import type { CategoryId } from '@/types'
import { useApp } from '@/store/app'
import { CATEGORIES } from '@/data/categories'
import { COURSES } from '@/data/courses'
import { completedCourses, inProgressCourses } from '@/lib/recommend'
import { totalMinutes } from '@/lib/stats'
import { CourseRow } from '@/components/CourseRow'
import { Chip, EmptyState, Segmented } from '@/components/ui'

type Tab = 'all' | 'ongoing' | 'done' | 'saved'

export function Learn() {
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'all'
  const cat = (params.get('cat') as CategoryId | null) ?? null
  const progress = useApp((s) => s.progress)
  const logs = useApp((s) => s.logs)
  const bookmarks = useApp((s) => s.bookmarks)
  const review = useApp((s) => s.review)
  const notes = useApp((s) => s.notes)

  const set = (next: { tab?: Tab; cat?: CategoryId | null }) => {
    const p = new URLSearchParams(params)
    if (next.tab !== undefined) p.set('tab', next.tab)
    if (next.cat !== undefined) {
      if (next.cat) p.set('cat', next.cat)
      else p.delete('cat')
    }
    setParams(p, { replace: true })
  }

  const doneLessons = Object.values(progress).filter((p) => p.done).length
  let list = COURSES
  if (tab === 'ongoing') list = inProgressCourses(progress)
  if (tab === 'done') list = completedCourses(progress)
  if (tab === 'saved') list = COURSES.filter((c) => bookmarks.includes(c.id))
  if (tab === 'all' && cat) list = list.filter((c) => c.category === cat)

  return (
    <div className="pt-safe">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <h1 className="text-[1.625rem] font-extrabold tracking-tight">배움</h1>
        <div className="flex gap-2">
          <button onClick={() => nav('/ask')} className="flex h-11 items-center gap-1.5 rounded-full bg-white px-4 text-[0.875rem] font-bold text-teal shadow-card">
            <MessageCircleQuestionMark className="size-4.5" /> 궁금한 점
          </button>
          <button aria-label="검색" onClick={() => nav('/search')} className="grid size-11 place-items-center rounded-full bg-white shadow-card">
            <Search className="size-5" />
          </button>
        </div>
      </header>

      <div className="mt-2 grid grid-cols-3 gap-2.5 px-5">
        {[
          ['완료 레슨', `${doneLessons}개`],
          ['누적 학습', `${totalMinutes(logs)}분`],
          ['수료 코스', `${completedCourses(progress).length}개`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-white px-3 py-3 text-center shadow-card">
            <p className="text-[1.125rem] font-extrabold text-ink">{v}</p>
            <p className="text-[0.75rem] font-semibold text-sub">{k}</p>
          </div>
        ))}
      </div>

      {(review.length > 0 || Object.keys(notes).length > 0) && (
        <div className="mt-3 grid grid-cols-2 gap-2.5 px-5">
          <button
            onClick={() => nav('/review')}
            disabled={review.length === 0}
            className="flex items-center gap-2.5 rounded-2xl bg-coral-50 p-3.5 text-left disabled:opacity-50"
          >
            <RotateCcw className="size-5 shrink-0 text-coral" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-bold">오답 복습</span>
              <span className="text-[0.75rem] font-semibold text-sub">{review.length}문제</span>
            </span>
            <ChevronRight className="size-4 text-mute" />
          </button>
          <button onClick={() => nav('/my?sheet=notes')} className="flex items-center gap-2.5 rounded-2xl bg-violet-50 p-3.5 text-left">
            <NotebookPen className="size-5 shrink-0 text-violet" />
            <span className="min-w-0 flex-1">
              <span className="block text-[0.875rem] font-bold">내 메모</span>
              <span className="text-[0.75rem] font-semibold text-sub">{Object.keys(notes).length}개</span>
            </span>
            <ChevronRight className="size-4 text-mute" />
          </button>
        </div>
      )}

      <div className="mt-5 px-5">
        <Segmented<Tab>
          value={tab}
          onChange={(v) => set({ tab: v })}
          options={[
            { value: 'all', label: '전체' },
            { value: 'ongoing', label: '학습 중' },
            { value: 'done', label: '수료' },
            { value: 'saved', label: '저장' },
          ]}
        />
      </div>

      {tab === 'all' && (
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
          <Chip active={!cat} onClick={() => set({ cat: null })}>
            전체
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.id} active={cat === c.id} onClick={() => set({ cat: c.id })}>
              {c.short}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3 px-5">
        {list.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="size-7" />}
            title={tab === 'ongoing' ? '학습 중인 코스가 없어요' : tab === 'done' ? '아직 수료한 코스가 없어요' : '저장한 코스가 없어요'}
            body={tab === 'saved' ? '코스 카드의 북마크를 눌러 저장해 보세요.' : '홈에서 "지금 몇 분?"을 골라 바로 시작해 보세요.'}
          />
        ) : (
          list.map((c) => <CourseRow key={c.id} course={c} />)
        )}
      </div>
    </div>
  )
}
