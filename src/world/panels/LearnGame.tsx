import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Heart, Lock, Volume2, VolumeX } from 'lucide-react'
import type { Course, Lesson, Quiz } from '@/types'
import { COURSES, COURSE_MAP, LESSON_MAP } from '@/data/courses'
import { CATEGORY_MAP } from '@/data/categories'
import { useApp } from '@/store/app'
import { speak, speechSupported, stopSpeaking } from '@/lib/speech'
import { todayKey } from '@/lib/date'
import { SKILL_EFFECT } from '@/game/skills'
import { useWorld } from '../store'
import { toLook, type Look } from '../avatar'
import { CharacterArt, type Act, type Expr } from '../render/Character'
import { onLessonComplete } from '../actions'
import { emote } from '../emote'
import { sfx } from '../audio'
import { fxAt, fxConfetti } from '../fx'
import { CAT_EMOJI, COURSE_REWARDS, TOTAL_LESSONS, courseDone, learnStreak, lessonStars, nextStage, stageQuestions, stageState, starsFor, totalStars, treeStage } from '../learn'
import { Bar, Chip, cx, GameButton, toast, useToasts } from '../ui/kit'

/* ───────── 공용 ───────── */

export function useMyLook(extra?: Partial<Look>): Look {
  const avatar = useWorld((s) => s.avatar)
  const path = useWorld((s) => s.path)
  return useMemo(() => toLook({ ...avatar, ...extra }, path === 'employee' ? 'employee' : 'owner'), [avatar, path, extra])
}

/** HTML 안에 도트 캐릭터 */
export function PixelBuddy({
  look,
  act = null,
  expr = null,
  walking = false,
  yaw = 24,
  size = 64,
  className,
}: {
  look: Look
  act?: Act | null
  expr?: Expr | null
  walking?: boolean
  yaw?: number
  size?: number
  className?: string
}) {
  return (
    <svg width={size} height={size * (72 / 52)} viewBox="-26 -68 52 72" className={cx('overflow-visible', className)} aria-hidden>
      <CharacterArt look={look} act={act} expr={expr} walking={walking} yaw={yaw} speed={0.5} />
    </svg>
  )
}

/** 머리만 (지도 위 내 위치) */
function BuddyHead({ look, size = 30 }: { look: Look; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-17 -56 34 34" aria-hidden>
      <CharacterArt look={look} part="head" yaw={30} />
    </svg>
  )
}

/** 별 하나 */
export function StarIcon({ on, size = 14, className }: { on: boolean; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M12 2.2l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17l-6 3.3 1.3-6.6L2.4 9.1l6.7-.8z"
        fill={on ? 'url(#star-g)' : '#D9D6E4'}
        stroke={on ? '#B87A0B' : '#B5B1C4'}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {on && <path d="M9 7.5l1.6-3" stroke="#FFF8D6" strokeWidth={1.6} strokeLinecap="round" />}
      <defs>
        <linearGradient id="star-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF09A" />
          <stop offset="0.55" stopColor="#FFC93C" />
          <stop offset="1" stopColor="#F29E1B" />
        </linearGradient>
      </defs>
    </svg>
  )
}

/** 보물상자 그림 */
export function ChestArt({ state, size = 56 }: { state: 'locked' | 'ready' | 'open'; size?: number }) {
  const wood = state === 'locked' ? ['#B8B3C4', '#9A94AA', '#7D778F'] : ['#C98B4F', '#A5683A', '#7E4B27']
  const band = state === 'locked' ? '#D8D4E2' : '#FFD35A'
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {state !== 'locked' && <ellipse cx={32} cy={56} rx={22} ry={4.5} fill="#1B1D45" opacity={0.18} />}
      {state === 'open' && (
        <>
          <circle cx={32} cy={28} r={22} fill="#FFE98A" opacity={0.45} />
          <path d="M14 22 L20 6 L44 6 L50 22 Z" fill={wood[0]} stroke="#3B2414" strokeWidth={2} strokeLinejoin="round" />
          <path d="M20 6 L44 6 L46 12 L18 12 Z" fill={band} stroke="#3B2414" strokeWidth={1.5} />
        </>
      )}
      <rect x={10} y={30} width={44} height={24} rx={4} fill={wood[1]} stroke="#3B2414" strokeWidth={2} />
      <rect x={10} y={30} width={44} height={6} fill={wood[2]} opacity={0.5} />
      {state === 'open' ? (
        <>
          <rect x={13} y={26} width={38} height={7} rx={2} fill="#3B2414" />
          <circle cx={24} cy={27} r={4} fill="#FFE27A" stroke="#C98A16" strokeWidth={1.2} />
          <circle cx={33} cy={25} r={4.5} fill="#FFE27A" stroke="#C98A16" strokeWidth={1.2} />
          <circle cx={41} cy={27.5} r={3.6} fill="#FFE27A" stroke="#C98A16" strokeWidth={1.2} />
          <path d="M30 18 l1.5 3 l3 .5 l-2.3 2 l.6 3 l-2.8 -1.6 l-2.8 1.6 l.6 -3 l-2.3 -2 l3 -.5 z" fill="#fff" />
        </>
      ) : (
        <>
          <path d="M8 31 Q8 14 32 13 Q56 14 56 31 Z" fill={wood[0]} stroke="#3B2414" strokeWidth={2} strokeLinejoin="round" />
          <path d="M14 22 Q32 17 50 22" stroke={wood[2]} strokeWidth={1.5} fill="none" opacity={0.6} />
        </>
      )}
      <rect x={18} y={state === 'open' ? 30 : 14} width={5} height={state === 'open' ? 24 : 40} fill={band} stroke="#3B2414" strokeWidth={1.4} />
      <rect x={41} y={state === 'open' ? 30 : 14} width={5} height={state === 'open' ? 24 : 40} fill={band} stroke="#3B2414" strokeWidth={1.4} />
      <rect x={27} y={28} width={10} height={11} rx={2} fill={band} stroke="#3B2414" strokeWidth={1.6} />
      {state === 'locked' ? <path d="M30 31 v-2 a2 2 0 0 1 4 0 v2" stroke="#3B2414" strokeWidth={1.4} fill="none" /> : <circle cx={32} cy={34} r={1.8} fill="#3B2414" />}
      {state === 'ready' && (
        <>
          <path d="M8 8 l1.5 3 l3 1.5 l-3 1.5 l-1.5 3 l-1.5 -3 l-3 -1.5 l3 -1.5z" fill="#FFF3B0" className="twinkle" />
          <path d="M55 4 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1z" fill="#FFF3B0" className="twinkle" style={{ animationDelay: '0.8s' }} />
        </>
      )}
    </svg>
  )
}

/** 사이 공용 오버레이 (패널 안) */
function Overlay({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 grid place-items-center p-2">
      <button aria-label="닫기" className="absolute inset-0 animate-fade-in rounded-2xl bg-[#101233]/40 backdrop-blur-[1.5px]" onClick={onClose} />
      <div className="relative max-h-full w-full max-w-[30rem] animate-pop overflow-y-auto">{children}</div>
    </div>
  )
}

