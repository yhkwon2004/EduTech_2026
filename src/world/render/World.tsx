import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactElement } from 'react'
import { BUILDINGS, BUILDING_MAP, DECOS, PLOTS, RIVAL_LOTS, RIVAL_PLACEHOLDER, WORLD_BOUNDS, findPath, iso, screenToTile, walkable, type BuildingId, type HitId } from '../map'
import { useWorld, levelOf } from '../store'
import { useGame, canPlayToday } from '@/game/store'
import { useScreen } from '../screen'
import { GroundLayer } from './Ground'
import { AcademyArt, BoardArt, CompanyArt, MarketArt, RivalArt, ShopArt, SupportArt, WorkshopArt } from './Buildings'
import { Crop, Deco, LockedPlot, PlotHit } from './Props'
import { CharacterNode, type Act, type Expr, type Look } from './Character'
import { VILLAGERS, toLook } from '../avatar'
import { useEmote, ACT_MS } from '../emote'
import { energyNow } from '../store'
import { WorldDefs } from './Defs'
import { LearnTreeArt } from './Tree'
import { useApp } from '@/store/app'
import { npcQuizLeft, treeStage } from '../learn'
import { hash, rng } from '@/lib/rng'
import { todayKey } from '@/lib/date'

export interface WorldHandle {
  walkTo: (hit: HitId) => void
  recenter: () => void
  zoom: (d: number) => void
  /** 영업 연출: 손님들이 내 가게로 */
  rush: (n: number) => void
}

interface Walker {
  x: number
  y: number
  path: { x: number; y: number }[]
  walking: boolean
  /** 바라보는 각도(도): 0 = 정면, +90 = 화면 오른쪽, 180 = 뒷모습 */
  yaw: number
  target: number
  act: Act | null
  actUntil: number
  expr: Expr | null
  bubble: string | null
  bubbleUntil: number
  nextIdle: number
  idleSince: number
  pauseUntil: number
}

interface CharView {
  x: number
  y: number
  walking: boolean
  yaw: number
  act: Act | null
  expr: Expr | null
  bubble: string | null
  hidden: boolean
}

const normDeg = (d: number) => {
  let v = ((((d + 180) % 360) + 360) % 360) - 180
  if (v === -180) v = 180
  return v
}
const quantYaw = (d: number) => normDeg(Math.round(normDeg(d) / 22.5) * 22.5)
const sameView = (a: CharView | undefined, b: CharView) =>
  !!a && a.x === b.x && a.y === b.y && a.walking === b.walking && a.yaw === b.yaw && a.act === b.act && a.expr === b.expr && a.bubble === b.bubble && a.hidden === b.hidden

function newWalker(x: number, y: number, yaw = 20): Walker {
  return { x, y, path: [], walking: false, yaw, target: yaw, act: null, actUntil: 0, expr: null, bubble: null, bubbleUntil: 0, nextIdle: performance.now() + 4000 + Math.random() * 4000, idleSince: performance.now(), pauseUntil: 0 }
}
function viewOf(w: Walker, hidden = false): CharView {
  return { x: Math.round(w.x), y: Math.round(w.y), walking: w.walking, yaw: quantYaw(w.yaw), act: w.act, expr: w.expr, bubble: w.bubble, hidden }
}
function startAct(w: Walker, act: Act, t: number, expr: Expr | null = null) {
  w.act = act
  w.actUntil = t + ACT_MS[act]
  w.expr = expr
}

const SPEED = 3.6 // 타일/초
const NPC_COUNT = 7

function doorOf(hit: HitId): { x: number; y: number } | null {
  if (hit.startsWith('rival:')) {
    const lot = RIVAL_LOTS[Number(hit.split(':')[1])]
    return lot?.door ?? null
  }
  if (hit.startsWith('plot:')) {
    const p = PLOTS.find((q) => q.id === hit.slice(5))
    if (!p) return null
    const near = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ]
      .map(([dx, dy]) => ({ x: p.x + dx, y: p.y + dy }))
      .find((t) => walkable(t.x, t.y))
    return near ?? null
  }
  return BUILDING_MAP[hit as BuildingId]?.door ?? null
}

