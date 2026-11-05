import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Check, CircleCheck, Clock, Headphones, Layers, Play, Signal } from 'lucide-react'
import { useApp } from '@/store/app'
import { COURSE_MAP, courseMinutes } from '@/data/courses'
import { CATEGORY_MAP } from '@/data/categories'
import { courseProgress, nextLessonOf } from '@/lib/recommend'
import { CategoryTag, cx, PrimaryButton, ProgressBar, Segmented, Thumb, TopBar } from '@/components/ui'

export function CourseDetail() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const course = COURSE_MAP[id]
  const progress = useApp((s) => s.progress)
  const saved = useApp((s) => s.bookmarks.includes(id))
  const toggle = useApp((s) => s.toggleBookmark)
  const [tab, setTab] = useState<'about' | 'curriculum'>('curriculum')
  if (!course) return <Navigate to="/learn" replace />

  const next = nextLessonOf(course, progress)
  const p = courseProgress(course, progress)
  const cat = CATEGORY_MAP[course.category]

  return (
    <div className="min-h-dvh pb-32">
      <div className="relative">
        <Thumb category={course.category} className="h-[16.25rem] w-full" iconSize={64} />
        <div className="absolute inset-x-0 top-0">
          <TopBar
            transparent
            right={
              <button
                aria-label={saved ? '저장 취소' : '저장'}
                onClick={() => toggle(course.id)}
                className="grid size-10 place-items-center rounded-full bg-white/90 shadow-card"
              >
                <Bookmark className={cx('size-5', saved ? 'text-coral' : 'text-ink')} fill={saved ? 'currentColor' : 'none'} />
              </button>
            }
          />
        </div>
      </div>

      <div className="relative -mt-10 rounded-t-[28px] bg-bg px-5 pt-6">
        <div className="rounded-[24px] bg-white p-5 shadow-card">
          <CategoryTag id={course.category} />
          <h1 className="mt-1 text-[1.375rem] font-extrabold leading-snug tracking-tight">{course.title}</h1>
          <p className="mt-1 text-[0.875rem] font-semibold text-sub">{course.subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[0.8125rem] font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Layers className="size-4 text-primary" />
              레슨 {course.lessons.length}개
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4 text-primary" />총 {courseMinutes(course)}분
            </span>
            <span className="flex items-center gap-1.5">
              <Signal className="size-4 text-primary" />
              {course.level}
            </span>
            <span className="flex items-center gap-1.5">
              <Headphones className="size-4 text-primary" />
              듣기 모드
            </span>
          </div>
          {p > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <ProgressBar value={p} color={p === 1 ? 'bg-teal' : 'bg-primary'} />
              <span className="shrink-0 text-[0.75rem] font-bold text-primary">{Math.round(p * 100)}%</span>
            </div>
          )}
        </div>

        <div className="mt-5">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'curriculum', label: '커리큘럼' },
              { value: 'about', label: '소개' },
            ]}
          />
        </div>

        {tab === 'about' ? (
          <div className="mt-5 space-y-5">
            <p className="text-[0.9375rem] leading-relaxed text-ink">{course.description}</p>
            <div className="rounded-[20px] bg-white p-5 shadow-card">
              <h2 className="text-[1rem] font-bold">이 코스를 마치면</h2>
              <ul className="mt-3 space-y-2.5">
                {course.outcomes.map((o) => (
                  <li key={o} className="flex items-start gap-2.5 text-[0.875rem] font-semibold">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-white" style={{ background: cat.color }}>
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {o}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              {course.tags.map((t) => (
                <span key={t} className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] font-semibold text-sub ring-1 ring-line">
                  #{t}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-[20px] bg-white shadow-card">
            <div className="flex items-center justify-between px-5 pb-1 pt-4">
              <p className="text-[0.875rem] font-bold">
                레슨 목록 <span className="text-primary">· {course.subtitle}</span>
              </p>
              <span className="text-[0.75rem] font-bold text-primary">{courseMinutes(course)}분</span>
            </div>
            {course.lessons.map((l, i) => {
              const done = progress[l.id]?.done
              const isNext = next?.id === l.id
              const resume = (progress[l.id]?.card ?? 0) > 0 && !done
              return (
                <button
                  key={l.id}
                  onClick={() => nav(`/lesson/${l.id}`)}
                  className={cx('flex w-full items-center gap-3.5 px-5 py-4 text-left', i > 0 && 'border-t border-line', isNext && 'bg-primary-50/60')}
                >
                  <span
                    className={cx(
                      'grid size-11 shrink-0 place-items-center rounded-full text-[0.875rem] font-extrabold',
                      done ? 'bg-teal text-white' : 'bg-bg text-ink ring-1 ring-line',
                    )}
                  >
                    {done ? <Check className="size-5" strokeWidth={3} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{l.title}</span>
                    <span className="text-[0.7812rem] font-semibold text-sub">
                      {l.minutes}분 · 카드 {l.cards.length}장 · 퀴즈 {l.quiz.length}
                      {resume && <span className="text-primary"> · 이어보기</span>}
                    </span>
                  </span>
                  {done ? (
                    <CircleCheck className="size-6 text-teal" />
                  ) : (
                    <span className={cx('grid size-7 place-items-center rounded-full', isNext ? 'bg-primary text-white' : 'bg-primary-50 text-primary')}>
                      <Play className="size-3.5 translate-x-px" fill="currentColor" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-30 flex justify-center">
        <div className="w-full max-w-[440px] rounded-t-[28px] bg-white px-5 pb-5 pt-4 shadow-nav">
          <PrimaryButton onClick={() => nav(`/lesson/${(next ?? course.lessons[0]).id}`)}>
            {p === 0 ? '첫 레슨 시작하기' : p === 1 ? '처음부터 다시 보기' : '이어서 학습하기'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
