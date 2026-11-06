/**
 * 도트 캐릭터 합성기
 * - tools/sprite_art.py 에서 손으로 찍은 부위(spriteData.ts)를 겹쳐 그리고
 * - 고른 색으로 팔레트(밝게/기본/그늘/깊은그늘/선)를 만들어 기호를 색으로 바꿔요.
 * - 'F' = 앞 3/4 (오른쪽을 봄), 'B' = 뒤 3/4. 왼쪽은 좌우 반전으로.
 */
import type { Look } from '../avatar'
import { SPRITE } from './spriteData'

export const SW = SPRITE.W
export const SH = SPRITE.H
/** 발바닥 아래 경계 (캔버스 줄) */
export const FY = 50
export const X0 = 18
/** 도트 1칸 = 월드 단위 */
export const PX = 1.3

type RGB = [number, number, number]
interface Part {
  x: number
  y: number
  rows: readonly string[]
}

/* ───────── 색 ───────── */
const hexRgb = (h: string): RGB => {
  const n = parseInt(h.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: RGB, b: RGB, t: number): RGB => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)]

/** [밝게, 기본, 그늘, 깊은그늘, 선] — 그늘은 보랏빛, 밝은 쪽은 노란빛으로 */
function ramp(hex: string, kind: 'cloth' | 'skin' = 'cloth'): [RGB, RGB, RGB, RGB, RGB] {
  const b = hexRgb(hex)
  if (kind === 'skin') return [mix(b, [255, 252, 244], 0.45), b, mix(b, [222, 120, 118], 0.3), mix(b, [180, 80, 90], 0.5), mix(b, [92, 38, 44], 0.74)]
  const lum = (0.3 * b[0] + 0.59 * b[1] + 0.11 * b[2]) / 255
  return [
    mix(b, [255, 246, 220], lum < 0.85 ? 0.35 : 0.6),
    b,
    mix(mix(b, [78, 60, 140], 0.26), [0, 0, 0], 0.06),
    mix(mix(b, [52, 36, 110], 0.45), [0, 0, 0], 0.12),
    mix(b, [24, 14, 38], 0.74),
  ]
}

function hatColor(look: Look) {
  return look.hat === 5 ? '#E2C178' : look.outfit
}

function palette(look: Look): Record<string, RGB> {
  const sk = ramp(look.skin, 'skin')
  const hr = ramp(look.hairColor)
  const tp = ramp(look.outfit)
  const bt = ramp(look.bottomColor)
  const sh = ramp(look.shoes)
  const wh = ramp('#FBF8F0')
  const ac = ramp('#E2453E')
  const ht = ramp(hatColor(look))
  const iris = hexRgb(look.eyeColor)
  const EYE: RGB = [40, 28, 52]
  const p: Record<string, RGB> = {
    '1': sk[0], '2': sk[1], '3': sk[2], '4': sk[4],
    h: hr[0], H: hr[1], j: hr[2], J: hr[3], K: hr[4],
    t: tp[0], T: tp[1], y: tp[2], u: tp[3], Y: tp[4],
    p: bt[0], P: bt[1], q: bt[2], Q: bt[4],
    f: sh[0], F: sh[1], g: sh[2], G: sh[4],
    w: wh[0], W: wh[1], v: wh[2], V: wh[4],
    r: ac[0], R: ac[1], x: ac[2], X: ac[4],
    c: ht[0], C: ht[1], d: ht[2], e: ht[3], D: ht[4],
    '#': EYE, i: mix(iris, EYE, 0.25), l: mix(iris, [255, 255, 255], 0.42), o: [255, 255, 255],
    m: [128, 44, 56], n: [236, 124, 132], b: mix(hexRgb(look.skin), [255, 112, 138], 0.42),
    '@': [58, 48, 66], _: [215, 235, 250], s: [40, 34, 52], S: [120, 116, 150], z: [242, 196, 76], Z: [170, 120, 40],
  }
  const pants = look.bottom === 0
  p['%'] = pants ? p.P : p['2']
  p['&'] = pants ? p.q : p['3']
  p['='] = pants ? p.P : p.W
  p['+'] = pants ? p.q : p.v
  const longSleeve = look.top !== 0
  p['~'] = longSleeve ? p.T : p['2']
  p['^'] = longSleeve ? p.y : p['3']
  p[':'] = longSleeve ? p.Y : p['4']
  return p
}