/** 화면 좌표로 바꾼 캐릭터 발 위치 */
function footOf(w: { x: number; y: number }) {
  return iso(w.x + 0.5, w.y + 0.5)
}

export const World = forwardRef<WorldHandle, { onArrive: (hit: HitId) => void; target?: BuildingId | 'farm' | null; paused?: boolean }>(function World({ onArrive, target, paused }, ref) {
  const screen = useScreen()
  const world = useWorld()
  const game = useGame()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const role = world.path === 'employee' ? 'employee' : 'owner'
  const look: Look = useMemo(() => toLook(world.avatar, role), [world.avatar, role])
  const level = levelOf(world.exp).level
  const doneLessons = useApp((s) => Object.values(s.progress).filter((p) => p.done).length)
  const hour = new Date(now).getHours()
  const night = hour >= 19 || hour < 6

  // ── 이동 상태 (ref로 관리)
  const player = useRef<Walker>(newWalker(world.pos.x, world.pos.y))
  const pending = useRef<HitId | null>(null)
  const [pView, setPView] = useState<CharView>(() => viewOf(player.current))
  const pViewRef = useRef(pView)
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive
  const playerEl = useRef<SVGGElement>(null)
  const camEl = useRef<SVGGElement>(null)
  const cam = useRef({ x: footOf(world.pos).x, y: footOf(world.pos).y - 40, zoom: 1, follow: true })
  const [zoomLevel, setZoomLevel] = useState(1)
  const pushPlayer = useCallback(() => {
    const v = viewOf(player.current)
    if (!sameView(pViewRef.current, v)) {
      pViewRef.current = v
      setPView(v)
    }
  }, [])

  // ── 마을 사람들 (NPC)
  type Npc = Walker & { hidden: number; goal: { x: number; y: number }; rush?: boolean; greetAt: number; vi: number; quiz?: boolean }
  const npcs = useRef<Npc[]>([])
  const npcEls = useRef<(SVGGElement | null)[]>([])
  const [npcViews, setNpcViews] = useState<CharView[]>([])
  const [quizNpc, setQuizNpc] = useState<number | null>(null)
  const nextQuizAt = useRef(performance.now() + 14000)
  const npcViewsRef = useRef(npcViews)
  const doors = useMemo(() => [...RIVAL_LOTS.map((r) => r.door), BUILDING_MAP.shop.door, BUILDING_MAP.market.door, BUILDING_MAP.academy.door], [])
  useEffect(() => {
    const r = rng(hash('npcs'))
    npcs.current = Array.from({ length: NPC_COUNT }, (_, i) => {
      const start = doors[Math.floor(r() * doors.length)]
      const goal = doors[Math.floor(r() * doors.length)]
      const w = newWalker(start.x, start.y)
      return { ...w, path: findPath(start, goal), walking: true, hidden: 0, goal, greetAt: 0, vi: i % VILLAGERS.length, nextIdle: performance.now() + 3000 + r() * 9000 }
    })
    npcViewsRef.current = npcs.current.map((n) => viewOf(n))
    setNpcViews(npcViewsRef.current)
  }, [doors])

  // 패널에서 보낸 동작 (수확 → 환호 등)
  useEffect(
    () =>
      useEmote.subscribe((st, prev) => {
        if (st.seq === prev.seq || !st.act) return
        const p = player.current
        const t = performance.now()
        startAct(p, st.act, t, st.act === 'cheer' || st.act === 'wave' ? 'happy' : st.act === 'work' ? null : null)
        if (!p.walking) p.target = p.yaw >= 0 ? 18 : -18
        if (st.bubble) {
          p.bubble = st.bubble
          p.bubbleUntil = t + 2200
        }
        p.nextIdle = t + 7000
        pushPlayer()
        // 패널이 열려 있어 루프가 멈춰 있어도 끝나면 풀리게
        window.setTimeout(() => {
          const q = player.current
          const t2 = performance.now()
          if (q.act && t2 >= q.actUntil) {
            q.act = null
            q.expr = null
          }
          if (q.bubble && t2 >= q.bubbleUntil) q.bubble = null
          pushPlayer()
        }, Math.max(ACT_MS[st.act], 2300) + 50)
      }),
    [pushPlayer],
  )

  // ── 화면 크기에 맞춘 기본 확대
  const baseZoom = Math.max(0.62, Math.min(1.35, screen.height / 400))

  const applyCamera = useCallback(() => {
    const c = cam.current
    const z = baseZoom * c.zoom
    // 지도 밖으로 너무 나가지 않게
    const halfW = screen.width / 2 / z
    const halfH = screen.height / 2 / z
    c.x = Math.min(WORLD_BOUNDS.right - halfW * 0.4, Math.max(WORLD_BOUNDS.left + halfW * 0.4, c.x))
    c.y = Math.min(WORLD_BOUNDS.bottom - halfH * 0.3, Math.max(WORLD_BOUNDS.top + halfH * 0.3, c.y))
    camEl.current?.setAttribute('transform', `translate(${screen.width / 2 - c.x * z},${screen.height / 2 - c.y * z}) scale(${z})`)
  }, [screen.width, screen.height, baseZoom])

  // ── 매 프레임: 이동 + 몸 돌리기 + 동작 + 카메라
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let energyCheck = 0
    let tired = false
    const step = (w: Walker, dt: number) => {
      if (!w.path.length) {
        w.walking = false
        return false
      }
      const next = w.path[0]
      const dx = next.x - w.x
      const dy = next.y - w.y
      const dist = Math.hypot(dx, dy)
      const mv = SPEED * dt
      // 땅 위 방향 → 카메라 기준 각도 (화면 오른쪽 = x−y, 카메라 쪽 = x+y)
      if (dist > 0.001) w.target = (Math.atan2(dx - dy, dx + dy) * 180) / Math.PI
      if (dist <= mv) {
        w.x = next.x
        w.y = next.y
        w.path.shift()
      } else {
        w.x += (dx / dist) * mv
        w.y += (dy / dist) * mv
      }
      w.walking = true
      return true
    }
    const turn = (w: Walker, dt: number, rate = 760) => {
      const diff = normDeg(w.target - w.yaw)
      const st = rate * dt
      w.yaw = Math.abs(diff) <= st ? w.target : normDeg(w.yaw + Math.sign(diff) * st)
    }
    const expire = (w: Walker, t: number) => {
      if (w.act && t >= w.actUntil) {
        if (w.act === 'look') w.target = w.yaw >= 0 ? 20 : -20
        w.act = null
        w.expr = null
      }
      if (w.bubble && t >= w.bubbleUntil) w.bubble = null
    }
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const p = player.current
      if (t > energyCheck) {
        energyCheck = t + 1000
        const ws = useWorld.getState()
        tired = energyNow(ws).energy <= 3
      }
      if (!paused) {
        const wasWalking = p.walking
        const moving = step(p, dt)
        if (moving) {
          p.idleSince = t
          if (p.act && p.act !== 'cheer') p.act = null
        }
        turn(p, dt)
        const f = footOf(p)
        playerEl.current?.setAttribute('transform', `translate(${f.x},${f.y})`)
        expire(p, t)
        // 가만히 있으면: 카메라 쪽으로 몸을 돌리고, 가끔 두리번·기지개·하품
        if (!p.walking) {
          if (t - p.idleSince > 1300 && !p.act && Math.abs(p.target) > 60) p.target = p.target >= 0 ? 22 : -22
          if (!p.act && t > p.nextIdle) {
            const roll = Math.random()
            if (tired) startAct(p, 'yawn', t, 'yawn')
            else if (roll < 0.4) {
              startAct(p, 'look', t)
              p.target = (p.yaw >= 0 ? 1 : -1) * (roll < 0.2 ? 75 : -35)
            } else if (roll < 0.62) startAct(p, 'stretch', t, roll < 0.5 ? 'yawn' : null)
            else if (roll < 0.8) startAct(p, 'nod', t, 'happy')
            else startAct(p, 'hop', t, 'happy')
            p.nextIdle = t + 6000 + Math.random() * 7000
          }
        }
        if (!p.act && tired && !p.walking) p.expr = 'tired'
        else if (!p.act && p.expr === 'tired') p.expr = null
        pushPlayer()
        if (wasWalking && !p.walking) {
          useWorld.getState().setPos({ x: Math.round(p.x), y: Math.round(p.y) })
          if (pending.current) {
            const hit = pending.current
            pending.current = null
            if (hit.startsWith('npc:')) {
              const n = npcs.current[Number(hit.slice(4))]
              if (n) {
                n.quiz = false
                n.pauseUntil = t + 1200
                n.target = (Math.atan2(p.x - n.x - (p.y - n.y), p.x - n.x + (p.y - n.y)) * 180) / Math.PI
                p.target = (Math.atan2(n.x - p.x - (n.y - p.y), n.x - p.x + (n.y - p.y)) * 180) / Math.PI
                setQuizNpc(null)
                onArriveRef.current(`npc:${n.vi}`)
              }
            } else onArriveRef.current(hit)
          }
        }
        // 마을 사람들
        let changed = false
        const views = npcViewsRef.current.length === npcs.current.length ? [...npcViewsRef.current] : npcs.current.map((n) => viewOf(n))
        npcs.current.forEach((n, i) => {
          const vill = VILLAGERS[n.vi]
          if (n.hidden > 0) {
            n.hidden -= dt
            if (n.hidden <= 0) {
              const goal = n.rush ? BUILDING_MAP.shop.door : doors[Math.floor(Math.random() * doors.length)]
              n.goal = goal
              n.path = findPath({ x: Math.round(n.x), y: Math.round(n.y) }, goal)
              if (n.rush) {
                n.bubble = Math.random() < 0.5 ? '🛒' : '😋'
                n.bubbleUntil = t + 2600
              }
              n.rush = false
            }
          } else if (t < n.pauseUntil) {
            n.walking = false
          } else if (!step(n, dt * 0.55)) {
            n.hidden = 1.5 + Math.random() * 4
          }
          turn(n, dt, 600)
          expire(n, t)
          // 내 캐릭터 가까이 오면 인사
          const near = Math.hypot(n.x - p.x, n.y - p.y) < 2.3
          if (n.hidden <= 0 && near && t > n.greetAt && !n.quiz) {
            n.greetAt = t + 30000
            n.pauseUntil = t + 1800
            n.target = (Math.atan2(p.x - n.x - (p.y - n.y), p.x - n.x + (p.y - n.y)) * 180) / Math.PI
            startAct(n, 'wave', t, 'happy')
            n.bubble = '👋'
            n.bubbleUntil = t + 1800
          } else if (n.hidden <= 0 && n.walking && t > n.nextIdle && !n.quiz) {
            // 가다가 멈춰서 혼잣말·두리번
            n.nextIdle = t + 9000 + Math.random() * 12000
            n.pauseUntil = t + 2200
            const line = vill.lines[Math.floor(Math.random() * vill.lines.length)]
            n.bubble = line
            n.bubbleUntil = t + 2200
            n.expr = 'talk'
            n.act = null
            n.actUntil = t + 2200
            n.target = n.yaw >= 0 ? 25 : -25
          }
          if (n.expr === 'talk' && t >= n.actUntil) n.expr = null
          const el = npcEls.current[i]
          if (el) {
            const nf = footOf(n)
            el.setAttribute('transform', `translate(${nf.x},${nf.y})`)
            el.style.opacity = n.hidden > 0 ? '0' : '1'
          }
          const v = viewOf(n, n.hidden > 0)
          if (!sameView(views[i], v)) {
            views[i] = v
            changed = true
          }
        })
        if (changed) {
          npcViewsRef.current = views
          setNpcViews(views)
        }
        // 가끔 동네 사람이 ❓ 퀴즈를 들고 멈춰 서요
        const asking = npcs.current.findIndex((n) => n.quiz)
        if (asking >= 0) {
          const n = npcs.current[asking]
          if (t > n.pauseUntil || n.hidden > 0) {
            n.quiz = false
            n.bubble = null
            setQuizNpc(null)
          }
        } else if (t > nextQuizAt.current) {
          nextQuizAt.current = t + 40000 + Math.random() * 35000
          const left = npcQuizLeft(useApp.getState().npcQuiz, todayKey())
          const cands = npcs.current.map((n, i) => ({ n, i })).filter(({ n }) => n.hidden <= 0 && !n.rush && Math.hypot(n.x - p.x, n.y - p.y) < 11)
          if (left > 0 && cands.length) {
            const { n, i } = cands[Math.floor(Math.random() * cands.length)]
            n.quiz = true
            n.pauseUntil = t + 45000
            n.walking = false
            n.bubble = null
            n.target = n.yaw >= 0 ? 25 : -25
            startAct(n, 'wave', t, 'happy')
            setQuizNpc(i)
          }
        }
        // 카메라 따라가기
        const c = cam.current
        if (c.follow) {
          c.x += (f.x - c.x) * 0.1
          c.y += (f.y - 30 - c.y) * 0.1
        }
      } else {
        expire(p, t)
        pushPlayer()
      }
      applyCamera()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [applyCamera, doors, paused, pushPlayer])

  /** 걸어갈 칸: NPC는 지금 서 있는 곳 옆 */
  const targetOf = useCallback((hit: HitId) => {
    if (hit.startsWith('npc:')) {
      const n = npcs.current[Number(hit.slice(4))]
      if (!n) return null
      const nx = Math.round(n.x)
      const ny = Math.round(n.y)
      const p = player.current
      const near = [
        [0, 1],
        [1, 0],
        [-1, 0],
        [0, -1],
        [1, 1],
        [-1, 1],
      ]
        .map(([dx, dy]) => ({ x: nx + dx, y: ny + dy }))
        .filter((c) => walkable(c.x, c.y))
        .sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))
      return near[0] ?? { x: nx, y: ny }
    }
    return doorOf(hit)
  }, [])

  const walkToTile = useCallback((tile: { x: number; y: number }, hit: HitId | null) => {
    const p = player.current
    const from = { x: Math.round(p.x), y: Math.round(p.y) }
    const path = findPath(from, tile)
    pending.current = hit
    cam.current.follow = true
    if (!path.length) {
      // 이미 도착
      if (hit && Math.abs(from.x - tile.x) + Math.abs(from.y - tile.y) <= 1) {
        pending.current = null
        onArriveRef.current(hit)
      }
      return
    }
    p.path = path
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      walkTo: (hit) => {
        const d = targetOf(hit)
        if (d) walkToTile(d, hit)
      },
      recenter: () => {
        cam.current.follow = true
      },
      zoom: (d) => {
        cam.current.zoom = Math.max(0.7, Math.min(1.8, cam.current.zoom + d))
        setZoomLevel(cam.current.zoom)
      },
      rush: (n) => {
        npcs.current.slice(0, n).forEach((npc) => {
          npc.rush = true
          npc.hidden = 0
          npc.pauseUntil = 0
          npc.path = findPath({ x: Math.round(npc.x), y: Math.round(npc.y) }, BUILDING_MAP.shop.door)
          npc.bubble = Math.random() < 0.5 ? '🛒' : '😋'
          npc.bubbleUntil = performance.now() + 2600
        })
      },
    }),
    [walkToTile, targetOf],
  )

  // ── 입력: 드래그 = 카메라 이동, 탭 = 걷기/상호작용
  const drag = useRef<{ id: number; sx: number; sy: number; lx: number; ly: number; moved: boolean } | null>(null)
  const [ripple, setRipple] = useState<{ x: number; y: number; k: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    const l = screen.toLocal(e.clientX, e.clientY)
    drag.current = { id: e.pointerId, sx: l.x, sy: l.y, lx: l.x, ly: l.y, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    const l = screen.toLocal(e.clientX, e.clientY)
    if (!d.moved && Math.hypot(l.x - d.sx, l.y - d.sy) > 8) d.moved = true
    if (d.moved) {
      const z = baseZoom * cam.current.zoom
      cam.current.follow = false
      cam.current.x -= (l.x - d.lx) / z
      cam.current.y -= (l.y - d.ly) / z
    }
    d.lx = l.x
    d.ly = l.y
  }
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved || paused) return
    const el = document.elementFromPoint(e.clientX, e.clientY) as Element | null
    const hitEl = el?.closest('[data-hit]')
    if (hitEl) {
      const hit = hitEl.getAttribute('data-hit') as HitId
      const door = targetOf(hit)
      if (door) walkToTile(door, hit)
      return
    }
    // 땅 탭 → 그 칸으로
    const l = screen.toLocal(e.clientX, e.clientY)
    const z = baseZoom * cam.current.zoom
    const wx = (l.x - (screen.width / 2 - cam.current.x * z)) / z
    const wy = (l.y - (screen.height / 2 - cam.current.y * z)) / z
    const t = screenToTile(wx, wy)
    setRipple({ x: wx, y: wy, k: Date.now() })
    walkToTile(t, null)
  }

  // ── 그릴 것들 (깊이 순 정렬)
  const crafting = world.crafting
  const craftReady = crafting.some((c) => c.readyAt <= now)
  const shopReady = game.started && (canPlayToday(game) || world.fast)
  const today = todayKey()
  const workReady = !!world.job && (world.job.lastWork !== today || world.fast)
  const items: { depth: number; el: ReactElement }[] = []

  for (const b of BUILDINGS) {
    let art: ReactElement
    switch (b.id) {
      case 'shop':
        art = game.started ? (
          <ShopArt name={game.shopName} color={game.color} emoji={game.shopEmoji} equipment={game.stats.equipment} interior={game.stats.interior} open={!shopReady} />
        ) : (
          <ShopArt name="빈 가게 (임대)" color="#9AA4B0" emoji="🔑" equipment={0} interior={0} open={false} />
        )
        break
      case 'workshop':
        art = <WorkshopArt busy={crafting.length > 0} />
        break
      case 'market':
        art = <MarketArt />
        break
      case 'academy':
        art = <AcademyArt />
        break
      case 'support':
        art = <SupportArt />
        break
      case 'company':
        art = <CompanyArt working={!!world.job} />
        break
      case 'board':
        art = <BoardArt />
        break
      case 'tree':
        art = <LearnTreeArt x={b.x} y={b.y} stage={treeStage(doneLessons).index} night={night} />
        break
    }
    items.push({
      depth: b.x + b.w - 1 + b.y + b.d - 1 + 0.4,
      el: (
        <g key={b.id} data-hit={b.id} className="hit-building">
          {art}
        </g>
      ),
    })
  }
  RIVAL_LOTS.forEach((lot) => {
    const rv = game.rivals[lot.index]
    items.push({
      depth: lot.x + 1 + lot.y + 1 + 0.4,
      el: (
        <g key={`rv${lot.index}`} data-hit={`rival:${lot.index}`} className="hit-building">
          <RivalArt index={lot.index} lot={lot} name={rv?.name ?? RIVAL_PLACEHOLDER[lot.index].name} emoji={rv?.emoji ?? RIVAL_PLACEHOLDER[lot.index].emoji} />
        </g>
      ),
    })
  })
  for (const d of DECOS) items.push({ depth: d.x + d.y + (d.kind === 'flowers' || d.kind === 'lily' ? -0.4 : 0.1), el: <Deco key={`${d.kind}${d.x},${d.y}`} d={d} night={night} /> })
  for (const p of PLOTS) {
    const st = world.plots[p.id]
    const locked = level < p.level
    let stage = 0
    if (st?.crop && st.readyAt && st.plantedAt) {
      const prog = (now - st.plantedAt) / (st.readyAt - st.plantedAt)
      stage = now >= st.readyAt ? 3 : prog > 0.66 ? 2 : prog > 0.33 ? 1 : 0
    }
    items.push({
      depth: p.x + p.y - 0.2,
      el: (
        <g key={`plot${p.id}`}>
          {locked ? <LockedPlot x={p.x} y={p.y} level={p.level} /> : <Crop x={p.x} y={p.y} cropId={st?.crop} stage={stage} paddy={p.kind === 'paddy'} watered={st?.watered} />}
          <PlotHit x={p.x} y={p.y} id={p.id} />
        </g>
      ),
    })
  }
  items.push({
    depth: pView.x + pView.y + 0.5,
    el: <CharacterNode key="player" ref={playerEl} look={look} walking={pView.walking} yaw={pView.yaw} act={pView.act} expr={pView.expr} bubble={pView.bubble} name={world.name || '나'} me speed={0.42} />,
  })
  npcs.current.forEach((n, i) => {
    const t = npcViews[i]
    if (!t) return
    const vill = VILLAGERS[n.vi]
    items.push({
      depth: t.x + t.y + 0.45,
      el: (
        <CharacterNode
          key={`npc${i}`}
          ref={(el) => void (npcEls.current[i] = el)}
          look={vill.look}
          walking={t.walking}
          yaw={t.yaw}
          act={t.act}
          expr={t.expr}
          bubble={t.hidden ? null : t.bubble}
          scale={vill.scale}
          seed={i + 3}
          speed={0.72}
          quiz={quizNpc === i && !t.hidden ? `npc:${i}` : undefined}
        />
      ),
    })
  })
  items.sort((a, b) => a.depth - b.depth)

  // ── 머리 위 알림 (퀘스트·완성·영업 가능)
  const markers: ReactElement[] = []
  const markAt = (key: string, x: number, y: number, z: number, label: string, tone: string) => {
    const p = iso(x, y, z)
    markers.push(
      <g key={key} transform={`translate(${p.x},${p.y})`} style={{ pointerEvents: 'none' }}>
        <g className="marker-bob">
          <rect x={-label.length * 5.6 - 10} y={-15} width={label.length * 11.2 + 20} height={24} rx={12} fill={tone} stroke="#fff" strokeWidth={2} />
          <text y={2.5} textAnchor="middle" fontSize={11.5} fontWeight={900} fill="#fff" fontFamily="Pretendard Variable, sans-serif">
            {label}
          </text>
          <path d="M-5 9 L0 15 L5 9 z" fill={tone} />
        </g>
      </g>,
    )
  }
  if (craftReady) markAt('m-craft', 19, 7, 102, '완성!', '#22A090')
  if (shopReady) markAt('m-shop', 15.5, 6.5, 118, '영업 시작', '#F25C54')
  if (workReady) markAt('m-work', 9.5, 13.5, 168, '출근', '#3156C4')
  if (target) {
    const b = target === 'farm' ? { x: 16.5, y: 12.5, z: 40 } : { ...BUILDING_MAP[target], z: target === 'company' ? 182 : target === 'board' ? 76 : 126 }
    const bx = target === 'farm' ? b.x : (b as { x: number; w: number }).x + (b as { w: number }).w / 2
    const by = target === 'farm' ? b.y : (b as { y: number; d: number }).y + (b as { d: number }).d / 2
    const p = iso(bx, by, b.z)
    markers.push(
      <g key="m-target" transform={`translate(${p.x},${p.y})`} style={{ pointerEvents: 'none' }}>
        <g className="marker-bob">
          <circle r={15} fill="#FCCB40" stroke="#fff" strokeWidth={3} />
          <text y={6} textAnchor="middle" fontSize={17} fontWeight={900} fill="#5B3A29">
            !
          </text>
        </g>
      </g>,
    )
  }

  return (
    <div
      className="absolute inset-0 touch-none select-none"
      style={{ cursor: drag.current?.moved ? 'grabbing' : 'pointer' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (drag.current = null)}
      data-zoom={zoomLevel}
    >
      <svg width={screen.width} height={screen.height} className="block">
        <WorldDefs />
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0" stopColor="#8FDBF7" />
            <stop offset="0.55" stopColor="#5BBDE9" />
            <stop offset="1" stopColor="#3A97D2" />
          </linearGradient>
          <radialGradient id="sea-sun" cx="0.18" cy="0.08" r="0.7">
            <stop offset="0" stopColor="#FFFBE6" stopOpacity="0.75" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width={screen.width} height={screen.height} fill="url(#sea)" />
        <rect width={screen.width} height={screen.height} fill="url(#sea-sun)" />
        <g ref={camEl}>
          <GroundLayer />
          {items.map((i) => i.el)}
          {ripple && (
            <g key={ripple.k} transform={`translate(${ripple.x},${ripple.y})`} style={{ pointerEvents: 'none' }}>
              <ellipse className="tap-ripple" rx={18} ry={9} fill="none" stroke="#fff" strokeWidth={3} />
            </g>
          )}
          {markers}
        </g>
      </svg>
    </div>
  )
})
