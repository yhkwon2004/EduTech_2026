import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactElement } from 'react'
import { BUILDINGS, BUILDING_MAP, DECOS, PLOTS, RIVAL_LOTS, RIVAL_PLACEHOLDER, WORLD_BOUNDS, findPath, iso, screenToTile, walkable, type BuildingId, type HitId } from '../map'
import { useWorld, levelOf } from '../store'
import { useGame, canPlayToday } from '@/game/store'
import { useScreen } from '../screen'
import { GroundLayer } from './Ground'
import { AcademyArt, BoardArt, CompanyArt, MarketArt, RivalArt, ShopArt, SupportArt, WorkshopArt } from './Buildings'
import { Crop, Deco, LockedPlot, PlotHit } from './Props'
import { CharacterNode, type Look } from './Character'
import { WorldDefs } from './Defs'
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
  flip: boolean
  /** 화면 위쪽(멀어지는 쪽)으로 걸으면 뒷모습 */
  back: boolean
  walking: boolean
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

  const look: Look = { ...world.avatar, role: world.path === 'employee' ? 'employee' : 'owner' }
  const level = levelOf(world.exp).level
  const hour = new Date(now).getHours()
  const night = hour >= 19 || hour < 6

  // ── 이동 상태 (ref로 관리)
  const player = useRef<Walker>({ x: world.pos.x, y: world.pos.y, path: [], flip: false, back: false, walking: false })
  const pending = useRef<HitId | null>(null)
  const [pTile, setPTile] = useState({ x: world.pos.x, y: world.pos.y, walking: false, flip: false, back: false })
  const pTileRef = useRef(pTile)
  const onArriveRef = useRef(onArrive)
  onArriveRef.current = onArrive
  const playerEl = useRef<SVGGElement>(null)
  const camEl = useRef<SVGGElement>(null)
  const cam = useRef({ x: footOf(world.pos).x, y: footOf(world.pos).y - 40, zoom: 1, follow: true })
  const [zoomLevel, setZoomLevel] = useState(1)

  // ── 손님 NPC
  const npcs = useRef<(Walker & { look: Look; hidden: number; goal: { x: number; y: number }; rush?: boolean })[]>([])
  const npcEls = useRef<(SVGGElement | null)[]>([])
  const [npcTiles, setNpcTiles] = useState<{ x: number; y: number; walking: boolean; flip: boolean; back: boolean; hidden: boolean }[]>([])
  const npcTilesRef = useRef(npcTiles)
  const doors = useMemo(() => [...RIVAL_LOTS.map((r) => r.door), BUILDING_MAP.shop.door, BUILDING_MAP.market.door, BUILDING_MAP.academy.door], [])
  useEffect(() => {
    const r = rng(hash('npcs'))
    const outfits = ['#F28AC0', '#3BAA5C', '#F2A93B', '#8B6CF6', '#3E8EDE', '#E07A3F', '#2E9C9C']
    const hairs = ['#3B2A20', '#1E1E1E', '#7A4E35', '#C8955A', '#2B2B40']
    npcs.current = Array.from({ length: NPC_COUNT }, (_, i) => {
      const start = doors[Math.floor(r() * doors.length)]
      const goal = doors[Math.floor(r() * doors.length)]
      return {
        x: start.x,
        y: start.y,
        path: findPath(start, goal),
        flip: false,
        back: false,
        walking: true,
        hidden: 0,
        goal,
        look: { hair: i % 4, hairColor: hairs[i % hairs.length], outfit: outfits[i % outfits.length], skin: i % 3 ? '#FFD9B8' : '#F1C9A5', role: 'npc', pants: i % 2 ? '#34385A' : '#5B6B8C' },
      }
    })
    npcTilesRef.current = npcs.current.map((n) => ({ x: n.x, y: n.y, walking: true, flip: false, back: false, hidden: false }))
    setNpcTiles(npcTilesRef.current)
  }, [doors])

  // ── 화면 크기에 맞춘 기본 확대
  const baseZoom = Math.max(0.62, Math.min(1.35, screen.height / 430))

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

  // ── 매 프레임: 이동 + 카메라
  useEffect(() => {
    let raf = 0
    let last = performance.now()
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
      // 화면에서 오른쪽으로 가면 오른쪽을 봄
      const sdx = dx - dy
      const sdy = dx + dy
      if (Math.abs(sdx) > 0.01) w.flip = sdx < 0
      if (Math.abs(sdy) > 0.01) w.back = sdy < 0
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
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      if (!paused) {
        const p = player.current
        const wasWalking = p.walking
        step(p, dt)
        const f = footOf(p)
        playerEl.current?.setAttribute('transform', `translate(${f.x},${f.y})`)
        const tile = { x: Math.round(p.x), y: Math.round(p.y) }
        const pt = pTileRef.current
        if (tile.x !== pt.x || tile.y !== pt.y || p.walking !== pt.walking || p.flip !== pt.flip || p.back !== pt.back) {
          pTileRef.current = { x: tile.x, y: tile.y, walking: p.walking, flip: p.flip, back: p.back }
          setPTile(pTileRef.current)
        }
        if (wasWalking && !p.walking) {
          useWorld.getState().setPos({ x: Math.round(p.x), y: Math.round(p.y) })
          if (pending.current) {
            const hit = pending.current
            pending.current = null
            onArriveRef.current(hit)
          }
        }
        // 손님들
        let changed = false
        const tiles = npcTilesRef.current.length === npcs.current.length ? [...npcTilesRef.current] : npcs.current.map((n) => ({ x: n.x, y: n.y, walking: true, flip: false, back: false, hidden: false }))
        npcs.current.forEach((n, i) => {
          if (n.hidden > 0) {
            n.hidden -= dt
            if (n.hidden <= 0) {
              const goal = n.rush ? BUILDING_MAP.shop.door : doors[Math.floor(Math.random() * doors.length)]
              n.rush = false
              n.goal = goal
              n.path = findPath({ x: Math.round(n.x), y: Math.round(n.y) }, goal)
            }
          } else if (!step(n, dt * 0.55)) {
            n.hidden = 1.5 + Math.random() * 4
          }
          const el = npcEls.current[i]
          if (el) {
            const nf = footOf(n)
            el.setAttribute('transform', `translate(${nf.x},${nf.y})`)
            el.style.opacity = n.hidden > 0 ? '0' : '1'
          }
          const tt = { x: Math.round(n.x), y: Math.round(n.y), walking: n.walking, flip: n.flip, back: n.back, hidden: n.hidden > 0 }
          const prev = tiles[i]
          if (!prev || prev.x !== tt.x || prev.y !== tt.y || prev.flip !== tt.flip || prev.back !== tt.back || prev.hidden !== tt.hidden || prev.walking !== tt.walking) {
            tiles[i] = tt
            changed = true
          }
        })
        if (changed) {
          npcTilesRef.current = tiles
          setNpcTiles(tiles)
        }
        // 카메라 따라가기
        const c = cam.current
        if (c.follow) {
          c.x += (f.x - c.x) * 0.1
          c.y += (f.y - 30 - c.y) * 0.1
        }
      }
      applyCamera()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [applyCamera, doors, paused])

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
        const d = doorOf(hit)
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
          npc.path = findPath({ x: Math.round(npc.x), y: Math.round(npc.y) }, BUILDING_MAP.shop.door)
        })
      },
    }),
    [walkToTile],
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
      const door = doorOf(hit)
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
    depth: pTile.x + pTile.y + 0.5,
    el: <CharacterNode key="player" ref={playerEl} look={look} walking={pTile.walking} flip={pTile.flip} back={pTile.back} name={world.name || '나'} me />,
  })
  npcs.current.forEach((n, i) => {
    const t = npcTiles[i]
    if (!t) return
    items.push({
      depth: t.x + t.y + 0.45,
      el: <CharacterNode key={`npc${i}`} ref={(el) => void (npcEls.current[i] = el)} look={n.look} walking={t.walking} flip={t.flip} back={t.back} scale={0.86} seed={i + 1} />,
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
