import { useRef, useState } from 'react'
import { useApp } from '@/store/app'
import { todayKey } from '@/lib/date'
import { TreeArt } from '../render/Tree'
import { TOTAL_LESSONS, TREE_STAGES, learnStreak, nextStage, totalStars, treeStage } from '../learn'
import { LESSON_MAP } from '@/data/courses'
import { useWorld } from '../store'
import { sfx } from '../audio'
import { fxAt } from '../fx'
import { emote } from '../emote'
import { Bar, cx, GameButton, Panel } from '../ui/kit'
import { PixelBuddy, StarIcon, useMyLook } from './LearnGame'

function isNight() {
  const h = new Date().getHours()
  return h >= 19 || h < 6
}

export function TreePanel({ onClose, goAcademy, openLesson }: { onClose: () => void; goAcademy: () => void; openLesson: (id: string) => void }) {
  const progress = useApp((s) => s.progress)
  const stars = useApp((s) => s.stars)
  const logs = useApp((s) => s.logs)
  const watered = useApp((s) => s.treeWater === todayKey())
  const look = useMyLook()
  const done = Object.values(progress).filter((p) => p.done).length
  const t = treeStage(done)
  const streak = learnStreak(logs, todayKey())
  const studiedToday = logs.some((l) => l.date === todayKey())
  const next = nextStage(null, progress)
  const treeBox = useRef<HTMLDivElement>(null)
  const [act, setAct] = useState<'work' | 'cheer' | null>(null)
  const [drops, setDrops] = useState(0)

  const water = () => {
    if (!useApp.getState().waterTree()) return
    setAct('work')
    setDrops((d) => d + 1)
    sfx('plant')
    window.setTimeout(() => {
      fxAt(treeBox.current, 'burst', { emoji: '💧', n: 9 })
      fxAt(treeBox.current, { float: '+5 EXP', color: '#9BE7FF' })
      sfx('harvest')
      useWorld.getState().addExp(5)
      if (studiedToday) useWorld.getState().gainEnergy(2)
      setAct('cheer')
      emote('cheer', '🌱')
    }, 700)
    window.setTimeout(() => setAct(null), 2400)
  }

  return (
    <Panel title="배움 나무" icon="🌳" color="#3FA34D" wide onClose={onClose}>
      <div className="grid h-full gap-3 md:grid-cols-[17rem_1fr]">
        {/* 나무 */}
        <div
          className="relative flex min-h-[14rem] flex-col overflow-hidden rounded-2xl border-2 border-black/5"
          style={{ background: isNight() ? 'linear-gradient(180deg,#26306B 0%,#46508F 55%,#6C8F5A 56%,#4F7A45 100%)' : 'linear-gradient(180deg,#BDE8FF 0%,#E9F8FF 55%,#A8DB8A 56%,#86C66E 100%)' }}
        >
          <span className="pointer-events-none absolute left-3 top-2 text-[0.875rem] opacity-80">{isNight() ? '🌙' : '☁️'}</span>
          <span className="pointer-events-none absolute right-6 top-5 text-[0.625rem] opacity-70">{isNight() ? '✨' : '☁️'}</span>
          <div ref={treeBox} className="relative flex flex-1 items-end justify-center">
            <svg viewBox="-62 -112 124 124" className="h-full max-h-[12.5rem] w-full" aria-label={`배움 나무 ${t.stage.name}`}>
              <TreeArt key={drops} stage={t.index} night={isNight()} sign={false} />
            </svg>
            <span className="absolute bottom-1 left-2">
              <PixelBuddy look={look} act={act} expr={act ? 'happy' : null} yaw={60} size={44} />
            </span>
          </div>
          <div className="relative bg-white/85 px-3 py-2 backdrop-blur">
            <p className="flex items-center justify-between">
              <span className="text-[1rem] font-black">
                {t.stage.emoji} {t.stage.name}
              </span>
              <span className="rounded-full bg-teal px-2 py-0.5 text-[0.625rem] font-black text-white">
                {t.index + 1}/{TREE_STAGES.length}단계
              </span>
            </p>
            <p className="text-[0.75rem] font-semibold text-sub">{t.stage.desc}</p>
          </div>
        </div>

        {/* 정보 */}
        <div className="flex min-h-0 flex-col gap-2">
          <div className="rounded-2xl bg-gradient-to-r from-[#E8F6E4] to-[#F4FBEF] p-3">
            {t.next ? (
              <>
                <p className="flex items-baseline justify-between">
                  <span className="text-[0.875rem] font-black">
                    다음: {t.next.emoji} {t.next.name}
                  </span>
                  <span className="text-[0.75rem] font-black text-teal">레슨 {t.next.need - done}개 남음</span>
                </p>
                <Bar value={t.progress} color="bg-gradient-to-r from-[#7BCB5A] to-teal" className="mt-1.5 h-3" />
              </>
            ) : (
              <p className="text-[0.875rem] font-black">✨ 모든 레슨을 마쳤어요! 동네 최고의 나무예요</p>
            )}
            <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
              {[
                ['📘', `${done}/${TOTAL_LESSONS}`, '레슨'],
                ['⭐', `${totalStars(stars, progress)}`, '별'],
                ['🔥', `${streak}일`, '연속'],
                ['📖', `${done}장`, '지식 카드'],
              ].map(([e, v, l]) => (
                <div key={l} className="rounded-xl bg-white/90 py-1 shadow-sm">
                  <p className="text-[0.9375rem] font-black leading-tight">
                    {e === '⭐' ? <StarIcon on size={13} className="-mt-0.5 mr-0.5 inline" /> : e} {v}
                  </p>
                  <p className="text-[0.5625rem] font-bold text-sub">{l}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="no-scrollbar flex gap-1 overflow-x-auto">
            {TREE_STAGES.map((st, k) => (
              <div
                key={st.name}
                className={cx('flex min-w-[4.6rem] flex-1 flex-col items-center rounded-xl px-1 py-1.5 text-center', k <= t.index ? 'bg-teal-50 ring-2 ring-teal/30' : 'bg-black/5 opacity-60')}
              >
                <span className={cx('text-[1.25rem] leading-none', k > t.index && 'grayscale')}>{st.emoji}</span>
                <span className="mt-0.5 text-[0.5625rem] font-black leading-tight">{st.name}</span>
                <span className="text-[0.5rem] font-bold text-sub">레슨 {st.need}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <GameButton tone={watered ? 'white' : 'primary'} disabled={watered} onClick={water} className="flex-1">
              💧 {watered ? '오늘은 물을 줬어요' : studiedToday ? '물 주기 (+5 EXP · ⚡+2)' : '물 주기 (+5 EXP)'}
            </GameButton>
            {next ? (
              <GameButton tone="green" className="flex-1" onClick={() => openLesson(next.lessonId)}>
                📚 {LESSON_MAP[next.lessonId].title.slice(0, 10)}
                {LESSON_MAP[next.lessonId].title.length > 10 ? '…' : ''} 배우기
              </GameButton>
            ) : (
              <GameButton tone="green" className="flex-1" onClick={goAcademy}>
                🏫 배움터 가기
              </GameButton>
            )}
          </div>
          <p className="text-[0.625rem] font-semibold text-mute">레슨을 하나 끝낼 때마다 나무가 자라요. 오늘 공부한 날 물을 주면 체력도 조금 회복돼요.</p>
        </div>
      </div>
    </Panel>
  )
}
