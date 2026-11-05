import { Star } from 'lucide-react'
import { cx } from '@/components/ui'

/** 12,345,000 → "1,234.5만" 같은 짧은 원화 표기 */
export function won(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : n < 0 ? '-' : ''
  const a = Math.abs(Math.round(n))
  if (a >= 100000000) return `${sign}${(a / 100000000).toFixed(a >= 1000000000 ? 0 : 1).replace(/\.0$/, '')}억`
  if (a >= 10000) return `${sign}${(a / 10000).toFixed(a >= 1000000 ? 0 : 1).replace(/\.0$/, '')}만`
  return `${sign}${a.toLocaleString('ko-KR')}`
}

export function wonFull(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`평판 ${value.toFixed(1)}점`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-line" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-sun" style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
            </span>
          </span>
        )
      })}
    </span>
  )
}

export function RankChange({ now, prev }: { now: number; prev: number }) {
  if (!prev) return <span className="text-[0.6875rem] font-bold text-mute">NEW</span>
  const d = prev - now
  if (d === 0) return <span className="text-[0.6875rem] font-bold text-mute">–</span>
  return <span className={cx('text-[0.6875rem] font-extrabold', d > 0 ? 'text-coral' : 'text-primary')}>{d > 0 ? `▲${d}` : `▼${-d}`}</span>
}

/** 가게 그림 — 설비·인테리어·알바가 늘면 그림도 바뀌어요 */
export function Storefront({
  name,
  emoji,
  color,
  equipment = 0,
  interior = 0,
  staff = 0,
  trophy,
  className,
}: {
  name: string
  emoji: string
  color: string
  equipment?: number
  interior?: number
  staff?: number
  trophy?: boolean
  className?: string
}) {
  const stripes = Array.from({ length: 8 }, (_, i) => i)
  return (
    <svg viewBox="0 0 320 210" className={cx('w-full', className)} role="img" aria-label={`${name} 가게 그림`}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF2FF" />
          <stop offset="1" stopColor="#F5F9FF" />
        </linearGradient>
      </defs>
      <rect width="320" height="210" fill="url(#sky)" />
      <circle cx="268" cy="38" r="18" fill="#FCCB40" opacity="0.9" />
      {/* 길 */}
      <rect y="186" width="320" height="24" fill="#E3E9F3" />
      <rect y="184" width="320" height="4" fill="#D3DBE8" />
      {/* 건물 */}
      <rect x="40" y="58" width="240" height="128" rx="10" fill="#FFFFFF" stroke="#E3E9F3" strokeWidth="2" />
      {/* 간판 */}
      <rect x="60" y="40" width="200" height="34" rx="10" fill={color} />
      <text x="160" y="63" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff" fontFamily="Pretendard Variable, Pretendard, sans-serif">
        {name.length > 11 ? name.slice(0, 11) + '…' : name}
      </text>
      {interior >= 2 && (
        <g>
          {[70, 100, 130, 160, 190, 220, 250].map((x) => (
            <circle key={x} cx={x} cy="40" r="3" fill="#FCCB40" />
          ))}
        </g>
      )}
      {/* 차양 */}
      <g transform="translate(48,78)">
        {stripes.map((i) => (
          <path key={i} d={`M${i * 28} 0 h28 v18 q-14 12 -28 0 z`} fill={i % 2 ? '#fff' : color} opacity={i % 2 ? 1 : 0.9} />
        ))}
      </g>
      {/* 진열창 */}
      <rect x="62" y="112" width="110" height="62" rx="8" fill="#EEF4FF" stroke="#D9E8FF" strokeWidth="2" />
      <text x="117" y="154" textAnchor="middle" fontSize="30">
        {emoji}
      </text>
      {equipment >= 1 && <text x="80" y="134" fontSize="14">🔥</text>}
      {equipment >= 2 && <text x="148" y="134" fontSize="14">✨</text>}
      {equipment >= 3 && <text x="80" y="170" fontSize="13">📦</text>}
      {/* 문 */}
      <rect x="190" y="112" width="70" height="74" rx="6" fill={color} opacity="0.85" />
      <rect x="198" y="120" width="54" height="34" rx="4" fill="#fff" opacity="0.55" />
      <circle cx="250" cy="160" r="3" fill="#fff" />
      <rect x="203" y="125" width="44" height="12" rx="3" fill="#fff" />
      <text x="225" y="134" textAnchor="middle" fontSize="8" fontWeight="800" fill={color} fontFamily="Pretendard Variable, sans-serif">
        OPEN
      </text>
      {/* 인테리어: 화분 */}
      {interior >= 1 && (
        <g>
          <rect x="28" y="168" width="18" height="18" rx="3" fill="#C2410C" />
          <circle cx="37" cy="160" r="12" fill="#14A05A" />
          <circle cx="31" cy="154" r="7" fill="#4CC98A" />
        </g>
      )}
      {interior >= 3 && (
        <g>
          <rect x="276" y="168" width="18" height="18" rx="3" fill="#C2410C" />
          <circle cx="285" cy="160" r="12" fill="#14A05A" />
        </g>
      )}
      {/* 알바 */}
      {Array.from({ length: Math.min(3, staff) }, (_, i) => (
        <g key={i} transform={`translate(${150 + i * 14},150)`}>
          <circle cx="6" cy="6" r="6" fill="#FFD9B3" />
          <rect x="0" y="12" width="12" height="12" rx="4" fill="#202244" />
        </g>
      ))}
      {trophy && <text x="282" y="80" fontSize="26">🏆</text>}
    </svg>
  )
}

export const SHOP_COLORS = ['#176FF2', '#F83758', '#167F71', '#FF8A3D', '#7B61FF', '#202244', '#D6336C', '#0E8A4A']
export const SHOP_EMOJIS = ['🏠', '🍲', '☕', '🥐', '🍗', '🍢', '🛒', '💇', '🧺', '🌸', '🍎', '📚']
