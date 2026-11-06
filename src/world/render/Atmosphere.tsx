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

/** 화면 위에 얹는 공기감: 구름·구름 그림자·햇빛·꽃잎·비네트 */
export const Atmosphere = memo(function Atmosphere({ night }: { night: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[8] overflow-hidden" aria-hidden>
      {/* 구름 그림자 (땅 위를 지나감) */}
      {CLOUDS.map((c, i) => (
        <div key={`s${i}`} className="cloud-drift absolute" style={{ top: `calc(${c.top} + 70px)`, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: 0.09, filter: 'blur(10px)' }}>
          <CloudShape w={c.w * 1.3} shadow />
        </div>
      ))}
      {/* 햇빛 */}
      {!night && <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 12% 0%, rgba(255,247,214,0.38) 0%, rgba(255,247,214,0.08) 38%, transparent 60%)', mixBlendMode: 'soft-light' }} />}
      {!night && <div className="sun-rays absolute -left-[10%] -top-[30%] h-[90%] w-[60%]" />}
      {/* 꽃잎 */}
      {!night &&
        PETALS.map((p, i) => (
          <span
            key={`p${i}`}
            className="petal absolute -top-4 rounded-[60%_40%_60%_40%]"
            style={{ left: p.left, width: p.size, height: p.size * 0.7, background: p.color, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, opacity: 0.85 }}
          />
        ))}
      {/* 구름 */}
      {CLOUDS.map((c, i) => (
        <div key={`c${i}`} className="cloud-drift absolute" style={{ top: c.top, animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s`, opacity: night ? c.op * 0.3 : c.op * 0.34, filter: "blur(0.6px)" }}>
          <CloudShape w={c.w} />
        </div>
      ))}
      {/* 비네트 */}
      <div className="absolute inset-0" style={{ background: 'radial-gradient(130% 120% at 50% 45%, transparent 55%, rgba(16,30,60,0.28) 100%)' }} />
    </div>
  )
})
