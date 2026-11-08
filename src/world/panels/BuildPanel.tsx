import { useEffect, useRef, useState } from 'react'
import { Check, Hammer, Lock } from 'lucide-react'
import { useApp } from '@/store/app'
import { useWorld, levelOf } from '../store'
import { BUILDING_MAP, BUILD_MAP, type BuildingId } from '../map'
import { buildStatus } from '../build'
import { sfx } from '../audio'
import { fxAt, fxConfetti } from '../fx'
import { emote } from '../emote'
import { Bar, Card, Chip, cx, GameButton, Panel, mmss, toast, won } from '../ui/kit'
import { useNow } from './FarmPanel'
import { PixelBuddy, useMyLook } from './LearnGame'

const PREVIEW: Record<string, { bg: string; desc: string; items: string[] }> = {
  market: {
    bg: 'linear-gradient(135deg,#5FCB6D,#2E9C6A)',
    desc: '씨앗·재료를 사고, 키운 작물을 팔아요. 시세가 매일 바뀌어서 싼 날을 노려요.',
    items: ['🌱 씨앗 9종', '🥩 재료 사기', '📈 매일 바뀌는 시세', '💰 작물 팔기'],
  },
  workshop: {
    bg: 'linear-gradient(135deg,#F2A93B,#C9742B)',
    desc: '레시피대로 재료를 넣어 상품을 만들어요. 작업대는 레벨마다 늘어나요.',
    items: ['🍳 레시피 제작', '⏱ 실시간 타이머', '🔧 작업대 최대 5개', '📊 원가율 보기'],
  },
  support: {
    bg: 'linear-gradient(135deg,#2FA594,#167F71)',
    desc: '지원사업을 신청하고 정책자금을 빌리고, 오늘의 영수증을 정리해요.',
    items: ['📄 지원사업 신청', '🏦 정책자금 대출·상환', '🧾 영수증 적격증빙', '📞 상담 전화'],
  },
}

