/**
 * 공용 재질 — 색과 상관없이 위에 덧씌우는 빛·그림자 그라디언트.
 * (해는 화면 왼쪽 위: 왼쪽 면은 밝고, 오른쪽 면·아래쪽은 어둡게)
 */
export function WorldDefs() {
  return (
    <defs>
      {/* 벽 */}
      <linearGradient id="m-lit-l" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.28" />
        <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.04" />
        <stop offset="1" stopColor="#3A2410" stopOpacity="0.16" />
      </linearGradient>
      <linearGradient id="m-lit-r" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.08" />
        <stop offset="1" stopColor="#1A1236" stopOpacity="0.26" />
      </linearGradient>
      <linearGradient id="m-eave" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1A1236" stopOpacity="0.32" />
        <stop offset="1" stopColor="#1A1236" stopOpacity="0" />
      </linearGradient>
      {/* 지붕 */}
      <linearGradient id="m-roof-front" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
        <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.06" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
      </linearGradient>
      <linearGradient id="m-roof-back" x1="0" y1="1" x2="0.4" y2="0">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.1" />
      </linearGradient>
      <linearGradient id="m-roof-side" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.1" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
      </linearGradient>
      {/* 유리 */}
      <linearGradient id="m-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F2FBFF" />
        <stop offset="0.42" stopColor="#B9E3F8" />
        <stop offset="1" stopColor="#6FB5E0" />
      </linearGradient>
      <linearGradient id="m-glass-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFF6D2" />
        <stop offset="1" stopColor="#FFBE55" />
      </linearGradient>
      <linearGradient id="m-tower-glass" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#E9F6FF" />
        <stop offset="0.35" stopColor="#9FD0EE" />
        <stop offset="0.6" stopColor="#7DB9E2" />
        <stop offset="1" stopColor="#4F8EC4" />
      </linearGradient>
      <radialGradient id="m-glow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFE6A0" stopOpacity="0.6" />
        <stop offset="1" stopColor="#FFE6A0" stopOpacity="0" />
      </radialGradient>
      {/* 땅 얼룩 */}
      <radialGradient id="m-soft" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.16" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m-dark" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#1F4A10" stopOpacity="0.13" />
        <stop offset="1" stopColor="#1F4A10" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="m-dirt" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#9C7440" stopOpacity="0.2" />
        <stop offset="1" stopColor="#9C7440" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="m-island-light" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFF7C8" stopOpacity="0.22" />
        <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="1" stopColor="#0B3A2A" stopOpacity="0.12" />
      </linearGradient>
      {/* 물 */}
      <linearGradient id="m-water" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#8FE0FA" />
        <stop offset="1" stopColor="#3EAEE4" />
      </linearGradient>
      <linearGradient id="m-paddy" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#B3D88A" />
        <stop offset="1" stopColor="#79B25E" />
      </linearGradient>
      {/* 섬 절벽 */}
      <linearGradient id="m-cliff" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.12" />
        <stop offset="1" stopColor="#2A1408" stopOpacity="0.32" />
      </linearGradient>
      {/* 캐릭터 */}
      <linearGradient id="m-cloth" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
        <stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="1" stopColor="#140A28" stopOpacity="0.26" />
      </linearGradient>
      <radialGradient id="m-skin" cx="0.38" cy="0.32" r="0.75">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.3" />
        <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="1" stopColor="#B4583A" stopOpacity="0.2" />
      </radialGradient>
      <radialGradient id="m-hair" cx="0.35" cy="0.2" r="0.8">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.38" />
        <stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0.05" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
      </radialGradient>
      {/* 나무 잎 */}
      <radialGradient id="m-leaf" cx="0.35" cy="0.3" r="0.75">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
        <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="1" stopColor="#0E3A12" stopOpacity="0.3" />
      </radialGradient>
      <linearGradient id="m-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.18" />
      </linearGradient>
      <radialGradient id="m-smoke" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
      </radialGradient>
      {/* 부드러운 그림자 */}
      <filter id="f-shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="3.2" />
      </filter>
      <filter id="f-soft" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="1.4" />
      </filter>
    </defs>
  )
}
