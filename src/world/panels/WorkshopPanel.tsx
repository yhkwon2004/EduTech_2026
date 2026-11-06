import { CheckCircle2, Hammer, Lock, ShoppingBasket } from 'lucide-react'
import { useWorld, levelOf, craftSlots } from '../store'
import { itemInfo, recipeUnitCost } from '../items'
import { useGame } from '@/game/store'
import { lessonSkills } from '../actions'
import { Bar, Card, Chip, GameButton, Panel, mmss, toast, won } from '../ui/kit'
import { useNow } from './FarmPanel'

export function WorkshopPanel({ onClose, goMarket, goShop }: { onClose: () => void; goMarket: () => void; goShop: () => void }) {
  const w = useWorld()
  const g = useGame()
  const now = useNow()
  const level = levelOf(w.exp).level
  const slots = craftSlots(level, w.slotsBought)
  const ops = lessonSkills().ops
  const timeMul = Math.max(0.6, 1 - 0.05 * ops)

  if (!g.started)
    return (
      <Panel title="공방 주방" icon="🍳" color="#8B5A3C" onClose={onClose}>
        <div className="grid h-full place-items-center text-center">
          <div>
            <p className="text-[2.5rem]">🍳</p>
            <p className="text-[1rem] font-black">가게를 열면 이곳에서 상품을 만들어요</p>
            <p className="mt-1 text-[0.8125rem] text-sub">
              {w.path === 'employee' ? '골목상사에서 경험을 쌓고 창업하면 열려요. 지금은 텃밭 작물을 시장에 팔아 부업을 할 수 있어요.' : '먼저 "내 가게"에서 창업을 마쳐 주세요.'}
            </p>
            {w.path !== 'employee' && (
              <GameButton className="mt-3" onClick={goShop}>
                내 가게로
              </GameButton>
            )}
          </div>
        </div>
      </Panel>
    )

  const crafted = g.products.filter((p) => w.recipes[p.id]?.type === 'craft')

  return (
    <Panel
      title="공방 주방"
      icon="🍳"
      color="#8B5A3C"
      wide
      onClose={onClose}
      footer={
        <div className="flex items-center justify-between gap-2 text-[0.75rem] font-semibold text-sub">
          <span>
            💡 만든 상품은 가게 재고로 들어가요. 운영 노하우 Lv{ops} → 만드는 시간 -{Math.round((1 - timeMul) * 100)}%
          </span>
          {w.slotsBought < 2 && (
            <GameButton
              size="sm"
              tone="sun"
              onClick={() => toast(w.buySlot(500000) ? '작업대를 하나 더 놓았어요!' : '돈이 부족해요 (50만 원)', w.cash >= 500000 ? 'good' : 'bad')}
            >
              작업대 추가 50만
            </GameButton>
          )}
        </div>
      }
    >
      <div className="grid h-full gap-3 md:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="mb-1.5 text-[0.8125rem] font-black">작업대 {w.crafting.length}/{slots}</p>
          <div className="space-y-2">
            {Array.from({ length: slots }, (_, i) => {
              const job = w.crafting[i]
              if (!job)
                return (
                  <div key={i} className="rounded-2xl border-2 border-dashed border-black/10 p-3 text-center text-[0.8125rem] font-bold text-mute">
                    빈 작업대 — 오른쪽에서 만들 상품을 골라요
                  </div>
                )
              const p = g.products.find((x) => x.id === job.productId)
              const left = job.readyAt - now
              const done = left <= 0
              return (
                <Card key={i} className={done ? 'ring-2 ring-teal' : ''}>
                  <div className="flex items-center gap-2">
                    <span className="text-[1.5rem]">{p?.emoji ?? '📦'}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[0.875rem] font-black">
                        {p?.name} ×{job.qty}
                      </span>
                      <span className="block text-[0.6875rem] font-semibold text-sub">{done ? '완성!' : `${mmss(left)} 남음`}</span>
                    </span>
                    {done && (
                      <GameButton
                        size="sm"
                        tone="green"
                        onClick={() => {
                          const n = w.collectCraft(i)
                          if (n) toast(`${p?.emoji} ${p?.name} ${n}개 완성 → 가게 재고로! · +6 EXP`)
                        }}
                      >
                        <CheckCircle2 className="size-4" /> 꺼내기
                      </GameButton>
                    )}
                  </div>
                  {!done && <Bar value={(now - job.startedAt) / (job.readyAt - job.startedAt)} color="bg-orange" className="mt-2" />}
                </Card>
              )
            })}
            {slots < 3 && (
              <p className="flex items-center gap-1 text-[0.6875rem] font-bold text-mute">
                <Lock className="size-3" /> 레벨 {level < 3 ? 3 : 6}이 되면 작업대가 하나 더 생겨요
              </p>
            )}
          </div>
          <p className="mb-1.5 mt-3 text-[0.8125rem] font-black">가게 재고</p>
          <div className="flex flex-wrap gap-1.5">
            {g.products.map((p) => (
              <Chip key={p.id} tone={(w.stock[p.id] ?? 0) > 0 ? 'blue' : 'mute'}>
                {p.emoji} {p.name} {w.stock[p.id] ?? 0}
              </Chip>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {crafted.length === 0 && <p className="py-6 text-center text-[0.8125rem] font-semibold text-sub">직접 만드는 판매 항목이 없어요. 도매 상품은 도매시장에서 들여와요.</p>}
          {crafted.map((p) => {
            const r = w.recipes[p.id]
            if (r?.type !== 'craft') return null
            const lacking = r.inputs.filter((i) => (w.inventory[i.id] ?? 0) < i.qty)
            const unit = recipeUnitCost(r, p.cost)
            return (
              <Card key={p.id}>
                <div className="flex items-center gap-2">
                  <span className="text-[1.75rem]">{p.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.9375rem] font-black">
                      {p.name} <span className="text-[0.75rem] font-bold text-sub">한 번에 {r.yield}개</span>
                    </span>
                    <span className="block text-[0.6875rem] font-semibold text-sub">
                      ⏱ {mmss(r.minutes * 60000 * timeMul / (w.fast ? 10 : 1))} · 1개 원가 약 {unit.toLocaleString()}원 (판매가 {p.price.toLocaleString()}원, 원가율 {Math.round((unit / p.price) * 100)}%)
                    </span>
                  </span>
                  <GameButton
                    size="sm"
                    tone="primary"
                    disabled={lacking.length > 0 || w.crafting.length >= slots}
                    onClick={() => {
                      const res = w.startCraft(p.id, r, timeMul)
                      if (res === 'ok') toast(`${p.emoji} ${p.name} 만들기 시작! · 체력 -2`)
                      else if (res === 'energy') toast('체력이 부족해요', 'bad')
                    }}
                  >
                    <Hammer className="size-3.5" /> 만들기
                  </GameButton>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.inputs.map((i) => {
                    const info = itemInfo(i.id)
                    const have = w.inventory[i.id] ?? 0
                    return (
                      <Chip key={i.id} tone={have >= i.qty ? 'green' : 'coral'}>
                        {info.emoji} {info.name} {have}/{i.qty}
                      </Chip>
                    )
                  })}
                  {lacking.length > 0 && (
                    <button onClick={goMarket} className="flex items-center gap-0.5 text-[0.6875rem] font-black text-primary">
                      <ShoppingBasket className="size-3.5" /> 재료 사러 가기 (약 {won(lacking.reduce((s, i) => s + itemInfo(i.id).price * (i.qty - (w.inventory[i.id] ?? 0)), 0))}원)
                    </button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </Panel>
  )
}