/* ───────── 합성 ───────── */
export type Face = 'normal' | 'happy' | 'surprised' | 'tired' | 'closed' | 'yawn' | 'talk' | 'talkOpen'
export type PoseKey = keyof typeof SPRITE.poses
export type View = 'F' | 'B'

const EYE_STYLES = ['round', 'sparkle', 'smile', 'sharp', 'sleepy'] as const
const MOUTH_STYLES = ['smile', 'grin', 'cat', 'neutral'] as const
const RAISED = new Set(['wave1', 'wave2', 'up', 'stretch', 'work1'])

function blit(buf: Uint8ClampedArray, part: Part | undefined, dy: number, pal: Record<string, RGB>) {
  if (!part) return
  for (let r = 0; r < part.rows.length; r++) {
    const row = part.rows[r]
    const y = part.y + r + dy
    if (y < 0 || y >= SH) continue
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === '.') continue
      const x = part.x + c
      if (x < 0 || x >= SW) continue
      const col = pal[ch]
      if (!col) continue
      const k = (y * SW + x) * 4
      buf[k] = col[0]
      buf[k + 1] = col[1]
      buf[k + 2] = col[2]
      buf[k + 3] = 255
    }
  }
}

export function renderSprite(look: Look, view: View, pose: PoseKey, face: Face): Uint8ClampedArray {
  const [na, fa, legs, by, hy] = SPRITE.poses[pose] as unknown as [string, string, string, number, number]
  const pal = palette(look)
  const buf = new Uint8ClampedArray(SW * SH * 4)
  const sl = look.top === 0 ? 3 : 6
  const raised = RAISED.has(fa)
  const F = SPRITE.F as unknown as Record<string, unknown>
  const B = SPRITE.B as unknown as Record<string, unknown>
  const arm = (side: 'near' | 'far', p: string) => (F.arm as Record<string, Part>)[`${side}:${p}:${sl}`]
  const legsDy = legs === 'jump' ? by : 0
  const draw = (p: Part | undefined, extra = 0) => blit(buf, p, by + extra, pal)
  const waist = (B.waist as Part[])[look.bottom]
  if (view === 'F') {
    draw((F.hairBack as Part[])[look.hair], hy)
    if (!raised) draw(arm('far', fa))
    blit(buf, (F.legs as Record<string, Part>)[legs], legsDy, pal)
    if (look.bottom !== 2) draw(waist)
    draw(F.neck as Part)
    draw((F.torso as Part[])[look.top])
    if (look.role === 'owner') draw(F.apron as Part)
    if (look.role === 'employee') draw(F.tie as Part)
    if (look.bottom === 2) draw(waist)
    draw(arm('near', na))
    draw(F.head as Part, hy)
    const ek = face === 'happy' || face === 'surprised' || face === 'tired' || face === 'closed' ? face : face === 'yawn' ? 'closed' : EYE_STYLES[look.eyes % 5]
    draw((F.eyes as Record<string, Part>)[ek], hy)
    draw((F.brows as Part[])[look.brows % 3], hy)
    const mk = face === 'happy' || face === 'surprised' || face === 'yawn' || face === 'talkOpen' || face === 'talk' || face === 'tired' ? face : MOUTH_STYLES[look.mouth % 4]
    draw((F.mouth as Record<string, Part>)[mk], hy)
    if (look.blush) draw(F.blush as Part, hy)
    draw((F.hairFront as Part[])[look.hair], hy)
    if (look.glasses) draw((F.glasses as Part[])[look.glasses], hy)
    if (look.hat) draw((F.hat as Part[])[look.hat], hy)
    if (raised) draw(arm('far', fa))
  } else {
    if (!raised) draw(arm('far', fa))
    blit(buf, (B.legs as Record<string, Part>)[legs], legsDy, pal)
    if (look.bottom !== 2) draw(waist)
    draw(B.neck as Part)
    draw((B.torso as Record<string, Part>)[`${look.top}:${look.role}`])
    if (look.bottom === 2) draw(waist)
    draw(arm('near', na))
    draw(B.head as Part, hy)
    draw((B.hair as Part[])[look.hair], hy)
    if (look.hat) draw((B.hat as Part[])[look.hat], hy)
    if (raised) draw(arm('far', fa))
  }
  return buf
}

