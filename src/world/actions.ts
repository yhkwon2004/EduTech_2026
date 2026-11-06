import type { BizType } from '@/types'
import { useGame, canPlayToday } from '@/game/store'
import { START_CASH, UPGRADES } from '@/game/data'
import type { DayDecision, DayResult, Product } from '@/game/types'
import { skillsFromProgress } from '@/game/skills'
import { useApp } from '@/store/app'
import { todayKey } from '@/lib/date'
import { useWorld } from './store'
import { recipeUnitCost, type Recipe } from './items'
import { JOB_MAP } from './jobs'
import { COURSES } from '@/data/courses'

/** 게임(가게) 저장소의 현금을 마을 지갑과 맞춘 뒤 실행하고, 결과를 다시 지갑에 */
function withGameCash<T>(fn: () => T): T {
  const w = useWorld.getState()
  const g = useGame.getState()
  if (g.started) useGame.setState({ stats: { ...g.stats, cash: w.cash } })
  const out = fn()
  const after = useGame.getState()
  if (after.started) useWorld.getState().setCash(after.stats.cash)
  return out
}

export interface NewProduct extends Omit<Product, 'id' | 'stock'> {
  recipe: Recipe
}

export function startShop(p: { shopName: string; shopEmoji: string; color: string; biz: BizType; products: NewProduct[] }) {
  const w = useWorld.getState()
  const products = p.products.map(({ recipe, ...rest }) => ({ ...rest, cost: recipe.type === 'craft' ? recipeUnitCost(recipe, rest.cost) : rest.cost }))
  useGame.getState().start({ shopName: p.shopName, shopEmoji: p.shopEmoji, color: p.color, biz: p.biz, region: w.region, products })
  const ids = useGame.getState().products.map((x) => x.id)
  ids.forEach((id, i) => w.setRecipe(id, p.products[i].recipe))
  // 처음부터 창업한 사장님은 창업 자금으로 시작, 직장인 출신은 모은 돈으로
  if (!w.fromEmployee) w.addCash(START_CASH)
  useWorld.getState().setPath('owner')
  useGame.setState({ stats: { ...useGame.getState().stats, cash: useWorld.getState().cash } })
}

export function saveProduct(p: NewProduct & { id?: string }) {
  const { recipe, ...rest } = p
  const cost = recipe.type === 'craft' ? recipeUnitCost(recipe, rest.cost) : rest.cost
  const before = useGame.getState().products.map((x) => x.id)
  useGame.getState().saveProduct({ ...rest, cost })
  const after = useGame.getState().products
  const id = p.id ?? after.find((x) => !before.includes(x.id))?.id
  if (id) useWorld.getState().setRecipe(id, recipe)
}

export function canOpenShopToday(): boolean {
  const g = useGame.getState()
  return g.started && (canPlayToday(g) || useWorld.getState().fast)
}

export function lessonSkills() {
  return skillsFromProgress(useApp.getState().progress)
}

export function lessonsToday(): number {
  const today = todayKey()
  return useApp.getState().logs.filter((l) => l.date === today).length
}

/** 하루 영업: 공방 재고를 진열해서 팔고, 남은 건 보관/폐기 */
export function runBusinessDay(decision: DayDecision): DayResult {
  const w = useWorld.getState()
  const g = useGame.getState()
  // 진열 수량은 재고 안에서만
  const plan: Record<string, number> = {}
  for (const p of g.products) if (p.kind === 'goods') plan[p.id] = Math.max(0, Math.min(decision.plan[p.id] ?? 0, w.stock[p.id] ?? 0))
  useGame.setState({ products: g.products.map((p) => ({ ...p, stock: 0 })) })
  const result = withGameCash(() =>
    useGame.getState().play({ ...decision, plan }, { skills: lessonSkills(), buff: 0, lessonsToday: lessonsToday(), prepaid: true }),
  )
  // 재고 정리: 진열한 만큼 빼고, 보관 가능한 남은 상품은 돌려놓기
  const stock = { ...useWorld.getState().stock }
  for (const pr of result.products) {
    if (!pr.made) continue
    const left = pr.made - pr.sold - pr.wasted
    stock[pr.id] = Math.max(0, (stock[pr.id] ?? 0) - pr.made + left)
  }
  useWorld.setState({ stock })
  useGame.setState({ products: useGame.getState().products.map((p) => ({ ...p, stock: 0 })) })
  const ws = useWorld.getState()
  ws.bump('shopDays')
  ws.addExp(30 + Math.max(0, 9 - result.rank) * 5)
  return result
}

export function investUpgrade(kind: keyof typeof UPGRADES, discount: number): boolean {
  const ok = withGameCash(() => useGame.getState().buy(kind, discount))
  if (ok) {
    useWorld.getState().noteInvest()
    useWorld.getState().addExp(25)
  }
  return ok
}

export function trainProduct(productId: string, discount: number): boolean {
  const ok = withGameCash(() => useGame.getState().train(productId, discount))
  if (ok) {
    useWorld.getState().noteInvest()
    useWorld.getState().addExp(20)
  }
  return ok
}

export function answerShopReply(correct: boolean) {
  useGame.getState().answerReply(correct)
}

/** 직무 분야에서 끝낸 레슨 수 */
export function roleLessons(): number {
  const job = useWorld.getState().job
  if (!job) return 0
  const cat = JOB_MAP[job.id].category
  const progress = useApp.getState().progress
  return COURSES.filter((c) => c.category === cat).reduce((n, c) => n + c.lessons.filter((l) => progress[l.id]?.done).length, 0)
}

/** 레슨을 처음 끝냈을 때 마을 보상 */
export function onLessonComplete(first: boolean) {
  const w = useWorld.getState()
  w.bump('lessons')
  w.addExp(first ? 30 : 8)
  w.gainEnergy(first ? 5 : 2)
}
