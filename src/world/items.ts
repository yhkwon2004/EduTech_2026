import type { BizType } from '@/types'
import { hash, rng } from '@/lib/rng'

export type ItemKind = 'crop' | 'ingredient'

export interface CropDef {
  id: string
  name: string
  emoji: string
  /** 씨앗 값 (1번 심기) */
  seed: number
  /** 자라는 시간 (분, 실제 시간) */
  minutes: number
  /** 한 번 수확량 */
  yield: number
  /** 도매시장 기준가 (살 때) */
  price: number
  /** 논에서만 자람 */
  paddy?: boolean
  /** 이 레벨부터 씨앗 판매 */
  level: number
  color: string
}

export const CROPS: CropDef[] = [
  { id: 'cabbage', name: '배추', emoji: '🥬', seed: 900, minutes: 3, yield: 3, price: 800, level: 1, color: '#6CC24A' },
  { id: 'pepper', name: '고추', emoji: '🌶️', seed: 800, minutes: 4, yield: 4, price: 700, level: 1, color: '#E8412C' },
  { id: 'rice', name: '쌀(벼)', emoji: '🌾', seed: 800, minutes: 5, yield: 4, price: 900, paddy: true, level: 1, color: '#E9C46A' },
  { id: 'potato', name: '감자', emoji: '🥔', seed: 700, minutes: 3, yield: 3, price: 600, level: 2, color: '#C8955A' },
  { id: 'wheat', name: '밀', emoji: '🌿', seed: 700, minutes: 4, yield: 4, price: 600, level: 2, color: '#E2B84F' },
  { id: 'tomato', name: '토마토', emoji: '🍅', seed: 1100, minutes: 5, yield: 4, price: 900, level: 3, color: '#F2542D' },
  { id: 'coffee', name: '커피콩', emoji: '🫘', seed: 1500, minutes: 7, yield: 5, price: 1200, level: 3, color: '#8B4A2B' },
  { id: 'strawberry', name: '딸기', emoji: '🍓', seed: 1800, minutes: 6, yield: 4, price: 1500, level: 4, color: '#E63946' },
  { id: 'flower', name: '꽃', emoji: '🌷', seed: 1500, minutes: 6, yield: 3, price: 1500, level: 4, color: '#F28AC0' },
]
export const CROP_MAP = Object.fromEntries(CROPS.map((c) => [c.id, c])) as Record<string, CropDef>

export interface IngredientDef {
  id: string
  name: string
  emoji: string
  price: number
}

/** 기르지 못하고 시장에서 사야 하는 재료 */
export const INGREDIENTS: IngredientDef[] = [
  { id: 'meat', name: '고기', emoji: '🥩', price: 5000 },
  { id: 'egg', name: '계란', emoji: '🥚', price: 600 },
  { id: 'milk', name: '우유', emoji: '🥛', price: 1500 },
  { id: 'butter', name: '버터', emoji: '🧈', price: 2500 },
  { id: 'sugar', name: '설탕', emoji: '🍬', price: 800 },
  { id: 'seaweed', name: '김', emoji: '🟩', price: 700 },
  { id: 'sauce', name: '양념', emoji: '🥫', price: 900 },
  { id: 'cup', name: '포장 용기', emoji: '🥤', price: 1000 },
  { id: 'ribbon', name: '포장지', emoji: '🎀', price: 600 },
]
export const INGREDIENT_MAP = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i])) as Record<string, IngredientDef>

/** 인벤토리에 들어가는 모든 재료 (작물 + 재료) */
export function itemInfo(id: string): { name: string; emoji: string; price: number } {
  const c = CROP_MAP[id]
  if (c) return { name: c.name, emoji: c.emoji, price: c.price }
  const g = INGREDIENT_MAP[id]
  if (g) return g
  return { name: id, emoji: '📦', price: 0 }
}

export const ALL_ITEM_IDS = [...CROPS.map((c) => c.id), ...INGREDIENTS.map((i) => i.id)]

/** 상품 만드는 법 — 'craft': 재료로 공방에서 / 'buy': 도매로 사 오기 / 'service': 받을 때 원가 */
export type Recipe =
  | { type: 'craft'; inputs: { id: string; qty: number }[]; yield: number; minutes: number }
  | { type: 'buy' }
  | { type: 'service' }

