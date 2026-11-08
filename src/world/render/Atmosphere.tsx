import { memo } from 'react'

/** 구름 한 덩이 (SVG) */
function CloudShape({ w, shadow }: { w: number; shadow?: boolean }) {
  const h = w * 0.42
  return (
    <svg width={w} height={h} viewBox="0 0 120 50" className="block" aria-hidden>
      <defs>
        <linearGradient id={shadow ? 'cl-s' : 'cl'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={shadow ? '#0B2A3A' : '#FFFFFF'} />
          <stop offset="1" stopColor={shadow ? '#0B2A3A' : '#E3F1FA'} />
        </linearGradient>
      </defs>
      <g fill={`url(#${shadow ? 'cl-s' : 'cl'})`}>
        <ellipse cx="60" cy="34" rx="52" ry="14" />
        <circle cx="38" cy="26" r="16" />
        <circle cx="62" cy="20" r="20" />
        <circle cx="86" cy="27" r="14" />
      </g>
      {!shadow && <ellipse cx="54" cy="14" rx="14" ry="5" fill="#FFFFFF" opacity="0.8" />}
    </svg>
  )
}

const CLOUDS = [
  { top: '6%', w: 170, dur: 95, delay: -10, op: 0.9 },
  { top: '22%', w: 120, dur: 120, delay: -70, op: 0.75 },
  { top: '58%', w: 200, dur: 140, delay: -40, op: 0.7 },
  { top: '78%', w: 130, dur: 110, delay: -95, op: 0.65 },
]

const PETALS = Array.from({ length: 9 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  dur: 11 + (i % 4) * 3,
  delay: -i * 2.3,
  size: 5 + (i % 3) * 1.5,
  color: ['#FFC2D6', '#FFFFFF', '#FFE08A', '#C9F0A8'][i % 4],
}))

/** 새 떼 (낮) */
const FLOCKS = [
  { top: '14%', dur: 38, delay: -6, s: 1, n: 3 },
  { top: '30%', dur: 52, delay: -30, s: 0.75, n: 4 },
]
function Bird({ k }: { k: number }) {
  return (
    <svg width={18} height={10} viewBox="0 0 18 10" className="absolute" style={{ left: (k % 2) * 14 + k * 9, top: (k % 2) * 9 + (k === 3 ? 4 : 0) }} aria-hidden>
      <g className="flap" style={{ animationDelay: `${k * 0.09}s` }}>
        <path d="M1 3 Q5 0 9 5 Q13 0 17 3" fill="none" stroke="#2E3B55" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

/** 반딧불 (밤) */
const FIREFLIES = Array.from({ length: 14 }, (_, i) => ({ left: `${(i * 41 + 7) % 96}%`, top: `${25 + ((i * 29) % 65)}%`, dur: 4 + (i % 5) * 0.9, delay: -i * 0.7 }))
/** 밤하늘 반짝임 */
const STARS = Array.from({ length: 16 }, (_, i) => ({ left: `${(i * 53 + 11) % 100}%`, top: `${(i * 17) % 34}%`, d: -i * 0.4, s: 2 + (i % 3) }))

/** 화면 위에 얹는 공기감: 구름·구름 그림자·햇빛·꽃잎·새·반딧불·비네트 */
export const Atmosphere = memo(function Atmosphere({ night, low = false }: { night: boolean; low?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden>
      {/* 구름 그림자 (땅 위를 지나감) */}
      {CLOUDS.map((c, i) => (
        <div
          key={`s${i}`}
          className="cloud-drift absolute"
          style={{ top: `calc(${c.top} + 70px)`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: 0.09, filter: 'blur(10px)' }}
        >
          <CloudShape w={c.w * 1.3} shadow />
        </div>
      ))}
      {/* 햇빛 */}
      {!night && (
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 90% at 12% 0%, rgba(255,247,214,0.38) 0%, rgba(255,247,214,0.08) 38%, transparent 60%)', mixBlendMode: 'soft-light' }}
        />
      )}
      {!night && <div className="sun-rays absolute -left-[10%] -top-[30%] h-[90%] w-[60%]" />}
      {/* 꽃잎 */}
      {!night &&
        !low &&
        PETALS.map((p, i) => (
          <span
            key={`p${i}`}
            className="petal absolute -top-4 rounded-[60%_40%_60%_40%]"
            style={{ left: p.left, width: p.size, height: p.size * 0.7, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, opacity: 0.85 }}
          />
        ))}
      {/* 구름 */}
      {CLOUDS.map((c, i) => (
        <div
          key={`c${i}`}
          className="cloud-drift absolute"
          style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: night ? c.op * 0.3 : c.op * 0.34, filter: 'blur(0.6px)' }}
        >
          <CloudShape w={c.w} />
        </div>
      ))}
      {/* 새 떼 */}
      {!night &&
        !low &&
        FLOCKS.map((f, i) => (
          <div key={`f${i}`} className="bird-fly absolute left-0" style={{ top: f.top, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, ['--s' as string]: f.s }}>
            <div className="relative h-6 w-16">
              {Array.from({ length: f.n }, (_, k) => (
                <Bird key={k} k={k} />
              ))}
            </div>
          </div>
        ))}
      {/* 밤: 별 반짝 · 반딧불 */}
      {night &&
        STARS.map((st, i) => (
          <span
            key={`st${i}`}
            className="twinkle absolute rounded-full bg-white"
            style={{ left: st.left, top: st.top, width: st.s, height: st.s, animationDelay: `${st.d}s`, boxShadow: '0 0 6px #fff' }}
          />
        ))}
      {night &&
        !low &&
        FIREFLIES.map((f, i) => (
          <span
            key={`ff${i}`}
            className="screen-firefly absolute size-[5px] rounded-full"
            style={{ left: f.left, top: f.top, animationDuration: `${f.dur}s`, animationDelay: `${f.delay}s`, background: '#F6FF9C', boxShadow: '0 0 8px 3px rgba(239,255,122,0.65)' }}
          />
        ))}
      {/* 비네트 */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 120% at 50% 45%, transparent 55%, rgba(16,30,60,0.28) 100%)' }} />
    </div>
  )
})
