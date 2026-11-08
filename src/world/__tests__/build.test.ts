import { beforeEach, describe, expect, it } from 'vitest'
import { useWorld } from '@/world/store'
import { BUILDS, BUILD_MAP, INITIAL_BUILT } from '@/world/map'
import { buildStatus } from '@/world/build'
import { DEFAULT_AVATAR } from '@/world/avatar'

const done = { card: 0, done: true }

describe('건물 짓기', () => {
  beforeEach(() => {
    useWorld.getState().reset()
    useWorld.getState().create({ name: '민지', avatar: { ...DEFAULT_AVATAR }, region: { sido: '서울', gu: '마포구', dong: '망원동' }, path: 'owner' })
    useWorld.getState().addCash(50000)
  })
  it('사장님은 빈손으로 시작해서 첫 퀘스트 보상으로 시장을 지어요', () => {
    useWorld.getState().setCash(0)
    expect(buildStatus('market', useWorld.getState(), { [BUILD_MAP.market!.lesson!]: done }, 0)!.missing.map((m) => m.kind)).toEqual(['cash'])
  })
  it('처음엔 게시판·배움터·나무·가게·회사만 있고 시장·공방·지원센터는 빈 터', () => {
    const b = useWorld.getState().buildings
    for (const id of INITIAL_BUILT) expect(b[id]).toBe(0)
    for (const d of BUILDS) expect(b[d.id]).toBeUndefined()
    expect(INITIAL_BUILT).toContain('board')
    expect(INITIAL_BUILT).toContain('academy')
  })
  it('레슨을 안 들으면 못 짓고, 들으면 지을 수 있어요', () => {
    const w = useWorld.getState()
    const locked = buildStatus('market', w, {}, 1000)!
    expect(locked.state).toBe('locked')
    expect(locked.missing[0].kind).toBe('lesson')
    const ready = buildStatus('market', w, { [BUILD_MAP.market!.lesson!]: done }, 1000)!
    expect(ready.state).toBe('ready')
  })
  it('짓기 → 공사 중 → 완공', () => {
    const w = useWorld.getState()
    const cash = w.cash
    expect(w.startBuild('market', 5000, 1, 1000)).toBe(true)
    expect(useWorld.getState().cash).toBe(cash - 5000)
    expect(useWorld.getState().startBuild('market', 5000, 1, 1000)).toBe(false)
    const st = buildStatus('market', useWorld.getState(), {}, 1000)!
    expect(st.state).toBe('building')
    expect(st.readyAt).toBe(1000 + 60_000)
    expect(useWorld.getState().finishBuild('market', 2000)).toBe(false)
    expect(useWorld.getState().finishBuild('market', 1000 + 60_000)).toBe(true)
    expect(useWorld.getState().buildings.market).toBe(0)
    expect(useWorld.getState().counters['built:market']).toBe(1)
    expect(buildStatus('market', useWorld.getState(), {}, 2000)!.state).toBe('done')
  })
  it('체험 모드면 10배 빨라요', () => {
    useWorld.getState().setFast(true)
    useWorld.getState().startBuild('workshop', 0, 3, 0)
    expect(useWorld.getState().buildings.workshop).toBe(18_000)
  })
})
