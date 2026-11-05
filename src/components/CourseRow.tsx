import { useNavigate } from 'react-router-dom'
import { Bookmark, CircleCheck, Clock, Layers } from 'lucide-react'
import type { Course } from '@/types'
import { useApp } from '@/store/app'
import { courseMinutes } from '@/data/courses'
import { courseProgress } from '@/lib/recommend'
import { CategoryTag, cx, ProgressBar, Thumb } from './ui'

export function CourseRow({ course }: { course: Course }) {
  const nav = useNavigate()
  const progress = useApp((s) => s.progress)
  const saved = useApp((s) => s.bookmarks.includes(course.id))
  const toggle = useApp((s) => s.toggleBookmark)
  const p = courseProgress(course, progress)

  return (
    <div className="relative flex gap-3.5 rounded-[20px] bg-white p-3 shadow-card">
      <button onClick={() => nav(`/course/${course.id}`)} className="flex min-w-0 flex-1 gap-3.5 text-left">
        <Thumb category={course.category} className="size-[6.5rem] shrink-0 rounded-2xl" iconSize={34}>
          {p === 1 && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[0.6875rem] font-bold text-teal">
              <CircleCheck className="size-3.5" /> 수료
            </span>
          )}
        </Thumb>
        <span className="min-w-0 flex-1 py-1 pr-7">
          <CategoryTag id={course.category} />
          <span className="mt-0.5 line-clamp-2 block text-[0.9688rem] font-bold leading-snug">{course.title}</span>
          <span className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.75rem] font-semibold text-sub">
            <span className="flex items-center gap-1">
              <Layers className="size-3.5" />
              레슨 {course.lessons.length}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" />총 {courseMinutes(course)}분
            </span>
            <span className="text-mute">{course.level}</span>
          </span>
          {p > 0 && (
            <span className="mt-2.5 flex items-center gap-2">
              <ProgressBar value={p} color={p === 1 ? 'bg-teal' : 'bg-primary'} />
              <span className={cx('shrink-0 text-[0.6875rem] font-bold', p === 1 ? 'text-teal' : 'text-primary')}>{Math.round(p * 100)}%</span>
            </span>
          )}
        </span>
      </button>
      <button
        aria-label={saved ? '저장 취소' : '저장'}
        onClick={() => toggle(course.id)}
        className="absolute right-3 top-3 grid size-8 place-items-center rounded-full"
      >
        <Bookmark className={cx('size-5', saved ? 'text-coral' : 'text-teal')} fill={saved ? 'currentColor' : 'none'} />
      </button>
    </div>
  )
}
