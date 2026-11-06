import { useEffect, useState } from 'react'
import { emote } from '../emote'
import { Droplets, ShoppingBasket, Sprout } from 'lucide-react'
import { useWorld, levelOf } from '../store'
import { CROPS, CROP_MAP } from '../items'
import { PLOT_MAP } from '../map'
import { Bar, Card, Chip, GameButton, Panel, mmss, toast } from '../ui/kit'

export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

export function FarmPanel({ plotId, onClose, goMarket }: { plotId: string; onClose: () => void; goMarket: () => void }) {
  const w = useWorld()
  const now = useNow()
  const plot = PLOT_MAP[plotId]
  const st = w.plots[plotId]
  const level = levelOf(w.exp).level
  const crop = st?.crop ? CROP_MAP[st.crop] : undefined
  const paddy = plot.kind === 'paddy'
  const name = paddy ? '논' : '밭'

  if (level < plot.level)
    return (
      <Panel title={`${name} (잠김)`} icon="🔒" color="#8B5A3C" onClose={onClose}>
        <div className="grid h-full place-items-center text-center">
          <div>
            <p className="text-[2.5rem]">🔒</p>
            <p className="text-[1rem] font-black">레벨 {plot.level}이 되면 쓸 수 있어요</p>
            <p className="mt-1 text-[0.8125rem] text-sub">작물을 키우고, 상품을 만들고, 레슨을 들으면 경험치가 쌓여요.</p>
          </div>
        </div>
      </Panel>
    )

  if (!crop) {
    const seeds = CROPS.filter((c) => !!c.paddy === paddy && (w.seeds[c.id] ?? 0) > 0)
    return (
      <Panel title={`빈 ${name}`} icon={paddy ? '🌾' : '🌱'} color={paddy ? '#2E9C9C' : '#3FA34D'} onClose={onClose}>
        <p className="mb-2 text-[0.8125rem] font-semibold text-sub">
          {paddy ? '논에는 벼만 심을 수 있어요. 벼에서 나온 쌀로 김밥·떡볶이·도시락을 만들어요.' : '씨앗을 골라 심으세요. 직접 키우면 시장에서 사는 것보다 재료비가 훨씬 싸요.'}
        </p>
        {seeds.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {seeds.map((c) => (
              <Card key={c.id} className="flex items-center gap-2.5">
                <span className="text-[1.75rem]">{c.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.875rem] font-black">{c.name}</span>
                  <span className="block text-[0.6875rem] font-semibold text-sub">
                    {c.minutes}분 · 수확 {c.yield}개 · 씨앗 {w.seeds[c.id]}
                  </span>
                </span>
                <GameButton
                  size="sm"
                  tone="green"
                  onClick={() => {
                    const r = w.plant(plotId, c.id)
                    if (r === 'ok') {
                      toast(`${c.emoji} ${c.name}을(를) 심었어요 · 체력 -1`)
                      emote('work', '🌱')
                      onClose()
                    } else if (r === 'energy') toast('체력이 부족해요. 잠시 쉬거나 레슨을 들어 보세요', 'bad')
                  }}
                >
                  <Sprout className="size-3.5" /> 심기
                </GameButton>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <p className="text-[0.9375rem] font-black">{paddy ? '벼 씨앗이 없어요' : '씨앗이 없어요'}</p>
            <p className="mt-0.5 text-[0.75rem] text-sub">도매시장에서 씨앗을 사 오세요.</p>
            <GameButton className="mt-2" onClick={goMarket}>
              <ShoppingBasket className="size-4" /> 도매시장으로
            </GameButton>
          </Card>
        )}
      </Panel>
    )
  }

  const total = (st!.readyAt ?? 0) - (st!.plantedAt ?? 0)
  const left = (st!.readyAt ?? 0) - now
  const ready = left <= 0
  return (
    <Panel title={`${crop.name} ${name}`} icon={crop.emoji} color={ready ? '#F2A93B' : '#3FA34D'} onClose={onClose}>
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-[3rem] leading-none">{ready ? crop.emoji : '🌱'}</p>
        {ready ? (
          <>
            <p className="text-[1.125rem] font-black">다 자랐어요! 수확할 때예요</p>
            <p className="text-[0.8125rem] text-sub">
              {crop.yield + (st!.watered ? 1 : 0)}개를 거둘 수 있어요 {st!.watered && <Chip tone="blue">물 준 보너스 +1</Chip>}
            </p>
            <GameButton
              size="lg"
              tone="sun"
              onClick={() => {
                const n = w.harvest(plotId)
                if (n > 0) {
                  toast(`${crop.emoji} ${crop.name} ${n}개 수확! · +4 EXP`)
                  emote('cheer', crop.emoji)
                  onClose()
                } else if (n < 0) toast('체력이 부족해요', 'bad')
              }}
            >
              🧺 수확하기 (체력 1)
            </GameButton>
          </>
        ) : (
          <>
            <p className="text-[1rem] font-black">자라는 중 · {mmss(left)} 남음</p>
            <Bar value={1 - left / total} color="bg-leaf" className="h-3 w-64" />
            {st!.watered ? (
              <Chip tone="blue">💧 물을 줘서 빨리 자라는 중</Chip>
            ) : (
              <GameButton
                tone="primary"
                onClick={() => {
                  if (w.water(plotId)) {
                    toast('💧 물을 줬어요 · 남은 시간 40% 단축 + 수확 +1')
                    emote('work', '💧')
                  }
                  else toast('체력이 부족해요', 'bad')
                }}
              >
                <Droplets className="size-4" /> 물 주기 (체력 1)
              </GameButton>
            )}
            <p className="max-w-[22rem] text-[0.75rem] text-sub">기다리는 동안 공방에서 상품을 만들거나 배움터에서 3분 레슨을 들어 보세요.</p>
          </>
        )}
      </div>
    </Panel>
  )
}