/** 기본 판매 항목의 레시피 (이름으로 연결) */
export const PRESET_RECIPES: Record<string, Recipe> = {
  김치찌개: { type: 'craft', inputs: [{ id: 'cabbage', qty: 4 }, { id: 'meat', qty: 4 }, { id: 'sauce', qty: 2 }], yield: 10, minutes: 2 },
  제육볶음: { type: 'craft', inputs: [{ id: 'meat', qty: 5 }, { id: 'pepper', qty: 3 }, { id: 'sauce', qty: 2 }], yield: 10, minutes: 2 },
  김밥: { type: 'craft', inputs: [{ id: 'rice', qty: 4 }, { id: 'seaweed', qty: 3 }, { id: 'egg', qty: 4 }, { id: 'cabbage', qty: 2 }], yield: 12, minutes: 1.5 },
  떡볶이: { type: 'craft', inputs: [{ id: 'rice', qty: 5 }, { id: 'pepper', qty: 4 }, { id: 'sauce', qty: 3 }], yield: 12, minutes: 1.5 },
  아메리카노: { type: 'craft', inputs: [{ id: 'coffee', qty: 4 }, { id: 'cup', qty: 5 }], yield: 20, minutes: 1 },
  카페라떼: { type: 'craft', inputs: [{ id: 'coffee', qty: 3 }, { id: 'milk', qty: 4 }, { id: 'cup', qty: 4 }], yield: 15, minutes: 1 },
  크로플: { type: 'craft', inputs: [{ id: 'wheat', qty: 3 }, { id: 'butter', qty: 2 }, { id: 'sugar', qty: 2 }], yield: 10, minutes: 1.5 },
  쿠키: { type: 'craft', inputs: [{ id: 'wheat', qty: 3 }, { id: 'butter', qty: 2 }, { id: 'sugar', qty: 2 }, { id: 'egg', qty: 2 }], yield: 20, minutes: 1.5 },
  도시락: { type: 'craft', inputs: [{ id: 'rice', qty: 4 }, { id: 'meat', qty: 1 }, { id: 'cabbage', qty: 2 }, { id: 'cup', qty: 4 }], yield: 8, minutes: 2 },
  꽃다발: { type: 'craft', inputs: [{ id: 'flower', qty: 3 }, { id: 'ribbon', qty: 2 }], yield: 4, minutes: 1.5 },
  딸기케이크: { type: 'craft', inputs: [{ id: 'strawberry', qty: 3 }, { id: 'wheat', qty: 2 }, { id: 'milk', qty: 2 }, { id: 'sugar', qty: 2 }], yield: 6, minutes: 2.5 },
  감자전: { type: 'craft', inputs: [{ id: 'potato', qty: 4 }, { id: 'egg', qty: 2 }], yield: 8, minutes: 1.5 },
  토마토주스: { type: 'craft', inputs: [{ id: 'tomato', qty: 4 }, { id: 'cup', qty: 4 }], yield: 8, minutes: 1 },
  생수: { type: 'buy' },
  과자: { type: 'buy' },
  컵라면: { type: 'buy' },
  커트: { type: 'service' },
  염색: { type: 'service' },
  펌: { type: 'service' },
  세탁: { type: 'service' },
  '옷 수선': { type: 'service' },
  '신발 수선': { type: 'service' },
}

export function defaultRecipe(name: string, biz: BizType): Recipe {
  return PRESET_RECIPES[name] ?? (biz === 'beauty' || biz === 'service' ? { type: 'service' } : { type: 'craft', inputs: [{ id: 'cabbage', qty: 2 }], yield: 6, minutes: 1.5 })
}

/** 재료 기준가로 계산한 1개 원가 */
export function recipeUnitCost(r: Recipe, fallback: number): number {
  if (r.type !== 'craft') return fallback
  const total = r.inputs.reduce((s, i) => s + itemInfo(i.id).price * i.qty, 0)
  return Math.max(10, Math.round(total / Math.max(1, r.yield) / 10) * 10)
}

/** 오늘의 시세 (날짜마다 바뀜): 0.8 ~ 1.25배 */
export function priceFactor(date: string, id: string): number {
  const r = rng(hash(`price:${date}:${id}`))()
  return Math.round((0.8 + r * 0.45) * 100) / 100
}

export function buyPrice(date: string, id: string): number {
  return Math.round((itemInfo(id).price * priceFactor(date, id)) / 10) * 10
}

/** 시장에 팔 때는 기준가의 60% (오늘 시세 반영) */
export function sellPrice(date: string, id: string): number {
  return Math.round((itemInfo(id).price * 0.6 * priceFactor(date, id)) / 10) * 10
}

export function seedPrice(date: string, cropId: string): number {
  const c = CROP_MAP[cropId]
  return Math.round((c.seed * (0.9 + (priceFactor(date, `seed-${cropId}`) - 0.8) * 0.4)) / 10) * 10
}
