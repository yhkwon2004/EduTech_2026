import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Coins, Landmark } from 'lucide-react'
import { useGame, trainCost, upgradeCost } from '@/game/store'
import { useGameContext } from '@/game/hooks'
import { BIZ_PROFILE, UPGRADES } from '@/game/data'
import { capacityOf } from '@/game/sim'
import { Stars, Storefront, won } from '@/game/ui'
import { cx, TopBar } from '@/components/ui'

type Kind = keyof typeof UPGRADES

export function GameInvest() {
  const nav = useNavigate()
  const g = useGame()
  const ctx = useGameContext()
  const [msg, setMsg] = useState<string | null>(null)
  if (!g.started) return <Navigate to="/game/setup" replace />

  const cap = capacityOf(g.biz, g.stats, ctx.skills)
  const prof = BIZ_PROFILE[g.biz]

  const buy = (k: Kind) => {
    const ok = g.buy(k, ctx.discount)
    setMsg(ok ? `${UPGRADES[k].label} 완료!` : '돈이 모자라요')
  }

  return (
    <div className="min-h-dvh pb-10">
      <TopBar
        title="가게 투자"
        right={
          <span className="flex h-10 items-center gap-1 rounded-full bg-white px-3 text-[0.875rem] font-extrabold shadow-card">
            <Coins className="size-4 text-[#B7860B]" />
            {won(g.stats.cash)}
          </span>
        }
      />
      <div className="px-5">
        <div className="overflow-hidden rounded-[1.5rem] bg-white shadow-card">
          <Storefront name={g.shopName} emoji={g.shopEmoji} color={g.color} equipment={g.stats.equipment} interior={g.stats.interior} staff={g.stats.staff} />
          <p className="border-t border-line px-4 py-2.5 text-[0.8125rem] font-bold text-sub">하루 수용량 {cap}명 · 투자하면 가게 그림도 바뀌어요</p>
        </div>
        {ctx.discount > 0 && (
          <p className="mt-3 flex items-center gap-1.5 rounded-2xl bg-teal-50 px-4 py-2.5 text-[0.8125rem] font-bold text-teal">
            <Landmark className="size-4" /> 정부지원 노하우로 투자비 {Math.round(ctx.discount * 100)}% 할인 중
          </p>
        )}
        {msg && <p className="mt-3 animate-fade-in rounded-2xl bg-primary-50 px-4 py-2.5 text-[0.8125rem] font-bold text-primary">{msg}</p>}
      </div>

      <div className="mt-4 space-y-2.5 px-5">
        {(Object.keys(UPGRADES) as Kind[]).map((k) => {
          const u = UPGRADES[k]
          const lv = g.stats[k]
          const cost = upgradeCost(k, lv, ctx.discount)
          const effect =
            k === 'equipment' ? `수용량 +${prof.equipCapacity}명` : k === 'staff' ? `수용량 +${prof.staffCapacity}명 · 하루 인건비 ${won(prof.wage)}원` : '평판 목표 +0.2 · 인지도 +3'
          return (
            <div key={k} className="flex items-center gap-3 rounded-[1.25rem] bg-white p-4 shadow-card">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-[1.5rem]">{u.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[0.9375rem] font-extrabold">
                  {u.label} <span className="text-[0.75rem] font-bold text-primary">Lv.{lv}/{u.max}</span>
                </span>
                <span className="block text-[0.75rem] font-semibold text-sub">{u.desc}</span>
                <span className="block text-[0.71875rem] font-bold text-teal">{effect}</span>
              </span>
              <button
                disabled={cost === null || g.stats.cash < cost}
                onClick={() => buy(k)}
                className="h-10 shrink-0 rounded-full bg-primary px-3.5 text-[0.8125rem] font-extrabold text-white disabled:bg-bg disabled:text-mute"
              >
                {cost === null ? '최대' : `${won(cost)}원`}
              </button>
            </div>
          )
        })}
      </div>

      <h2 className="mt-6 px-5 text-[1.0625rem] font-extrabold">품질 올리기 (레시피·기술 교육)</h2>
      <p className="px-5 text-[0.8125rem] text-sub">품질이 오르면 같은 가격에도 손님이 더 끌리고 평판이 올라요.</p>
      <div className="mt-3 space-y-2 px-5">
        {g.products.map((p) => {
          const cost = trainCost(p.quality, ctx.discount)
          return (
            <div key={p.id} className="flex items-center gap-3 rounded-[1.25rem] bg-white p-3.5 shadow-card">
              <span className="text-[1.5rem]">{p.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.9375rem] font-bold">{p.name}</span>
                <Stars value={p.quality} size={12} />
              </span>
              <button
                disabled={cost === null || g.stats.cash < cost}
                onClick={() => setMsg(g.train(p.id, ctx.discount) ? `${p.name} 품질 UP!` : '돈이 모자라요')}
                className={cx('h-10 shrink-0 rounded-full px-3.5 text-[0.8125rem] font-extrabold', 'bg-sun text-ink disabled:bg-bg disabled:text-mute')}
              >
                {cost === null ? '최고' : `${won(cost)}원`}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-6 px-5">
        <div className="rounded-[1.25rem] bg-white p-4 shadow-card">
          <p className="text-[0.9375rem] font-extrabold">투자 전에 생각해 볼 것</p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-sub">
            손님을 놓치는 날이 많으면 설비·알바, 평판이 고민이면 인테리어·품질이 효과적이에요. 알바는 매일 인건비가 나가니 손님이 충분할 때 늘리세요.
          </p>
          <button onClick={() => nav('/lesson/l-lab-2')} className="mt-2 text-[0.8125rem] font-bold text-primary">
            직원 고용 기본 레슨 보기 →
          </button>
        </div>
      </div>
    </div>
  )
}