export function BuildPanel({ id, onClose, openLesson, onBuilt }: { id: BuildingId; onClose: () => void; openLesson: (lessonId: string) => void; onBuilt: () => void }) {
  const w = useWorld()
  const progress = useApp((s) => s.progress)
  const now = useNow(500)
  const def = BUILD_MAP[id]
  const b = BUILDING_MAP[id]
  const st = def ? buildStatus(id, w, progress, now) : null
  const look = useMyLook()
  const pv = PREVIEW[id]
  const [celebrate, setCelebrate] = useState(false)
  const btn = useRef<HTMLDivElement>(null)
  const total = def ? (def.minutes * 60_000) / (w.fast ? 10 : 1) : 1
  useEffect(() => {
    if (st?.state === 'finished') sfx('star')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st?.state])
  if (!def || !st || !b) return null

  const start = () => {
    if (!w.startBuild(id, def.cost, def.minutes)) return toast('돈이 모자라요', 'bad')
    sfx('plant')
    fxAt(btn.current, 'burst', { emoji: '🔨', n: 10 })
    emote('work', '🔨')
    toast(`🏗️ ${b.name} 공사를 시작했어요!`)
  }
  const finish = () => {
    if (!w.finishBuild(id)) return
    setCelebrate(true)
    sfx('levelup')
    fxConfetti()
    emote('cheer', def.emoji)
    window.setTimeout(() => sfx('chest'), 500)
  }

  return (
    <Panel title={celebrate ? `${b.name} 완공!` : st.state === 'done' ? b.name : `${b.name} 짓기`} icon={def.emoji} color="#C9742B" wide onClose={onClose}>
      <div className="grid h-full gap-3 md:grid-cols-[15rem_1fr]">
        {/* 설계도 */}
        <div className="relative flex flex-col overflow-hidden rounded-2xl text-white" style={{ background: pv?.bg }}>
          <span
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '14px 14px' }}
          />
          <div className="relative p-3">
            <p className="text-[0.625rem] font-black opacity-80">
              BLUEPRINT · {b.x},{b.y}
            </p>
            <p className={cx('text-[2.75rem] leading-none drop-shadow', celebrate && 'star-pop')}>{def.emoji}</p>
            <p className="mt-1 text-[1.0625rem] font-black leading-tight">{b.name}</p>
            <p className="mt-1 text-[0.75rem] font-semibold opacity-90">{pv?.desc}</p>
          </div>
          <ul className="relative mt-auto space-y-0.5 bg-black/15 p-3 text-[0.75rem] font-bold">
            {pv?.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          {celebrate ? (
            <div className="grid flex-1 place-items-center text-center">
              <div>
                <p className="title-logo text-[2rem] font-black">COMPLETE!</p>
                <PixelBuddy look={look} act="cheer" expr="happy" size={70} className="mx-auto" />
                <p className="text-[0.9375rem] font-black">
                  {def.emoji} {b.name}가 마을에 생겼어요
                </p>
                <p className="mt-0.5 text-[0.75rem] font-semibold text-sub">{def.unlocks}</p>
                <div className="mt-3 flex justify-center gap-2">
                  <GameButton tone="white" size="sm" onClick={onClose}>
                    닫기
                  </GameButton>
                  <GameButton tone="green" size="sm" onClick={onBuilt}>
                    들어가 보기 ▶
                  </GameButton>
                </div>
              </div>
            </div>
          ) : st.state === 'building' || st.state === 'finished' ? (
            <div className="grid flex-1 place-items-center text-center">
              <div className="w-full max-w-[26rem]">
                <p className="text-[2.5rem]">{st.state === 'finished' ? '🎀' : '🏗️'}</p>
                <p className="text-[1.125rem] font-black">{st.state === 'finished' ? '공사가 끝났어요!' : '열심히 짓는 중'}</p>
                {st.state === 'building' && (
                  <>
                    <Bar value={1 - ((st.readyAt ?? now) - now) / total} color="bg-gradient-to-r from-[#FFB86B] to-[#F2A93B]" className="mt-2 h-3" />
                    <p className="mt-1 text-[0.8125rem] font-bold text-sub">{mmss((st.readyAt ?? now) - now)} 남음 · 마을을 둘러보다 오세요</p>
                    {!w.fast && <p className="mt-1 text-[0.6875rem] font-semibold text-mute">설정의 체험 모드를 켜면 10배 빨라요</p>}
                  </>
                )}
                {st.state === 'finished' && (
                  <GameButton tone="sun" size="lg" className="chest-shake mt-3" onClick={finish}>
                    🎉 완공하기
                  </GameButton>
                )}
              </div>
            </div>
          ) : (
            <>
              <Card>
                <p className="text-[0.8125rem] font-black">📋 짓기 전에 필요한 것</p>
                <ul className="mt-1.5 space-y-1">
                  {[
                    {
                      ok: !def.lesson || !!progress[def.lesson]?.done,
                      text: def.lesson ? `배움터 「${st.lessonTitle}」 스테이지 깨기` : '레슨 없음',
                      sub: def.why,
                      action: def.lesson && !progress[def.lesson]?.done ? () => openLesson(def.lesson!) : undefined,
                    },
                    { ok: levelOf(w.exp).level >= def.level, text: `레벨 ${def.level} 이상 (지금 Lv.${levelOf(w.exp).level})`, sub: '레슨·퀘스트로 EXP를 모아요' },
                    { ok: w.cash >= def.cost, text: `${def.cost.toLocaleString()}원 (지갑 ${won(w.cash)}원)`, sub: '작물을 팔거나 퀘스트 보상으로' },
                  ].map((r) => (
                    <li key={r.text} className={cx('flex items-center gap-2 rounded-xl px-2 py-1.5', r.ok ? 'bg-teal-50' : 'bg-black/5')}>
                      <span className={cx('grid size-6 shrink-0 place-items-center rounded-lg', r.ok ? 'bg-teal text-white' : 'bg-white text-mute')}>
                        {r.ok ? <Check className="size-4" strokeWidth={3.5} /> : <Lock className="size-3.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-[0.8125rem] font-black', !r.ok && 'text-ink/80')}>{r.text}</span>
                        <span className="block text-[0.6875rem] font-semibold text-sub">{r.sub}</span>
                      </span>
                      {r.action && (
                        <GameButton size="sm" tone="violet" onClick={r.action}>
                          📚 배우러 가기
                        </GameButton>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
              <div className="mt-auto flex items-center gap-2">
                <Chip tone="sun">⏱ 공사 {w.fast ? `${Math.max(1, Math.round(def.minutes * 6))}초` : `${def.minutes}분`}</Chip>
                <Chip>💰 {def.cost.toLocaleString()}원</Chip>
                <span className="flex-1" />
                <div ref={btn}>
                  <GameButton tone={st.state === 'ready' ? 'sun' : 'white'} disabled={st.state !== 'ready'} onClick={start} className={cx(st.state === 'ready' && 'shine-sweep')}>
                    <Hammer className="size-4" /> {st.state === 'ready' ? '짓기 시작!' : '아직 지을 수 없어요'}
                  </GameButton>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Panel>
  )
}