/* ───────── 보물상자 ───────── */
export function ChestModal({ courseId, onClose }: { courseId: string; onClose: () => void }) {
  const opened = useApp((s) => s.chests.includes(courseId))
  const [justOpened, setJustOpened] = useState(false)
  const reward = COURSE_REWARDS[courseId]
  const course = COURSE_MAP[courseId]
  const extra = useMemo(() => ({ [reward.kind]: reward.value }) as Partial<Look>, [reward])
  const preview = useMyLook(extra)
  const avatar = useWorld((s) => s.avatar)
  const wearing = (avatar as unknown as Record<string, unknown>)[reward.kind] === reward.value
  const chestRef = useRef<HTMLDivElement>(null)

  const open = () => {
    if (opened) return
    useApp.getState().openChest(courseId)
    useWorld.getState().addCash(3000)
    useWorld.getState().addExp(50)
    setJustOpened(true)
    sfx('chest')
    fxConfetti()
    window.setTimeout(() => fxAt(chestRef.current, 'burst', { big: true, n: 18 }), 120)
    window.setTimeout(() => sfx('unlock'), 500)
  }

  return (
    <Overlay onClose={onClose}>
      <div className="relative overflow-hidden rounded-[1.5rem] border-[3px] border-[#1B1D45]/80 bg-gradient-to-b from-[#3B2B6E] to-[#1E1846] p-3.5 text-center text-white shadow-2xl">
        <div className="rays-spin pointer-events-none absolute left-1/2 top-[38%] size-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" />
        <p className="relative truncate text-[0.6875rem] font-black text-[#FFE27A]">CHAPTER CLEAR · {course.title}</p>
        {!opened ? (
          <div className="relative flex items-center justify-center gap-3">
            <button ref={chestRef as never} onClick={open} className="chest-shake block" aria-label="상자 열기">
              <ChestArt state="ready" size={96} />
            </button>
            <div className="text-left">
              <p className="text-[1.25rem] font-black leading-tight">보물상자가 도착했어요!</p>
              <p className="mt-1 text-[0.8125rem] font-bold text-white/80">상자를 톡 눌러 열어 보세요</p>
              <p className="mt-1 text-[0.6875rem] font-bold text-[#FFE27A]">
                {reward.emoji} {reward.label} · 🪙 3,000원 · 50 EXP
              </p>
            </div>
          </div>
        ) : (
          <OpenedReward reward={reward} preview={preview} wearing={wearing} onClose={onClose} chestRef={chestRef} justOpened={justOpened} />
        )}
      </div>
    </Overlay>
  )
}

