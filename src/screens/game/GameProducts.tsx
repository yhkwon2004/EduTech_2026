import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useGame } from '@/game/store'
import { PRODUCT_PRESETS } from '@/game/data'
import { clampRef, costRate } from '@/game/sim'
import type { Product } from '@/game/types'
import { Stars } from '@/game/ui'
import { cx, TopBar } from '@/components/ui'
import { ProductEditor } from './ProductEditor'

type P = Omit<Product, 'id' | 'stock'> & { id?: string }

export function GameProducts() {
  const g = useGame()
  const [editing, setEditing] = useState<P | null>(null)
  if (!g.started) return <Navigate to="/game/setup" replace />

  return (
    <div className="min-h-dvh pb-10">
      <TopBar title="판매 항목" />
      <p className="px-5 text-[0.875rem] leading-relaxed text-sub">
        무엇을 팔지 자유롭게 정해요 (최대 5개). 가짓수가 많으면 손님이 조금 더 끌리지만, 준비할 것도 많아져요. 가격은 매일 장사 전에 바꿀 수 있어요.
      </p>
      <div className="mt-4 space-y-2.5 px-5">
        {g.products.map((p) => {
          const rate = costRate(p)
          return (
            <div key={p.id} className="rounded-[1.25rem] bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-bg text-[1.5rem]">{p.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[1rem] font-extrabold">{p.name}</span>
                  <span className="flex items-center gap-1.5 text-[0.75rem] font-semibold text-sub">
                    품질 <Stars value={p.quality} size={11} />
                  </span>
                </span>
                <button aria-label="수정" onClick={() => setEditing(p)} className="grid size-9 place-items-center rounded-full bg-bg">
                  <Pencil className="size-4" />
                </button>
                {g.products.length > 1 && (
                  <button aria-label="삭제" onClick={() => g.removeProduct(p.id)} className="grid size-9 place-items-center rounded-full bg-coral-50 text-coral">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[0.6875rem] font-bold text-sub">
                <div className="rounded-xl bg-bg py-2">
                  <p className="text-[0.875rem] font-extrabold text-ink">{p.cost.toLocaleString()}</p>원가
                </div>
                <div className="rounded-xl bg-bg py-2">
                  <p className="text-[0.875rem] font-extrabold text-ink">{p.price.toLocaleString()}</p>판매가
                </div>
                <div className="rounded-xl bg-bg py-2">
                  <p className="text-[0.875rem] font-extrabold text-ink">{clampRef(p).toLocaleString()}</p>동네 평균
                </div>
                <div className={cx('rounded-xl py-2', rate > 0.5 ? 'bg-coral-50 text-coral' : 'bg-teal-50 text-teal')}>
                  <p className="text-[0.875rem] font-extrabold">{Math.round(rate * 100)}%</p>원가율
                </div>
              </div>
              <p className="mt-2 text-[0.71875rem] font-semibold text-mute">
                {p.kind === 'service' ? '서비스 · 받을 때 원가' : p.perishable ? '당일 판매 · 남으면 폐기' : `보관 가능 · 재고 ${p.stock}개`}
              </p>
            </div>
          )
        })}
        {g.products.length < 5 && (
          <button
            onClick={() => setEditing({ name: '', emoji: '⭐', cost: 2000, price: 6000, ref: 6000, quality: 3, kind: g.biz === 'beauty' || g.biz === 'service' ? 'service' : 'goods', perishable: g.biz === 'food' || g.biz === 'cafe' })}
            className="flex w-full items-center justify-center gap-1.5 rounded-[1.25rem] border-2 border-dashed border-line py-4 text-[0.9375rem] font-bold text-primary"
          >
            <Plus className="size-5" /> 판매 항목 추가
          </button>
        )}
        <div className="flex flex-wrap gap-2 pt-1">
          {PRODUCT_PRESETS[g.biz]
            .filter((p) => !g.products.some((x) => x.name === p.name))
            .map((p) => (
              <button
                key={p.name}
                disabled={g.products.length >= 5}
                onClick={() => g.saveProduct(p)}
                className="rounded-full bg-white px-3 py-1.5 text-[0.8125rem] font-bold shadow-card disabled:opacity-40"
              >
                + {p.emoji} {p.name}
              </button>
            ))}
        </div>
      </div>
      {editing && (
        <ProductEditor
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(p) => {
            g.saveProduct({ ...p, id: editing.id, quality: editing.quality })
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