/* ───────── 동작별 프레임 ───────── */
export type StripKind = 'idle' | 'walk' | 'talk' | 'wave' | 'cheer' | 'stretch' | 'work' | 'nod' | 'yawn' | 'hop' | 'look'
export interface StripDef {
  frames: [PoseKey, Face][]
  frameMs: number
  iter: number | 'infinite'
}

export function stripDef(kind: StripKind, face: Face, walkSec = 0.46): StripDef {
  const f = face
  switch (kind) {
    case 'walk':
      return { frames: [['walk0', f], ['walk1', f], ['walk2', f], ['walk3', f]], frameMs: (walkSec * 1000) / 4, iter: 'infinite' }
    case 'talk':
      return { frames: [['idle', 'talkOpen'], ['idle', 'talk'], ['breath', 'talkOpen'], ['idle', 'talk']], frameMs: 150, iter: 'infinite' }
    case 'wave':
      return { frames: [['wave1', 'happy'], ['wave2', 'happy'], ['wave1', 'happy'], ['wave2', 'happy']], frameMs: 200, iter: 2 }
    case 'cheer':
      return { frames: [['cheer0', 'happy'], ['cheer1', 'happy'], ['cheer2', 'happy'], ['idle', 'happy']], frameMs: 140, iter: 2 }
    case 'work':
      return { frames: [['work1', f], ['work2', f]], frameMs: 170, iter: 5 }
    case 'stretch':
      return { frames: [['stretch', 'closed'], ['stretch', 'closed'], ['breath', f]], frameMs: 600, iter: 1 }
    case 'yawn':
      return { frames: [['yawn', 'yawn'], ['yawn', 'yawn']], frameMs: 550, iter: 2 }
    case 'nod':
      return { frames: [['nod', f === 'normal' ? 'happy' : f], ['idle', f === 'normal' ? 'happy' : f]], frameMs: 220, iter: 2 }
    case 'hop':
      return { frames: [['hop', 'surprised'], ['idle', 'happy']], frameMs: 250, iter: 1 }
    case 'idle':
    case 'look':
    default: {
      const closed: Face = 'closed'
      return {
        frames: [
          ['idle', f],
          ['idle', f],
          ['idle', f],
          ['breath', f],
          ['breath', f],
          ['breath', f],
          ['idle', f],
          ['idle', f],
          ['idle', f],
          ['breath', f],
          ['breath', f],
          ['idle', f === 'tired' ? 'closed' : closed],
        ],
        frameMs: 300,
        iter: 'infinite',
      }
    }
  }
}

/** 시트용 정지 포즈 */
export function poseFrame(pose: 'idle' | 'walk' | 'wave' | 'cheer' | 'work', face: Face): [PoseKey, Face] {
  if (pose === 'walk') return ['walk0', face]
  if (pose === 'wave') return ['wave1', 'happy']
  if (pose === 'cheer') return ['cheer2', 'happy']
  if (pose === 'work') return ['work1', face]
  return ['idle', face]
}

/* ───────── 캐시된 스트립 이미지 ───────── */
const cache = new Map<string, { url: string; n: number }>()

export function stripImage(look: Look, view: View, frames: [PoseKey, Face][]): { url: string; n: number } {
  const k = `${JSON.stringify(look)}|${view}|${frames.map((f) => f.join(':')).join(',')}`
  const hit = cache.get(k)
  if (hit) return hit
  if (typeof document === 'undefined') return { url: '', n: 1 }
  const uniq = new Map<string, Uint8ClampedArray>()
  for (const [p, f] of frames) {
    const key = `${p}:${f}`
    if (!uniq.has(key)) uniq.set(key, renderSprite(look, view, p, f))
  }
  const canvas = document.createElement('canvas')
  canvas.width = SW * frames.length
  canvas.height = SH
  const ctx = canvas.getContext('2d')
  if (!ctx) return { url: '', n: 1 }
  frames.forEach(([p, f], idx) => ctx.putImageData(new ImageData(new Uint8ClampedArray(uniq.get(`${p}:${f}`)!), SW, SH), idx * SW, 0))
  const res = { url: canvas.toDataURL('image/png'), n: frames.length }
  if (cache.size > 400) cache.clear()
  cache.set(k, res)
  return res
}