function OpenedReward({
  reward,
  preview,
  wearing,
  onClose,
  chestRef,
  justOpened,
}: {
  reward: (typeof COURSE_REWARDS)[string]
  preview: Look
  wearing: boolean
  onClose: () => void
  chestRef: React.RefObject<HTMLDivElement | null>
  justOpened: boolean
}) {
  return (
    <div className="relative mt-1 flex items-center gap-3 text-left">
      <div ref={chestRef} className="chest-open flex shrink-0 items-end gap-1">
        <ChestArt state="open" size={64} />
        <div className="float-soft rounded-2xl bg-white/12 p-1 ring-2 ring-white/25">
          <PixelBuddy look={preview} act={justOpened ? 'cheer' : null} expr="happy" size={56} />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[1.125rem] font-black">
          {reward.emoji} {reward.label} 획득!
        </p>
        <p className="text-[0.75rem] font-bold text-white/75">꾸미기에서 언제든 바꿔 입을 수 있어요</p>
        {justOpened && (
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-full bg-[#FFE27A] px-2 py-0.5 text-[0.6875rem] font-black text-ink">🪙 +3,000원</span>
            <span className="rounded-full bg-[#9BE07A] px-2 py-0.5 text-[0.6875rem] font-black text-ink">+50 EXP</span>
          </div>
        )}
        <div className="mt-2.5 flex gap-2">
          <GameButton tone="white" size="sm" onClick={onClose}>
            닫기
          </GameButton>
          <GameButton
            tone="sun"
            size="sm"
            disabled={wearing}
            onClick={() => {
              useWorld.getState().setAvatar({ [reward.kind]: reward.value })
              toast(`${reward.emoji} ${reward.label} 착용!`)
              emote('cheer', reward.emoji)
            }}
          >
            {wearing ? '착용 중 ✓' : '바로 착용하기'}
          </GameButton>
        </div>
      </div>
    </div>
  )
}

/* ───────── 스테이지 지도 ───────── */
const TREE_FINAL = '✨🌳'
const NODE_POS = [
  { x: 17, y: 70 },
  { x: 44, y: 30 },
  { x: 71, y: 68 },
]
const CHEST_POS = { x: 89, y: 28 }

function StagePreview({ lessonId, onStart, onClose }: { lessonId: string; onStart: () => void; onClose: () => void }) {
  const lesson = LESSON_MAP[lessonId]
  const course = COURSE_MAP[lesson.courseId]
  const ci = COURSES.indexOf(course)
  const li = course.lessons.findIndex((l) => l.id === lessonId)
  const progress = useApp((s) => s.progress)
  const stars = useApp((s) => s.stars)
  const done = !!progress[lessonId]?.done
  const st = lessonStars(lessonId, stars, progress)
  const meta = CATEGORY_MAP[course.category]
  return (
    <Overlay onClose={onClose}>
      <div className="overflow-hidden rounded-[1.4rem] border-[3px] border-[#1B1D45]/80 bg-[#FFFDF7] shadow-2xl">
        <div className="relative px-3.5 py-2 text-white" style={{ background: meta.gradient }}>
          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
          <p className="relative text-[0.6875rem] font-black opacity-90">
            STAGE {ci + 1}-{li + 1} · {meta.short} · {course.level}
          </p>
          <p className="relative text-[1.0625rem] font-black leading-snug">
            {CAT_EMOJI[course.category]} {lesson.title}
          </p>
          <div className="absolute right-3 top-2.5 flex gap-0.5">
            {[0, 1, 2].map((k) => (
              <StarIcon key={k} on={k < st} size={20} />
            ))}
          </div>
        </div>
        <div className="space-y-1.5 p-2.5">
          <p className="line-clamp-2 text-[0.8125rem] font-semibold text-ink/80">{done ? `📌 ${lesson.takeaway}` : course.description}</p>
          <div className="flex flex-wrap gap-1">
            <Chip tone="blue">📄 카드 {lesson.cards.length}장</Chip>
            <Chip tone="sun">❓ 퀴즈 3문제</Chip>
            <Chip>⏱ {lesson.minutes}분</Chip>
            <Chip tone="coral">❤️ 하트 3개</Chip>
          </div>
          <p className="rounded-xl bg-gradient-to-r from-[#FFF6D8] to-[#FFEBC0] px-2.5 py-1.5 text-[0.75rem] font-black">
            <span className="text-[#B7860B]">🎁 {done ? '다시 도전' : '첫 클리어'} </span>
            {done ? `+8 EXP · ⚡+2${st < 3 ? ' · ⭐3개면 🪙+1,000원' : ''}` : '+30 EXP · ⚡+5 · 🪙+2,000원 · 📖 지식 카드'}
          </p>
          <div className="flex gap-2">
            <GameButton tone="white" className="flex-1" onClick={onClose}>
              닫기
            </GameButton>
            <GameButton tone="green" className="flex-[2]" onClick={onStart}>
              ▶ {done ? '다시 도전' : '스테이지 시작'}
            </GameButton>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

function Chapter({ course, index, onPick, onChest }: { course: Course; index: number; onPick: (lessonId: string, el: HTMLElement) => void; onChest: (courseId: string) => void }) {
  const progress = useApp((s) => s.progress)
  const stars = useApp((s) => s.stars)
  const opened = useApp((s) => s.chests.includes(course.id))
  const look = useMyLook()
  const meta = CATEGORY_MAP[course.category]
  const done = courseDone(course.id, progress)
  const reward = COURSE_REWARDS[course.id]
  const got = course.lessons.reduce((n, l) => n + lessonStars(l.id, stars, progress), 0)
  const states = course.lessons.map((_, i) => stageState(course.id, i, progress))
  const current = states.includes('current')
  const pts = [...NODE_POS.slice(0, course.lessons.length), CHEST_POS]
  const d = pts.map((p, i) => (i === 0 ? `M${p.x} ${p.y}` : `Q${(pts[i - 1].x + p.x) / 2} ${i % 2 ? Math.min(pts[i - 1].y, p.y) - 6 : Math.max(pts[i - 1].y, p.y) + 6} ${p.x} ${p.y}`)).join(' ')

  return (
    <div
      data-current={current ? 1 : 0}
      className="relative flex h-full min-h-[13.5rem] w-[16rem] shrink-0 snap-center flex-col overflow-hidden rounded-[1.25rem] border-[3px] border-[#1B1D45]/70 bg-white shadow-[0_6px_0_rgba(27,29,69,0.18)]"
    >
      {/* 머리 */}
      <div className="relative flex items-center gap-2 px-2.5 py-1.5 text-white" style={{ background: meta.gradient }}>
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
        <span className="relative grid size-8 shrink-0 place-items-center rounded-xl bg-white/25 text-[1.125rem] ring-2 ring-white/40">{CAT_EMOJI[course.category]}</span>
        <span className="relative min-w-0 flex-1">
          <span className="block text-[0.625rem] font-black opacity-90">
            CHAPTER {index + 1} · {course.level}
          </span>
          <span className="block truncate text-[0.8125rem] font-black leading-tight">{course.title}</span>
        </span>
        <span className="relative flex items-center gap-0.5 rounded-full bg-black/20 px-1.5 py-0.5 text-[0.625rem] font-black">
          <StarIcon on size={11} /> {got}/{course.lessons.length * 3}
        </span>
      </div>
      {/* 길 */}
      <div
        className="relative min-h-0 flex-1"
        style={{
          background: `radial-gradient(120% 90% at 50% 110%, ${meta.soft} 0%, #FFFFFF 70%)`,
        }}
      >
        <span
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 opacity-60"
          style={{
            background: `repeating-radial-gradient(circle at 10% 120%, ${meta.color}22 0 12px, transparent 12px 26px)`,
          }}
        />
        <span className="pointer-events-none absolute left-[6%] top-[12%] text-[0.875rem] opacity-70">🌿</span>
        <span className="pointer-events-none absolute bottom-[6%] right-[30%] text-[0.75rem] opacity-70">🌼</span>
        <span className="pointer-events-none absolute left-[30%] top-[62%] text-[0.625rem] opacity-50">🌱</span>
        <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d={d} fill="none" stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={d} fill="none" stroke={meta.color} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {course.lessons.map((l, i) => {
          const st = states[i]
          const p = NODE_POS[i]
          const s = lessonStars(l.id, stars, progress)
          return (
            <div key={l.id} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
              {st === 'current' && (
                <span className="node-bounce absolute -top-[2.4rem] left-1/2 -ml-[15px] block">
                  <BuddyHead look={look} />
                </span>
              )}
              <button
                data-stage={l.id}
                onClick={(e) => onPick(l.id, e.currentTarget)}
                aria-label={`스테이지 ${index + 1}-${i + 1} ${l.title}`}
                className={cx(
                  'relative grid place-items-center rounded-full border-[3px] font-black transition active:scale-90',
                  st === 'current' ? 'node-glow size-[3.1rem] border-white text-[1.125rem] text-ink' : 'size-11 border-white text-[1rem]',
                  st === 'done' && 'text-white shadow-[0_4px_0_rgba(32,34,68,0.3)]',
                  st === 'locked' && 'text-white/90 shadow-[0_3px_0_rgba(32,34,68,0.2)]',
                )}
                style={{
                  background:
                    st === 'current'
                      ? 'linear-gradient(180deg,#FFF09A,#FFC93C 60%,#F2A21B)'
                      : st === 'done'
                        ? `linear-gradient(180deg, ${meta.color}CC, ${meta.color})`
                        : 'linear-gradient(180deg,#CFCBDA,#A9A4B9)',
                }}
              >
                <span className="pointer-events-none absolute inset-x-1 top-0.5 h-1/3 rounded-full bg-white/35" />
                {st === 'locked' ? <Lock className="size-4" strokeWidth={3} /> : i + 1}
              </button>
              <span className="absolute left-1/2 top-full mt-0.5 flex -translate-x-1/2 gap-px">
                {st === 'current' ? (
                  <span className="whitespace-nowrap rounded-full bg-ink px-1.5 text-[0.625rem] font-black text-[#FFE27A]">START</span>
                ) : (
                  [0, 1, 2].map((k) => <StarIcon key={k} on={k < s} size={11} />)
                )}
              </span>
            </div>
          )
        })}
        <button
          onClick={() => (done ? onChest(course.id) : toast(`스테이지 ${course.lessons.length}개를 모두 깨면 열려요`, 'info'))}
          aria-label="보물상자"
          className={cx('absolute -translate-x-1/2 -translate-y-1/2 transition active:scale-90', done && !opened && 'chest-shake')}
          style={{ left: `${CHEST_POS.x}%`, top: `${CHEST_POS.y}%` }}
        >
          <ChestArt state={!done ? 'locked' : opened ? 'open' : 'ready'} size={done && !opened ? 50 : 44} />
          {done && !opened && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-coral text-[0.625rem] font-black text-white ring-2 ring-white">!</span>}
        </button>
      </div>
      {/* 보상 */}
      <div className="flex items-center gap-1.5 border-t-2 border-black/5 bg-[#FFFDF7] px-2.5 py-1">
        <span className="text-[0.875rem]">{reward.emoji}</span>
        <span className="min-w-0 flex-1 truncate text-[0.6875rem] font-black text-sub">{opened ? `${reward.label} 받음` : `상자 보상: ${reward.label}`}</span>
        {done ? (
          <Chip tone="green">수료 ✓</Chip>
        ) : (
          <span className="text-[0.625rem] font-black text-mute">
            {course.lessons.filter((l) => progress[l.id]?.done).length}/{course.lessons.length}
          </span>
        )}
      </div>
    </div>
  )
}

export function StageMap({ open }: { open: (lessonId: string) => void }) {
  const progress = useApp((s) => s.progress)
  const stars = useApp((s) => s.stars)
  const logs = useApp((s) => s.logs)
  const [sel, setSel] = useState<string | null>(null)
  const [chest, setChest] = useState<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const doneCount = Object.values(progress).filter((p) => p.done).length
  const tree = treeStage(doneCount)
  const streak = learnStreak(logs, todayKey())
  const total = totalStars(stars, progress)
  const next = nextStage(null, progress)

  useEffect(() => {
    const sc = scroller.current
    const el = sc?.querySelector<HTMLElement>('[data-current="1"]')
    if (sc && el) sc.scrollLeft = el.offsetLeft - sc.clientWidth / 2 + el.clientWidth / 2
  }, [])

  const by = (dx: number) => scroller.current?.scrollBy({ left: dx, behavior: 'smooth' })

  return (
    <div className="relative flex h-full min-h-[16rem] flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-full bg-gradient-to-b from-[#FFF3C4] to-[#FFE08A] px-2.5 py-1 text-[0.75rem] font-black text-[#7A5600] shadow-sm ring-1 ring-[#E8B93A]">
          <StarIcon on size={14} /> {total}/{TOTAL_LESSONS * 3}
        </span>
        <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[0.75rem] font-black text-primary ring-1 ring-primary/20">
          📘 {doneCount}/{TOTAL_LESSONS} 스테이지
        </span>
        <span className={cx('rounded-full px-2.5 py-1 text-[0.75rem] font-black ring-1', streak ? 'bg-coral-50 text-coral ring-coral/20' : 'bg-black/5 text-sub ring-black/5')}>
          🔥 {streak ? `${streak}일 연속` : '오늘 첫 공부를 해요'}
        </span>
        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[0.75rem] font-black text-teal ring-1 ring-teal/20">
          {tree.stage.emoji} 배움 나무 · {tree.stage.name}
        </span>
        <span className="flex-1" />
        {next && (
          <GameButton size="sm" tone="green" onClick={() => setSel(next.lessonId)}>
            ▶ 이어서 하기
          </GameButton>
        )}
      </div>
      <div className="relative min-h-0 flex-1">
        <div
          ref={scroller}
          className="no-scrollbar flex h-full snap-x gap-3 overflow-x-auto overflow-y-hidden px-1 pb-1.5"
          onWheel={(e) => {
            if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && scroller.current) scroller.current.scrollLeft += e.deltaY
          }}
        >
          {COURSES.map((c, i) => (
            <Chapter
              key={c.id}
              course={c}
              index={i}
              onChest={(id) => {
                sfx('tap')
                setChest(id)
              }}
              onPick={(id, el) => {
                const st = stageState(
                  c.id,
                  c.lessons.findIndex((l) => l.id === id),
                  progress,
                )
                if (st === 'locked') {
                  sfx('wrong')
                  el.classList.remove('shake')
                  void el.offsetWidth
                  el.classList.add('shake')
                  useToasts.getState().push('🔒 앞 스테이지를 먼저 깨 주세요', 'info')
                  return
                }
                sfx('tap')
                setSel(id)
              }}
            />
          ))}
          <div className="grid w-[12rem] shrink-0 place-items-center rounded-[1.25rem] border-[3px] border-dashed border-black/10 bg-white/60 p-3 text-center">
            <div>
              <p className="text-[2.25rem] leading-none">{TREE_FINAL}</p>
              <p className="mt-1 text-[0.8125rem] font-black">모든 챕터를 깨면</p>
              <p className="text-[0.6875rem] font-bold text-sub">배움 나무에 황금 열매가 열려요</p>
            </div>
          </div>
        </div>
        <button
          aria-label="왼쪽으로"
          onClick={() => by(-280)}
          className="absolute left-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-ink/70 text-white shadow"
        >
          <ChevronLeft className="size-4" strokeWidth={3} />
        </button>
        <button
          aria-label="오른쪽으로"
          onClick={() => by(280)}
          className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-ink/70 text-white shadow"
        >
          <ChevronRight className="size-4" strokeWidth={3} />
        </button>
      </div>
      {sel && (
        <StagePreview
          lessonId={sel}
          onClose={() => setSel(null)}
          onStart={() => {
            sfx('open')
            open(sel)
          }}
        />
      )}
      {chest && <ChestModal courseId={chest} onClose={() => setChest(null)} />}
    </div>
  )
}

/* ───────── 스테이지 (카드 → 퀴즈 → 결과) ───────── */
interface Ans {
  right: boolean
  bonus: boolean
  index: number
}
interface Result {
  first: boolean
  stars: number
  coins: number
  exp: number
  energy: number
  comboBonus: number
  maxCombo: number
  chestReady: boolean
  correct: number
  total: number
}

const KIND = {
  concept: {
    label: '개념',
    icon: '💡',
    bg: 'linear-gradient(180deg,#EEF4FF,#FFFFFF 40%)',
    tip: '개념부터 차근차근 알아봐요',
  },
  tip: {
    label: '실전 팁',
    icon: '🛠️',
    bg: 'linear-gradient(180deg,#E8F6F3,#FFFFFF 40%)',
    tip: '내일 바로 써먹을 수 있어요!',
  },
  example: {
    label: '예시',
    icon: '🏪',
    bg: 'linear-gradient(180deg,#FFF2E8,#FFFFFF 40%)',
    tip: '이웃 가게 이야기를 들어 봐요',
  },
  check: {
    label: '체크리스트',
    icon: '✅',
    bg: 'linear-gradient(180deg,#FFF8E1,#FFFFFF 40%)',
    tip: '하나씩 톡톡 눌러 체크해요',
  },
} as const

function Track({ steps, pos, cards, look }: { steps: number; pos: number; cards: number; look: Look }) {
  const [walking, setWalking] = useState(false)
  const prev = useRef(pos)
  useEffect(() => {
    if (prev.current === pos) return
    prev.current = pos
    setWalking(true)
    const t = window.setTimeout(() => setWalking(false), 650)
    return () => window.clearTimeout(t)
  }, [pos])
  const pct = (k: number) => 5 + (k / steps) * 88
  return (
    <div
      className="relative h-[2.6rem] shrink-0 overflow-hidden rounded-2xl border-2 border-black/5"
      style={{
        background: 'linear-gradient(180deg,#CFEFFF 0%,#E9F8FF 45%,#BFE3A8 46%,#A4D78C 100%)',
      }}
    >
      <span className="pointer-events-none absolute left-[12%] top-1 text-[0.625rem] opacity-80">☁️</span>
      <span className="pointer-events-none absolute left-[58%] top-0.5 text-[0.625rem] opacity-70">☁️</span>
      <span className="absolute inset-x-[5%] bottom-[0.55rem] h-1 rounded-full bg-[#8BC36F]" />
      <span className="absolute bottom-[0.55rem] left-[5%] h-1 rounded-full bg-[#FFE27A] transition-all duration-700" style={{ width: `${(pos / steps) * 88}%` }} />
      {Array.from({ length: steps }, (_, k) => (
        <span
          key={k}
          className={cx(
            'absolute bottom-[0.3rem] grid -translate-x-1/2 place-items-center rounded-full border-2 border-white text-[0.625rem] font-black',
            k < cards ? 'size-3.5' : 'size-[1.05rem]',
            k < pos ? 'bg-[#FFC93C] text-ink' : k < cards ? 'bg-white/80' : 'bg-[#FFF3C4] text-[#B7860B]',
          )}
          style={{ left: `${pct(k + 0.5)}%` }}
        >
          {k >= cards ? '?' : ''}
        </span>
      ))}
      <span className="absolute bottom-[0.25rem] right-[2.5%] text-[0.9375rem]">🏁</span>
      <span className="absolute bottom-[0.45rem] transition-[left] duration-[650ms] ease-in-out" style={{ left: `calc(${pct(pos)}% - 14px)` }}>
        <PixelBuddy look={look} walking={walking} yaw={walking ? 70 : 30} size={28} />
      </span>
    </div>
  )
}

function Hearts({ n, max = 3 }: { n: number; max?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, k) => (
        <Heart key={`${k}-${k < n}`} className={cx('size-5 drop-shadow-sm', k < n ? 'text-coral' : 'heart-break text-coral')} fill="currentColor" strokeWidth={2} stroke="#fff" />
      ))}
    </span>
  )
}

