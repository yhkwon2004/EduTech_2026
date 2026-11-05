import type { CategoryId, Course, Lesson, LessonProgress } from '@/types'
import { COURSES } from '@/data/courses'

export type LessonWithCourse = Lesson & { course: Course }

export function nextLessonOf(course: Course, progress: Record<string, LessonProgress>): Lesson | null {
  return course.lessons.find((l) => !progress[l.id]?.done) ?? null
}

export function courseProgress(course: Course, progress: Record<string, LessonProgress>): number {
  const done = course.lessons.filter((l) => progress[l.id]?.done).length
  return done / course.lessons.length
}

export function isStarted(course: Course, progress: Record<string, LessonProgress>): boolean {
  return course.lessons.some((l) => progress[l.id]?.done || (progress[l.id]?.card ?? 0) > 0)
}

/**
 * "지금 N분 있어요" 추천
 * - 코스마다 '다음 레슨' 하나만 후보 (순서대로 배우도록)
 * - N분 안에 끝나는 레슨만
 * - 점수: 이어서 하던 코스 > 관심 분야 > 짧은 것
 */
export function recommendLessons(params: {
  minutes: number
  interests: CategoryId[]
  progress: Record<string, LessonProgress>
  limit?: number
  courses?: Course[]
}): LessonWithCourse[] {
  const { minutes, interests, progress, limit = 3, courses = COURSES } = params
  const scored: { l: LessonWithCourse; score: number }[] = []
  courses.forEach((course, idx) => {
    const next = nextLessonOf(course, progress)
    if (!next || next.minutes > minutes) return
    let score = 0
    if (isStarted(course, progress)) score += 5
    if ((progress[next.id]?.card ?? 0) > 0) score += 3
    if (interests.includes(course.category)) score += 3
    score += (minutes - next.minutes) * -0.2 // 가진 시간을 꽉 채우는 쪽을 살짝 우대
    score -= idx * 0.01 // 동점이면 목록 순서
    scored.push({ l: { ...next, course }, score })
  })
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.l)
}

/** 학습 중인 코스 (진행률 0 초과, 100 미만) */
export function inProgressCourses(progress: Record<string, LessonProgress>, courses: Course[] = COURSES): Course[] {
  return courses.filter((c) => {
    const p = courseProgress(c, progress)
    return isStarted(c, progress) && p < 1
  })
}

export function completedCourses(progress: Record<string, LessonProgress>, courses: Course[] = COURSES): Course[] {
  return courses.filter((c) => courseProgress(c, progress) === 1)
}
