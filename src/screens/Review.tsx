import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CircleCheck, CircleX, RotateCcw, Trophy, X } from 'lucide-react'
import { useApp } from '@/store/app'
import { COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { CATEGORY_MAP } from '@/data/categories'
import { cx, EmptyState, PrimaryButton, TopBar } from '@/components/ui'

export function Review() {
  const nav = useNavigate()
  const review = useApp((s) => s.review)
  const resolve = useApp((s) => s.resolveReview)
  // 시작 시점의 목록으로 고정해서 풀다가 목록이 줄어도 순서가 흔들리지 않게
  const [queue] = useState(() => review.filter((r) => LESSON_MAP[r.lessonId]?.quiz[r.quizIndex]))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState(0)

  if (queue.length === 0)
    return (
      <div className="min-h-dvh">
        <TopBar title="오답 복습" />
        <EmptyState
          icon={<Trophy className="size-7" />}
          title="복습할 문제가 없어요"
          body="레슨 퀴즈에서 틀린 문제가 여기에 모여요. 지금은 모두 맞히셨네요!"
          action={<PrimaryButton onClick={() => nav('/learn')}>배우러 가기</PrimaryButton>}
        />
      </div>
    )

  if (i >= queue.length)
    return (
      <div className="min-h-dvh">
        <TopBar title="오답 복습" />
        <EmptyState
          icon={<RotateCcw className="size-7" />}
          title={`${queue.length}문제 중 ${right}문제를 맞혔어요`}
          body={right === queue.length ? '모든 오답을 정리했어요!' : '다시 틀린 문제는 목록에 남겨 두었어요. 내일 한 번 더 풀어 보세요.'}
          action={<PrimaryButton onClick={() => nav('/', { replace: true })}>홈으로</PrimaryButton>}
        />
      </div>
    )

  const item = queue[i]
  const lesson = LESSON_MAP[item.lessonId]
  const q = lesson.quiz[item.quizIndex]
  const cat = CATEGORY_MAP[COURSE_MAP[lesson.courseId].category]

  const choose = (n: number) => {
    if (picked !== null) return
    setPicked(n)
    if (n === q.answer) {
      setRight((r) => r + 1)
      resolve(item.lessonId, item.quizIndex)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <TopBar title={`오답 복습 ${i + 1}/${queue.length}`} />
      <div className="flex-1 px-4">
        <div key={i} className="animate-slide-in rounded-[28px] bg-white p-6 shadow-card">
          <p className="text-[0.75rem] font-bold" style={{ color: cat.color }}>
            {lesson.title}
          </p>
          <h2 className="mt-2 text-[1.3125rem] font-extrabold leading-snug">{q.q}</h2>
          <div className="mt-6 space-y-2.5">
            {q.options.map((o, n) => {
              const reveal = picked !== null
              const correct = n === q.answer
              return (
                <button
                  key={n}
                  disabled={reveal}
                  onClick={() => choose(n)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left text-[1rem] font-bold ring-2',
                    !reveal && 'ring-line',
                    reveal && correct && 'bg-teal-50 text-teal ring-teal',
                    reveal && picked === n && !correct && 'bg-coral-50 text-coral ring-coral',
                    reveal && picked !== n && !correct && 'opacity-50 ring-line',
                  )}
                >
                  <span className="grid size-8 place-items-center rounded-full bg-bg text-[0.875rem] text-sub">
                    {reveal && correct ? <Check className="size-4 text-teal" strokeWidth={3} /> : reveal && picked === n ? <X className="size-4 text-coral" strokeWidth={3} /> : n + 1}
                  </span>
                  {o}
                </button>
              )
            })}
          </div>
          {picked !== null && (
            <div className={cx('mt-5 rounded-2xl p-4 text-[0.9062rem] font-semibold leading-relaxed', picked === q.answer ? 'bg-teal-50' : 'bg-coral-50')}>
              <p className={cx('mb-1 flex items-center gap-1.5 font-extrabold', picked === q.answer ? 'text-teal' : 'text-coral')}>
                {picked === q.answer ? <CircleCheck className="size-5" /> : <CircleX className="size-5" />}
                {picked === q.answer ? '이번엔 맞혔어요! 목록에서 뺐어요' : '한 번 더 기억해 두세요'}
              </p>
              {q.explain}
            </div>
          )}
        </div>
      </div>
      <div className="pb-safe-5 px-4 pt-4">
        <PrimaryButton
          disabled={picked === null}
          onClick={() => {
            setI(i + 1)
            setPicked(null)
          }}
        >
          {i < queue.length - 1 ? '다음 문제' : '결과 보기'}
        </PrimaryButton>
      </div>
    </div>
  )
}