function Buddy({ look, act, expr, line }: { look: Look; act: Act | null; expr: Expr | null; line: string }) {
  return (
    <div className="relative flex flex-col items-center">
      <div key={line} className="relative mb-1 w-full animate-pop rounded-2xl border-2 border-[#4A3426]/70 bg-white px-2.5 py-1.5 text-center text-[0.75rem] font-black leading-snug shadow-sm">
        {line}
        <span className="absolute -bottom-[7px] left-1/2 size-3 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-[#4A3426]/70 bg-white" />
      </div>
      <div className="relative">
        <span className="absolute inset-x-2 bottom-0 h-3 rounded-[50%] bg-black/10 blur-[2px]" />
        <PixelBuddy look={look} act={act} expr={expr} size={66} />
      </div>
    </div>
  )
}

export function LessonStage({ lesson, course, onBack, onDone, onNext }: { lesson: Lesson; course: Course; onBack: () => void; onDone?: () => void; onNext: (lessonId: string) => void }) {
  const app = useApp()
  const look = useMyLook()
  const meta = CATEGORY_MAP[course.category]
  const ci = COURSES.indexOf(course)
  const li = course.lessons.findIndex((l) => l.id === lesson.id)
  const start = Math.min(app.progress[lesson.id]?.card ?? 0, lesson.cards.length - 1)
  const [phase, setPhase] = useState<'cards' | 'quiz' | 'fail' | 'result'>('cards')
  const [i, setI] = useState(start)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [attempt, setAttempt] = useState(0)
  const qs = useMemo(() => stageQuestions(lesson, course.id, `${todayKey()}:${attempt}`), [lesson, course.id, attempt])
  const [q, setQ] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Ans[]>([])
  const [hearts, setHearts] = useState(3)
  const [combo, setCombo] = useState(0)
  const [maxCombo, setMaxCombo] = useState(0)
  const [react, setReact] = useState<{
    act: Act | null
    expr: Expr | null
    line: string
  } | null>(null)
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [chest, setChest] = useState(false)
  const finished = useRef(false)
  const optRefs = useRef<(HTMLButtonElement | null)[]>([])
  const qBox = useRef<HTMLDivElement>(null)
  const card = lesson.cards[i]
  const kind = KIND[card?.kind ?? 'concept']
  const steps = lesson.cards.length + qs.length
  const pos = phase === 'cards' ? i : phase === 'quiz' ? lesson.cards.length + q + (picked !== null ? 1 : 0) : phase === 'result' ? steps : lesson.cards.length

  useEffect(() => () => stopSpeaking(), [])
  useEffect(() => {
    if (phase === 'cards') app.setCard(lesson.id, i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, phase])

  // 듣기 모드
  useEffect(() => {
    if (!listening || phase !== 'cards') return
    speak(`${card.title}. ${card.body} ${card.items?.join(', ') ?? ''}`, {
      rate: app.settings.speechRate,
      onEnd: () => {
        if (i < lesson.cards.length - 1) setI(i + 1)
        else setListening(false)
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, i, phase])

  const reactFor = (act: Act | null, expr: Expr | null, line: string, ms = 1800) => {
    setReact({ act, expr, line })
    window.setTimeout(() => setReact((r) => (r && r.line === line ? { ...r, act: null } : r)), ms)
  }

  const goCard = (k: number) => {
    sfx('page')
    setI(k)
  }

  const startQuiz = () => {
    stopSpeaking()
    setListening(false)
    setPhase('quiz')
    setQ(0)
    setPicked(null)
    setAnswers([])
    setHearts(3)
    setCombo(0)
    setMaxCombo(0)
    sfx('open')
    reactFor(null, 'happy', '퀴즈 시작! 하트 3개로 도전해요 💪')
  }

  const pick = (k: number) => {
    if (picked !== null) return
    const quiz = qs[q].quiz
    const right = k === quiz.answer
    setPicked(k)
    const ans = [...answers, { right, bonus: qs[q].bonus, index: qs[q].index }]
    setAnswers(ans)
    const btn = optRefs.current[k]
    if (right) {
      const c = combo + 1
      setCombo(c)
      setMaxCombo(Math.max(maxCombo, c))
      sfx(c >= 2 ? 'combo' : 'correct')
      fxAt(btn, 'burst', { n: c >= 2 ? 16 : 12, big: c >= 3 })
      fxAt(
        btn,
        {
          float: c >= 2 ? `${c} 콤보!` : '정답!',
          color: c >= 2 ? '#FFB86B' : '#8CF2A6',
        },
        { big: c >= 2 },
      )
      reactFor('cheer', 'happy', c >= 3 ? '완벽해요! 🔥' : c >= 2 ? `${c}연속 정답! 👏` : '정답이에요! 👏')
    } else {
      setCombo(0)
      setHearts((h) => h - 1)
      sfx('wrong')
      qBox.current?.classList.remove('shake')
      void qBox.current?.offsetWidth
      qBox.current?.classList.add('shake')
      fxAt(optRefs.current[quiz.answer], 'ring', { color: '#2FB894' })
      reactFor(null, 'surprised', '괜찮아요, 해설을 보면 기억에 남아요', 2400)
    }
  }

  const finish = (all: Ans[]) => {
    if (finished.current) return
    finished.current = true
    stopSpeaking()
    const st0 = useApp.getState()
    const prevStars = lessonStars(lesson.id, st0.stars, st0.progress)
    const own = all
      .filter((a) => !a.bonus)
      .sort((a, b) => a.index - b.index)
      .map((a) => a.right)
    const first = st0.completeLesson(lesson.id, own)
    onLessonComplete(first)
    const correct = all.filter((a) => a.right).length
    const stars = starsFor(correct, all.length)
    st0.setStars(lesson.id, stars)
    let coins = 0
    if (first) coins += 2000
    if (stars === 3 && prevStars < 3) coins += 1000
    if (coins) useWorld.getState().addCash(coins)
    const comboBonus = maxCombo >= 3 ? 10 : maxCombo >= 2 ? 5 : 0
    if (comboBonus) useWorld.getState().addExp(comboBonus)
    const after = useApp.getState()
    setResult({
      first,
      stars,
      coins,
      exp: (first ? 30 : 8) + comboBonus,
      energy: first ? 5 : 2,
      comboBonus,
      maxCombo,
      chestReady: courseDone(course.id, after.progress) && !after.chests.includes(course.id),
      correct,
      total: all.length,
    })
    setPhase('result')
    emote(stars >= 2 ? 'cheer' : 'nod', '📚')
  }

  const next = () => {
    if (hearts <= 0) {
      setPhase('fail')
      sfx('close')
      return
    }
    if (q < qs.length - 1) {
      setQ(q + 1)
      setPicked(null)
      sfx('tap')
    } else finish(answers)
  }

  const buddyLine =
    react?.line ?? (phase === 'cards' ? (listening ? '제가 읽어 드릴게요 🎧' : kind.tip) : phase === 'quiz' ? (qs[q].bonus ? '보너스 문제! 같은 챕터 내용이에요' : '천천히 골라 보세요') : '')

  return (
    <div className="relative flex h-full min-h-[16rem] flex-col gap-2">
      {/* 위: 뒤로 · 제목 · 하트 */}
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-0.5 rounded-xl bg-black/5 px-2 py-1 text-[0.75rem] font-black active:scale-95">
          <ArrowLeft className="size-3.5" /> 지도
        </button>
        <span className="rounded-lg px-1.5 py-0.5 text-[0.625rem] font-black text-white" style={{ background: meta.color }}>
          STAGE {ci + 1}-{li + 1}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.875rem] font-black">{lesson.title}</span>
        {phase === 'quiz' && <Hearts n={hearts} />}
        {phase === 'quiz' && combo >= 2 && (
          <span key={combo} className="combo-pop rounded-full bg-gradient-to-r from-[#FF8A3D] to-coral px-2 py-0.5 text-[0.75rem] font-black text-white shadow">
            🔥 {combo} 콤보
          </span>
        )}
        {phase === 'cards' && <Chip tone="blue">⏱ {lesson.minutes}분</Chip>}
      </div>
      {phase !== 'result' && <Track steps={steps} pos={pos} cards={lesson.cards.length} look={look} />}

      {phase === 'cards' && (
        <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1fr_10rem]">
          <div className="flex min-h-0 flex-col gap-2">
            <div
              key={i}
              className="card-in thin-scroll relative min-h-0 flex-1 overflow-y-auto rounded-2xl border-2 border-black/5 p-3.5 shadow-[0_4px_0_rgba(32,34,68,0.08)]"
              style={{ background: kind.bg }}
            >
              <span className="absolute right-3 top-2 text-[1.75rem] opacity-90">{kind.icon}</span>
              <span className="rounded-full px-2 py-0.5 text-[0.6875rem] font-black text-white" style={{ background: meta.color }}>
                {kind.label} · {i + 1}/{lesson.cards.length}
              </span>
              <h3 className="mt-2 pr-10 text-[1.125rem] font-black leading-snug">{card.title}</h3>
              <p className="mt-1.5 text-[0.9375rem] font-medium leading-relaxed text-ink/85">{card.body}</p>
              {card.items && (
                <ul className="mt-2 space-y-1">
                  {card.items.map((it) => {
                    const key = `${i}:${it}`
                    const on = !!checked[key]
                    return (
                      <li key={it}>
                        <button
                          onClick={(e) => {
                            const v = !on
                            const nextChecked = { ...checked, [key]: v }
                            setChecked(nextChecked)
                            if (v) {
                              sfx('pop')
                              fxAt(e.currentTarget.firstElementChild, 'ring', {
                                color: '#2FB894',
                              })
                              if (card.items!.every((x) => nextChecked[`${i}:${x}`])) {
                                window.setTimeout(() => sfx('star'), 120)
                                reactFor('cheer', 'happy', '체크 완료! 멋져요 ✨')
                              }
                            }
                          }}
                          className={cx(
                            'flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[0.875rem] font-semibold transition',
                            on ? 'bg-teal-50 text-teal' : 'bg-white/80 hover:bg-white',
                          )}
                        >
                          <span className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border-2 transition', on ? 'border-teal bg-teal text-white' : 'border-black/20 bg-white')}>
                            {on && <Check className="size-3.5" strokeWidth={4} />}
                          </span>
                          <span className={cx(on && 'line-through decoration-2 opacity-80')}>{it}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              {speechSupported() && (
                <GameButton
                  size="sm"
                  tone={listening ? 'coral' : 'white'}
                  className="h-10"
                  onClick={() => {
                    if (listening) stopSpeaking()
                    setListening(!listening)
                  }}
                >
                  {listening ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />} {listening ? '그만 듣기' : '듣기 모드'}
                </GameButton>
              )}
              <span className="flex-1" />
              <GameButton tone="white" disabled={i === 0} onClick={() => goCard(i - 1)} className="w-14">
                <ChevronLeft className="size-4" />
              </GameButton>
              <GameButton className="w-36" tone={i < lesson.cards.length - 1 ? 'primary' : 'sun'} onClick={() => (i < lesson.cards.length - 1 ? goCard(i + 1) : startQuiz())}>
                {i < lesson.cards.length - 1 ? '다음 카드' : '퀴즈 도전!'} <ChevronRight className="size-4" />
              </GameButton>
            </div>
          </div>
          <div className="hidden items-end md:flex">
            <Buddy look={look} act={react?.act ?? null} expr={react?.expr ?? (listening ? 'talk' : null)} line={buddyLine} />
          </div>
        </div>
      )}

      {phase === 'quiz' && (
        <QuizView
          quiz={qs[q].quiz}
          bonus={qs[q].bonus}
          n={q}
          total={qs.length}
          picked={picked}
          onPick={pick}
          onNext={next}
          last={q === qs.length - 1}
          hearts={hearts}
          optRefs={optRefs}
          qBox={qBox}
          buddy={<Buddy look={look} act={react?.act ?? null} expr={react?.expr ?? null} line={buddyLine} />}
        />
      )}

      {phase === 'fail' && (
        <div className="grid min-h-0 flex-1 place-items-center text-center">
          <div>
            <PixelBuddy look={look} expr="tired" size={70} className="mx-auto" />
            <p className="mt-1 text-[1.125rem] font-black">하트를 모두 썼어요</p>
            <p className="text-[0.8125rem] font-semibold text-sub">괜찮아요! 카드를 한 번 더 보고 오면 금방 깰 수 있어요.</p>
            <div className="mt-3 flex justify-center gap-2">
              <GameButton
                tone="white"
                onClick={() => {
                  setPhase('cards')
                  setI(0)
                  setAttempt(attempt + 1)
                }}
              >
                📄 카드 다시 보기
              </GameButton>
              <GameButton
                tone="green"
                onClick={() => {
                  setAttempt(attempt + 1)
                  startQuiz()
                }}
              >
                ↻ 다시 도전
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {phase === 'result' && result && (
        <ResultView
          result={result}
          lesson={lesson}
          course={course}
          look={look}
          onBack={onBack}
          onDone={onDone}
          onChest={() => setChest(true)}
          onNext={() => {
            const n = nextStage(lesson.id, useApp.getState().progress)
            if (n) onNext(n.lessonId)
            else onBack()
          }}
        />
      )}
      {chest && <ChestModal courseId={course.id} onClose={() => setChest(false)} />}
    </div>
  )
}

function QuizView({
  quiz,
  bonus,
  n,
  total,
  picked,
  onPick,
  onNext,
  last,
  hearts,
  optRefs,
  qBox,
  buddy,
}: {
  quiz: Quiz
  bonus: boolean
  n: number
  total: number
  picked: number | null
  onPick: (k: number) => void
  onNext: () => void
  last: boolean
  hearts: number
  optRefs: React.RefObject<(HTMLButtonElement | null)[]>
  qBox: React.RefObject<HTMLDivElement | null>
  buddy: ReactNode
}) {
  const right = picked !== null && picked === quiz.answer
  return (
    <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-[1fr_1fr_9.5rem]">
      <div
        ref={qBox}
        key={`q${n}`}
        className="card-in thin-scroll min-h-0 overflow-y-auto rounded-2xl border-2 border-[#E8B93A]/40 bg-gradient-to-br from-[#FFF7DC] to-[#FFE6A8] p-3.5 shadow-[0_4px_0_rgba(183,134,11,0.15)]"
      >
        <p className="flex items-center gap-1.5 text-[0.6875rem] font-black text-[#B7860B]">
          QUIZ {n + 1}/{total}
          {bonus && <span className="rounded-full bg-violet px-1.5 text-[0.625rem] text-white">BONUS</span>}
        </p>
        <p className="mt-1 text-[1rem] font-black leading-snug">{quiz.q}</p>
        {picked !== null && (
          <p className={cx('mt-2 animate-pop rounded-xl p-2 text-[0.8125rem] font-semibold', right ? 'bg-teal-50 text-teal' : 'bg-coral-50 text-coral')}>
            {right ? '⭕ 정답! ' : '❌ 아쉬워요. '}
            {quiz.explain}
          </p>
        )}
      </div>
      <div className="flex min-h-0 flex-col gap-1.5">
        {quiz.options.map((o, k) => {
          const show = picked !== null
          const isRight = k === quiz.answer
          return (
            <button
              key={`${n}-${k}`}
              ref={(el) => void (optRefs.current[k] = el)}
              disabled={show}
              onClick={() => onPick(k)}
              className={cx(
                'flex items-center gap-2 rounded-2xl border-2 px-2.5 py-2 text-left text-[0.875rem] font-bold transition',
                !show && 'border-black/10 bg-white shadow-[0_3px_0_rgba(32,34,68,0.12)] hover:border-primary/40 active:translate-y-0.5 active:shadow-none',
                show && isRight && 'correct-pulse border-teal bg-teal-50',
                show && !isRight && picked === k && 'border-coral bg-coral-50',
                show && !isRight && picked !== k && 'border-black/5 bg-white opacity-55',
              )}
            >
              <span
                className={cx(
                  'grid size-6 shrink-0 place-items-center rounded-lg text-[0.75rem] font-black',
                  show && isRight ? 'bg-teal text-white' : show && picked === k ? 'bg-coral text-white' : 'bg-black/5 text-sub',
                )}
              >
                {show && isRight ? '○' : show && picked === k ? '×' : 'ABCD'[k]}
              </span>
              <span className="min-w-0 flex-1">{o}</span>
            </button>
          )
        })}
        {picked !== null && (
          <GameButton tone={hearts <= 0 ? 'coral' : 'green'} className="mt-auto" onClick={onNext}>
            {hearts <= 0 ? '결과 보기' : last ? '스테이지 클리어!' : '다음 문제'} <ChevronRight className="size-4" />
          </GameButton>
        )}
      </div>
      <div className="hidden md:block">{buddy}</div>
    </div>
  )
}

function CountUp({ to, ms = 700, prefix = '', suffix = '' }: { to: number; ms?: number; prefix?: string; suffix?: string }) {
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / ms)
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to, ms])
  return (
    <>
      {prefix}
      {v.toLocaleString()}
      {suffix}
    </>
  )
}

function ResultView({
  result,
  lesson,
  course,
  look,
  onBack,
  onDone,
  onNext,
  onChest,
}: {
  result: Result
  lesson: Lesson
  course: Course
  look: Look
  onBack: () => void
  onDone?: () => void
  onNext: () => void
  onChest: () => void
}) {
  const meta = CATEGORY_MAP[course.category]
  const [shown, setShown] = useState(0)
  const starEls = useRef<(HTMLSpanElement | null)[]>([])
  useEffect(() => {
    const ts: number[] = []
    for (let k = 0; k < 3; k++)
      ts.push(
        window.setTimeout(
          () => {
            setShown(k + 1)
            if (k < result.stars) {
              sfx('star')
              fxAt(starEls.current[k], 'burst', { color: '#FFD35A', n: 10 })
            }
            if (k === 2 && result.stars === 3) window.setTimeout(() => (sfx('levelup'), fxConfetti()), 250)
          },
          380 + k * 420,
        ),
      )
    return () => ts.forEach((t) => window.clearTimeout(t))
  }, [result.stars])
  const title = result.stars === 3 ? 'PERFECT!' : result.stars === 2 ? 'GREAT!' : 'CLEAR!'
  return (
    <div
      className="relative grid min-h-0 flex-1 overflow-hidden rounded-2xl"
      style={{
        background: 'radial-gradient(120% 100% at 50% 0%, #FFF9E6 0%, #FFFDF7 60%)',
      }}
    >
      <div className="rays-spin pointer-events-none absolute left-1/2 top-[30%] size-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60" />
      <div className="thin-scroll relative grid min-h-0 gap-3 overflow-y-auto p-2 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div className="text-center">
          <p className="title-logo animate-pop text-[2rem] font-black leading-none">{title}</p>
          <p className="mt-1 text-[0.75rem] font-black text-sub">
            정답 {result.correct}/{result.total}
            {result.maxCombo >= 2 && ` · 최고 ${result.maxCombo} 콤보`}
          </p>
          <div className="mt-1.5 flex items-end justify-center gap-1">
            {[0, 1, 2].map((k) => (
              <span key={k} ref={(el) => void (starEls.current[k] = el)} className={cx('inline-block', k === 1 && '-translate-y-2')}>
                {k < shown ? <StarIcon on={k < result.stars} size={k === 1 ? 54 : 44} className="star-pop" /> : <StarIcon on={false} size={k === 1 ? 54 : 44} className="opacity-40" />}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full bg-gradient-to-b from-[#FFF3C4] to-[#FFE08A] px-2.5 py-1 text-[0.75rem] font-black text-[#7A5600] ring-1 ring-[#E8B93A]">
              <CountUp to={result.exp} prefix="+" suffix=" EXP" />
            </span>
            <span className="rounded-full bg-coral-50 px-2.5 py-1 text-[0.75rem] font-black text-coral ring-1 ring-coral/20">⚡ 체력 +{result.energy}</span>
            {result.coins > 0 && (
              <span className="rounded-full bg-gradient-to-b from-[#FFE58A] to-sun px-2.5 py-1 text-[0.75rem] font-black text-ink ring-1 ring-[#D9A520]">
                🪙 <CountUp to={result.coins} prefix="+" suffix="원" />
              </span>
            )}
            {result.comboBonus > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[0.75rem] font-black text-orange ring-1 ring-orange/20">🔥 콤보 보너스 +{result.comboBonus}</span>}
          </div>
          {result.first && <p className="mt-1.5 text-[0.6875rem] font-bold text-sub">가게 효과: {SKILL_EFFECT[course.category]}</p>}
          {result.correct < result.total && <p className="text-[0.6875rem] font-bold text-sub">틀린 문제는 "복습"에 모아 뒀어요.</p>}
          <div className="mt-2.5 flex flex-wrap justify-center gap-2">
            <GameButton tone="white" size="sm" onClick={onBack}>
              🗺️ 지도
            </GameButton>
            {result.chestReady ? (
              <GameButton tone="sun" size="sm" onClick={onChest} className="chest-shake">
                🎁 보물상자 열기
              </GameButton>
            ) : onDone ? (
              <GameButton tone="green" size="sm" onClick={onDone}>
                돌아가기
              </GameButton>
            ) : (
              <GameButton tone="green" size="sm" onClick={onNext}>
                다음 스테이지 ▶
              </GameButton>
            )}
          </div>
        </div>
        <div className="flex items-end justify-center gap-2">
          <div className="card-in shine-sweep w-[12.5rem] overflow-hidden rounded-2xl border-[3px] border-white shadow-[0_8px_20px_rgba(32,34,68,0.25)]" style={{ animationDelay: '0.9s' }}>
            <div className="relative px-2.5 py-1.5 text-white" style={{ background: meta.gradient }}>
              <p className="text-[0.625rem] font-black opacity-90">📖 지식 카드 {result.first && '· NEW!'}</p>
              <p className="truncate text-[0.8125rem] font-black">
                {CAT_EMOJI[course.category]} {lesson.title}
              </p>
            </div>
            <p className="bg-white p-2.5 text-[0.75rem] font-bold leading-snug text-ink/85">📌 {lesson.takeaway}</p>
          </div>
          <PixelBuddy look={look} act="cheer" expr="happy" size={58} className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}

/* ───────── 지식 카드 도감 ───────── */
export function CollectionTab({ open }: { open: (lessonId: string) => void }) {
  const progress = useApp((s) => s.progress)
  const stars = useApp((s) => s.stars)
  const [sel, setSel] = useState<string | null>(null)
  const got = Object.values(progress).filter((p) => p.done).length
  let no = 0
  return (
    <div className="relative flex h-full min-h-[16rem] flex-col gap-2">
      <div className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#F1EEFF] to-[#EEF4FF] px-3 py-2">
        <span className="text-[1.5rem]">📖</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between">
            <span className="text-[0.875rem] font-black">지식 카드 도감</span>
            <span className="text-[0.75rem] font-black text-violet">
              {got}/{TOTAL_LESSONS}장
            </span>
          </span>
          <Bar value={got / TOTAL_LESSONS} color="bg-gradient-to-r from-violet to-primary" className="mt-1" />
        </span>
      </div>
      <div
        className="thin-scroll grid min-h-0 flex-1 content-start gap-2 overflow-y-auto pb-1"
        style={{
          gridTemplateColumns: 'repeat(auto-fill, minmax(7.4rem, 1fr))',
        }}
      >
        {COURSES.flatMap((c) =>
          c.lessons.map((l) => {
            no++
            const done = !!progress[l.id]?.done
            const s = lessonStars(l.id, stars, progress)
            const meta = CATEGORY_MAP[c.category]
            return done ? (
              <button
                key={l.id}
                onClick={() => {
                  sfx('page')
                  setSel(l.id)
                }}
                className={cx(
                  'relative flex h-[8.6rem] flex-col overflow-hidden rounded-2xl border-[3px] border-white text-left shadow-[0_4px_10px_rgba(32,34,68,0.18)] transition active:scale-95',
                  s === 3 && 'shine-sweep',
                )}
                style={{ background: meta.gradient }}
              >
                <span className="absolute left-1.5 top-1 text-[0.625rem] font-black text-white/85">No.{String(no).padStart(2, '0')}</span>
                <span className="absolute right-1 top-1 flex">
                  {[0, 1, 2].map((k) => (
                    <StarIcon key={k} on={k < s} size={10} />
                  ))}
                </span>
                <span className="grid flex-1 place-items-center text-[2rem] drop-shadow">{CAT_EMOJI[c.category]}</span>
                <span className="bg-white/95 px-1.5 py-1 text-[0.6875rem] font-black leading-tight text-ink">
                  <span className="line-clamp-2">{l.title}</span>
                </span>
              </button>
            ) : (
              <div key={l.id} className="relative flex h-[8.6rem] flex-col overflow-hidden rounded-2xl border-[3px] border-dashed border-black/10 bg-gradient-to-b from-[#EDEBF3] to-[#E1DEEA]">
                <span className="absolute left-1.5 top-1 text-[0.625rem] font-black text-black/30">No.{String(no).padStart(2, '0')}</span>
                <span className="grid flex-1 place-items-center">
                  <span className="silhouette text-[2rem]">{CAT_EMOJI[c.category]}</span>
                </span>
                <span className="px-1.5 py-1 text-[0.625rem] font-black leading-tight text-black/35">
                  ??? <span className="block truncate">{c.title}</span>
                </span>
              </div>
            )
          }),
        )}
      </div>
      {sel && (
        <Overlay onClose={() => setSel(null)}>
          {(() => {
            const l = LESSON_MAP[sel]
            const c = COURSE_MAP[l.courseId]
            const meta = CATEGORY_MAP[c.category]
            const s = lessonStars(sel, stars, progress)
            return (
              <div className="card-in overflow-hidden rounded-[1.4rem] border-[3px] border-white shadow-2xl">
                <div className="relative flex items-center gap-2 px-3 py-2.5 text-white" style={{ background: meta.gradient }}>
                  <span className="text-[2rem]">{CAT_EMOJI[c.category]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.625rem] font-black opacity-90">
                      {meta.name} · {c.title}
                    </span>
                    <span className="block text-[1rem] font-black leading-snug">{l.title}</span>
                  </span>
                  <span className="flex">
                    {[0, 1, 2].map((k) => (
                      <StarIcon key={k} on={k < s} size={18} />
                    ))}
                  </span>
                </div>
                <div className="space-y-2 bg-[#FFFDF7] p-3">
                  <p className="rounded-xl bg-primary-50 p-2.5 text-[0.875rem] font-black text-primary">📌 {l.takeaway}</p>
                  <ul className="space-y-0.5">
                    {l.cards.map((cd) => (
                      <li key={cd.title} className="flex gap-1.5 text-[0.75rem] font-semibold text-ink/80">
                        <span>{KIND[cd.kind].icon}</span> {cd.title}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <GameButton tone="white" size="sm" className="flex-1" onClick={() => setSel(null)}>
                      닫기
                    </GameButton>
                    <GameButton tone="violet" size="sm" className="flex-[2]" onClick={() => open(sel)}>
                      {s < 3 ? '⭐ 3개 도전하기' : '📘 다시 보기'}
                    </GameButton>
                  </div>
                </div>
              </div>
            )
          })()}
        </Overlay>
      )}
    </div>
  )
}
