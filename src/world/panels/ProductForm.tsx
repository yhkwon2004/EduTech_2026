import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { BizType } from '@/types'
import { EMOJI_CHOICES } from '@/game/data'
import { ALL_ITEM_IDS, itemInfo, recipeUnitCost, type Recipe } from '../items'
import type { NewProduct } from '../actions'
import { cx, GameButton, Stepper } from '../ui/kit'

/** 판매 항목 편집 — 이름·그림·만드는 법(레시피)·가격 */
export function ProductForm({ initial, biz, onSave, onCancel }: { initial: NewProduct; biz: BizType; onSave: (p: NewProduct) => void; onCancel: () => void }) {
  const [p, setP] = useState<NewProduct>(initial)
  const r = p.recipe
  const unit = r.type === 'craft' ? recipeUnitCost(r, p.cost) : p.cost
  const rate = p.price ? unit / p.price : 1
  const setRecipe = (recipe: Recipe) => setP({ ...p, recipe, kind: recipe.type === 'service' ? 'service' : 'goods', perishable: recipe.type === 'service' ? false : p.perishable })
  const valid = p.name.trim().length > 0 && p.price > 0 && (r.type !== 'craft' || r.inputs.length > 0)

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2.5">
        <label className="block">
          <span className="text-[0.75rem] font-black text-sub">이름</span>
          <input
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
            maxLength={12}
            placeholder="예: 수제 떡볶이"
            className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 text-[0.9375rem] font-bold outline-none focus:border-primary"
          />
        </label>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {EMOJI_CHOICES.map((e) => (
            <button key={e} onClick={() => setP({ ...p, emoji: e })} className={cx('grid size-9 shrink-0 place-items-center rounded-xl text-[1.25rem]', p.emoji === e ? 'bg-primary-50 ring-2 ring-primary' : 'bg-black/5')}>
              {e}
            </button>
          ))}
        </div>
        <div>
          <span className="text-[0.75rem] font-black text-sub">어떻게 준비하나요?</span>
          <div className="mt-1 grid grid-cols-3 gap-1.5">
            {(
              [
                ['craft', '🍳 직접 만들기'],
                ['buy', '📦 도매로 사 오기'],
                ['service', '✂️ 서비스'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setRecipe(t === 'craft' ? { type: 'craft', inputs: r.type === 'craft' ? r.inputs : [{ id: 'cabbage', qty: 2 }], yield: r.type === 'craft' ? r.yield : 8, minutes: 1.5 } : { type: t })}
                className={cx('h-10 rounded-xl text-[0.75rem] font-black', r.type === t ? 'bg-ink text-white' : 'bg-black/5')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {r.type !== 'service' && (
          <label className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2">
            <span>
              <span className="block text-[0.8125rem] font-black">당일 판매</span>
              <span className="block text-[0.6875rem] text-sub">{p.perishable ? '못 팔면 그날 폐기 (음식)' : '못 팔면 재고로 남음 (공산품·꽃 등)'}</span>
            </span>
            <input type="checkbox" checked={p.perishable} onChange={(e) => setP({ ...p, perishable: e.target.checked })} className="size-5 accent-primary" />
          </label>
        )}
      </div>

      <div className="space-y-2.5">
        {r.type === 'craft' ? (
          <div className="rounded-2xl bg-orange-50 p-2.5">
            <p className="text-[0.75rem] font-black text-orange">재료 (한 번에 {r.yield}개 만들기)</p>
            <div className="mt-1.5 space-y-1.5">
              {r.inputs.map((inp, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <select
                    value={inp.id}
                    onChange={(e) => setRecipe({ ...r, inputs: r.inputs.map((x, k) => (k === i ? { ...x, id: e.target.value } : x)) })}
                    className="h-8 flex-1 rounded-lg bg-white px-2 text-[0.8125rem] font-bold"
                  >
                    {ALL_ITEM_IDS.map((id) => (
                      <option key={id} value={id}>
                        {itemInfo(id).emoji} {itemInfo(id).name} ({itemInfo(id).price.toLocaleString()}원)
                      </option>
                    ))}
                  </select>
                  <Stepper value={inp.qty} min={1} max={20} onChange={(v) => setRecipe({ ...r, inputs: r.inputs.map((x, k) => (k === i ? { ...x, qty: v } : x)) })} />
                  {r.inputs.length > 1 && (
                    <button aria-label="재료 빼기" onClick={() => setRecipe({ ...r, inputs: r.inputs.filter((_, k) => k !== i) })} className="text-coral">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              ))}
              {r.inputs.length < 4 && (
                <button onClick={() => setRecipe({ ...r, inputs: [...r.inputs, { id: 'sauce', qty: 1 }] })} className="flex items-center gap-1 text-[0.75rem] font-black text-primary">
                  <Plus className="size-3.5" /> 재료 추가
                </button>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[0.75rem] font-black">한 번에 만드는 개수</span>
                <Stepper value={r.yield} min={1} max={40} onChange={(v) => setRecipe({ ...r, yield: v })} />
              </div>
            </div>
          </div>
        ) : (
          <label className="block">
            <span className="text-[0.75rem] font-black text-sub">{r.type === 'buy' ? '도매가 (1개)' : '1회 재료비 (소모품)'}</span>
            <input type="number" value={p.cost || ''} onChange={(e) => setP({ ...p, cost: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 font-black outline-none" />
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-[0.75rem] font-black text-sub">판매가</span>
            <input type="number" value={p.price || ''} onChange={(e) => setP({ ...p, price: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 font-black outline-none" />
          </label>
          <label className="block">
            <span className="text-[0.75rem] font-black text-sub">동네 평균 가격</span>
            <input type="number" value={p.ref || ''} onChange={(e) => setP({ ...p, ref: Math.max(0, Number(e.target.value) || 0) })} className="mt-1 h-10 w-full rounded-xl border-2 border-black/10 bg-white px-3 font-black outline-none" />
          </label>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className={cx('rounded-xl py-1.5', rate > 0.5 ? 'bg-coral-50 text-coral' : 'bg-teal-50 text-teal')}>
            <p className="text-[0.9375rem] font-black">{Math.round(rate * 100)}%</p>
            <p className="text-[0.625rem] font-bold">원가율</p>
          </div>
          <div className="rounded-xl bg-black/5 py-1.5">
            <p className="text-[0.9375rem] font-black">{unit.toLocaleString()}</p>
            <p className="text-[0.625rem] font-bold text-sub">1개 원가</p>
          </div>
          <div className="rounded-xl bg-black/5 py-1.5">
            <p className="text-[0.9375rem] font-black">{(p.price - unit).toLocaleString()}</p>
            <p className="text-[0.625rem] font-bold text-sub">1개 남는 돈</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <GameButton tone="white" onClick={onCancel}>
            취소
          </GameButton>
          <GameButton tone="green" disabled={!valid} onClick={() => onSave({ ...p, name: p.name.trim(), ref: p.ref || p.price, cost: unit })}>
            저장
          </GameButton>
        </div>
        {biz && <p className="text-[0.625rem] font-semibold text-mute">원가율 30% 안팎이면 적당해요. 동네 평균보다 너무 비싸면 손님이 줄어요.</p>}
      </div>
    </div>
  )
}
