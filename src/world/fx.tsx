import { create } from 'zustand'
import { useScreen } from './screen'

/**
 * 화면 이펙트 — 반짝이 터짐, 떠오르는 글자(+EXP, +코인), 꽃가루(축하), 물결 고리
 * 좌표는 게임 화면 좌표(세로 회전도 반영). 요소 기준이면 fxAt(el, …)을 써요.
 */
type Kind = 'burst' | 'float' | 'confetti' | 'ring'
interface Fx {
  id: number
  kind: Kind
  x: number
  y: number
  text?: string
  color?: string
  emoji?: string
  n?: number
  big?: boolean
}

const useFx = create<{ list: Fx[]; push: (f: Omit<Fx, 'id'>, ms: number) => void }>((set, get) => ({
  list: [],
  push: (f, ms) => {
    const id = Date.now() + Math.random()
    set({ list: [...get().list.slice(-24), { ...f, id }] })
    window.setTimeout(() => set({ list: get().list.filter((x) => x.id !== id) }), ms)
  },
}))

let toLocal: (x: number, y: number) => { x: number; y: number } = (x, y) => ({ x, y })

export function fxBurst(x: number, y: number, opts: { color?: string; emoji?: string; n?: number; big?: boolean } = {}) {
  useFx.getState().push({ kind: 'burst', x, y, ...opts }, 900)
}
export function fxFloat(text: string, x: number, y: number, color = '#FFE27A', big = false) {
  useFx.getState().push({ kind: 'float', x, y, text, color, big }, 1300)
}
export function fxRing(x: number, y: number, color = '#FFFFFF') {
  useFx.getState().push({ kind: 'ring', x, y, color }, 700)
}
export function fxConfetti() {
  useFx.getState().push({ kind: 'confetti', x: 0, y: 0 }, 2600)
}

/** 화면(client) 좌표 → 게임 좌표 */
export function fxPoint(clientX: number, clientY: number) {
  return toLocal(clientX, clientY)
}

/** 요소 가운데에서 이펙트 */
export function fxAt(el: Element | null | undefined, what: 'burst' | 'ring' | { float: string; color?: string }, opts: { color?: string; emoji?: string; n?: number; big?: boolean } = {}) {
  if (!el) return
  const r = el.getBoundingClientRect()
  const p = toLocal(r.left + r.width / 2, r.top + r.height / 2)
  if (what === 'burst') fxBurst(p.x, p.y, opts)
  else if (what === 'ring') fxRing(p.x, p.y, opts.color)
  else fxFloat(what.float, p.x, p.y - 10, what.color, opts.big)
}

const COLORS = ['#FFD35A', '#FF8FB1', '#7ED6F2', '#9BE07A', '#B794F6', '#FFFFFF']

function Burst({ f }: { f: Fx }) {
  const n = f.n ?? 12
  return (
    <div className="absolute" style={{ left: f.x, top: f.y }}>
      <span className="fx-flash absolute -left-6 -top-6 size-12 rounded-full" style={{ background: `radial-gradient(circle, ${f.color ?? '#FFF6C8'} 0%, transparent 70%)` }} />
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + (f.id % 1) * 3
        const d = (f.big ? 70 : 42) * (0.7 + ((i * 37) % 10) / 22)
        const style = { '--dx': `${Math.cos(a) * d}px`, '--dy': `${Math.sin(a) * d - 10}px`, animationDelay: `${(i % 3) * 25}ms` } as React.CSSProperties
        return f.emoji ? (
          <span key={i} className="fx-particle absolute -translate-x-1/2 -translate-y-1/2 text-[1rem]" style={style}>
            {f.emoji}
          </span>
        ) : (
          <span
            key={i}
            className="fx-particle absolute -translate-x-1/2 -translate-y-1/2"
            style={{ ...style, width: i % 3 ? 7 : 10, height: i % 3 ? 7 : 10, background: f.color ?? COLORS[i % COLORS.length], clipPath: i % 2 ? 'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)' : undefined, borderRadius: i % 2 ? 0 : 99 }}
          />
        )
      })}
    </div>
  )
}

export function FxLayer() {
  const screen = useScreen()
  toLocal = screen.toLocal
  const list = useFx((s) => s.list)
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden" aria-hidden>
      {list.map((f) =>
        f.kind === 'burst' ? (
          <Burst key={f.id} f={f} />
        ) : f.kind === 'float' ? (
          <span
            key={f.id}
            className={`fx-float absolute -translate-x-1/2 whitespace-nowrap font-black ${f.big ? 'text-[1.5rem]' : 'text-[1rem]'}`}
            style={{ left: f.x, top: f.y, color: f.color, WebkitTextStroke: '3px #1B1D45', paintOrder: 'stroke fill' }}
          >
            {f.text}
          </span>
        ) : f.kind === 'ring' ? (
          <span key={f.id} className="fx-ring absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px]" style={{ left: f.x, top: f.y, borderColor: f.color }} />
        ) : (
          <div key={f.id} className="absolute inset-0">
            {Array.from({ length: 46 }, (_, i) => (
              <span
                key={i}
                className="fx-confetti absolute -top-4"
                style={{
                  left: `${(i * 53) % 100}%`,
                  width: 6 + (i % 3) * 2,
                  height: 10 + (i % 4) * 2,
                  background: COLORS[i % COLORS.length],
                  animationDelay: `${(i % 9) * 0.07}s`,
                  animationDuration: `${1.6 + (i % 5) * 0.18}s`,
                  borderRadius: i % 4 === 0 ? 99 : 2,
                }}
              />
            ))}
          </div>
        ),
      )}
    </div>
  )
}
