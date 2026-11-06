import type { BizType, CategoryId } from '@/types'
import type { Chapter, GameEvent, MarketingId, Personality, Product, Weather } from './types'

export const SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

/** 업종별 장사 특성 — 서비스업은 손님 수가 적고 객단가가 높아요 */
export const BIZ_PROFILE: Record<BizType, { marketMul: number; baseCapacity: number; staffCapacity: number; equipCapacity: number; wage: number }> = {
  food: { marketMul: 1, baseCapacity: 80, staffCapacity: 40, equipCapacity: 30, wage: 80000 },
  cafe: { marketMul: 1.2, baseCapacity: 100, staffCapacity: 50, equipCapacity: 40, wage: 75000 },
  retail: { marketMul: 1.3, baseCapacity: 120, staffCapacity: 50, equipCapacity: 40, wage: 70000 },
  beauty: { marketMul: 0.3, baseCapacity: 24, staffCapacity: 10, equipCapacity: 8, wage: 90000 },
  service: { marketMul: 0.35, baseCapacity: 28, staffCapacity: 12, equipCapacity: 8, wage: 85000 },
  etc: { marketMul: 0.8, baseCapacity: 70, staffCapacity: 30, equipCapacity: 25, wage: 75000 },
}

type Preset = Omit<Product, 'id' | 'stock'>
const g = (name: string, emoji: string, cost: number, price: number, perishable = true): Preset => ({
  name,
  emoji,
  cost,
  price,
  ref: price,
  quality: 3,
  kind: 'goods',
  perishable,
})
const sv = (name: string, emoji: string, cost: number, price: number): Preset => ({
  name,
  emoji,
  cost,
  price,
  ref: price,
  quality: 3,
  kind: 'service',
  perishable: false,
})

/** 처음 고를 수 있는 판매 항목 예시 — 이름·원가·가격은 모두 바꿀 수 있어요 */
export const PRODUCT_PRESETS: Record<BizType, Preset[]> = {
  food: [g('김치찌개', '🍲', 3200, 9000), g('제육볶음', '🍖', 3600, 10000), g('김밥', '🍙', 1300, 4000), g('떡볶이', '🌶️', 1500, 5000)],
  cafe: [g('아메리카노', '☕', 900, 4000), g('카페라떼', '🥛', 1300, 4800), g('크로플', '🧇', 1600, 5500), g('쿠키', '🍪', 700, 2800)],
  retail: [g('도시락', '🍱', 2600, 4800), g('생수', '💧', 300, 1000, false), g('과자', '🍘', 800, 1800, false), g('컵라면', '🍜', 700, 1600, false)],
  beauty: [sv('커트', '✂️', 2000, 15000), sv('염색', '🎨', 14000, 60000), sv('펌', '💇', 18000, 70000)],
  service: [sv('세탁', '🧺', 1500, 6000), sv('옷 수선', '🧵', 1200, 9000), sv('신발 수선', '👞', 2500, 15000)],
  etc: [g('꽃다발', '💐', 1430, 15000, false), g('감자전', '🥔', 450, 4000), g('토마토주스', '🍅', 950, 4500)],
}

export const EMOJI_CHOICES = ['🍲', '🍖', '🍙', '🌶️', '🍜', '🍱', '🍗', '🍔', '🍕', '🥟', '☕', '🥛', '🧇', '🍪', '🍰', '🥐', '🍞', '🍦', '🧃', '🍎', '🥬', '🐟', '💧', '🍘', '✂️', '🎨', '💇', '💅', '🧺', '🧵', '👞', '🔑', '🌸', '📚', '🎁', '⭐']

export const MARKETING: Record<
  MarketingId,
  { label: string; emoji: string; cost: number; awareness: number; demand: number; reputation?: number; desc: string; needSkill?: CategoryId; lessonId?: string }
> = {
  sns: { label: 'SNS 게시물', emoji: '📱', cost: 0, awareness: 4, demand: 0.04, desc: '무료 · 노하우(마케팅)가 높을수록 효과 UP', lessonId: 'l-insta-2' },
  flyer: { label: '전단지 돌리기', emoji: '📄', cost: 30000, awareness: 6, demand: 0.06, desc: '동네 사람들에게 바로 알리기' },
  map: { label: '지도 앱 광고', emoji: '📍', cost: 50000, awareness: 8, demand: 0.1, desc: '"동네+업종" 검색에 노출', lessonId: 'l-place-1' },
  tasting: { label: '시식·체험 행사', emoji: '🍡', cost: 40000, awareness: 4, demand: 0.06, reputation: 0.05, desc: '맛보면 단골이 돼요 · 평판 조금 UP' },
  sale: { label: '오늘만 10% 할인', emoji: '🏷️', cost: 0, awareness: 3, demand: 0.18, desc: '손님은 늘지만 남는 돈은 줄어요' },
  delivery: { label: '배달앱 광고', emoji: '🛵', cost: 60000, awareness: 5, demand: 0.14, desc: '비 오는 날 효과 2배 · 노하우(온라인) Lv1 필요', needSkill: 'digital', lessonId: 'l-deli-1' },
}

export const MAX_ACTIONS = 3

export const UPGRADES = {
  equipment: { label: '설비 늘리기', emoji: '🔧', max: 4, costs: [600000, 1200000, 2400000, 4000000], desc: '하루에 받을 수 있는 손님(생산량) 증가' },
  staff: { label: '알바 고용', emoji: '🧑‍🍳', max: 3, costs: [100000, 100000, 100000], desc: '손님을 더 받고 대기가 줄어요 · 매일 인건비' },
  interior: { label: '인테리어', emoji: '🪴', max: 3, costs: [800000, 1600000, 3000000], desc: '분위기 UP → 평판·인지도 상승' },
} as const

export const RENT = [40000, 70000, 110000]
export const MARKET_SIZE = [640, 900, 1200]
export const START_CASH = 3000000
export const SEASON_DAYS = 7

export const LEAGUE_NAME = (tier: number, r: { sido: string; gu: string; dong: string }) =>
  tier === 0 ? `${r.dong} 골목 리그` : tier === 1 ? `${r.gu} 상권 리그` : `${r.sido} 최고 상인 리그`

export const CHAMPION_TITLE = (tier: number, r: { sido: string; gu: string; dong: string }) =>
  tier === 0 ? `${r.dong} 최고 사장님` : tier === 1 ? `${r.gu} 대표 가게` : `${r.sido} 최고 소상공인`

export const WEATHER: Record<Weather, { label: string; emoji: string; mul: number }> = {
  sunny: { label: '맑음', emoji: '☀️', mul: 1.05 },
  cloudy: { label: '흐림', emoji: '☁️', mul: 1 },
  rain: { label: '비', emoji: '🌧️', mul: 0.82 },
  cold: { label: '추움', emoji: '🥶', mul: 0.92 },
  hot: { label: '더움', emoji: '🥵', mul: 0.95 },
}

export const PERSONALITY: Record<Personality, { label: string; desc: string }> = {
  price: { label: '가격 공세형', desc: '싸게 많이 팔아요. 대신 남는 게 적어요.' },
  quality: { label: '장인형', desc: '품질로 승부. 비싸도 단골이 많아요.' },
  marketing: { label: '홍보왕', desc: '광고를 많이 해서 인지도가 높아요.' },
  steady: { label: '성실형', desc: '꾸준함이 무기. 평판이 안정적이에요.' },
  trendy: { label: 'SNS 핫플형', desc: '유행을 타면 확 뜨지만 기복이 있어요.' },
}

/** 동네 경쟁 가게 이름 재료 */
export const RIVAL_PREFIX = ['행복한', '소문난', '골목', '달빛', '엄마손', '원조', '청년', '새벽', '우리동네', '해뜨는', '오늘도', '정다운', '한입', '꽃길', '별빛']
export const RIVAL_TYPES: { type: string; emoji: string }[] = [
  { type: '분식', emoji: '🍢' },
  { type: '국밥', emoji: '🍲' },
  { type: '베이커리', emoji: '🥐' },
  { type: '커피', emoji: '☕' },
  { type: '치킨', emoji: '🍗' },
  { type: '반찬가게', emoji: '🥬' },
  { type: '과일가게', emoji: '🍎' },
  { type: '정육점', emoji: '🥩' },
  { type: '미용실', emoji: '💇' },
  { type: '세탁소', emoji: '🧺' },
  { type: '꽃집', emoji: '🌸' },
  { type: '김밥', emoji: '🍙' },
  { type: '수제버거', emoji: '🍔' },
  { type: '떡집', emoji: '🍡' },
  { type: '문구점', emoji: '✏️' },
]

/** 하루에 하나씩 나오는 상황 카드 — 고른 결과와 함께 배울 점을 알려 줘요 */
export const EVENTS: GameEvent[] = [
  {
    id: 'ev-price-up',
    title: '재료값이 올랐어요',
    body: '주요 재료 도매가가 15% 올랐다는 연락이 왔어요. 어떻게 할까요?',
    category: 'ops',
    lessonId: 'l-cost-1',
    choices: [
      { label: '가격을 바로 올린다', effect: { demand: -0.06 }, result: '손님이 조금 줄었지만 남는 돈은 지켰어요.' },
      { label: '양·구성을 살짝 조정한다', effect: { cost: -0.06, reputation: -0.02 }, result: '원가를 지켰어요. 너무 줄이면 단골이 눈치채니 조심!', best: true },
      { label: '그대로 버틴다', effect: { cost: 0.15 }, result: '손님은 그대로지만 오늘 원가가 크게 올랐어요.' },
    ],
  },
  {
    id: 'ev-rival-sale',
    title: '옆 가게가 반값 행사를 해요',
    body: '근처 경쟁 가게가 오늘 하루 반값 행사를 한대요.',
    category: 'marketing',
    lessonId: 'l-svc-3',
    choices: [
      { label: '맞불 할인한다', effect: { demand: 0.05, cost: 0.08 }, result: '손님은 지켰지만 출혈 경쟁은 길게 하면 둘 다 손해예요.' },
      { label: '단골에게 쿠폰을 보낸다', effect: { reputation: 0.04, demand: 0.02 }, result: '단골이 의리를 지켜 줬어요. 가격 말고 관계로 이겼어요!', best: true },
      { label: '아무것도 안 한다', effect: { demand: -0.1 }, result: '오늘은 손님을 꽤 뺏겼어요.' },
    ],
  },
  {
    id: 'ev-bad-review',
    title: '별점 1점 리뷰가 달렸어요',
    body: '"불친절하고 늦었어요" 라는 리뷰가 올라왔어요.',
    category: 'service',
    lessonId: 'l-deli-2',
    choices: [
      { label: '사과하고 개선을 약속하는 답글', effect: { reputation: 0.06 }, result: '다른 손님들이 "문제를 고치는 가게"로 봤어요.', best: true },
      { label: '사실이 아니라고 반박', effect: { reputation: -0.12 }, result: '말싸움처럼 보여 오히려 평판이 떨어졌어요.' },
      { label: '그냥 둔다', effect: { reputation: -0.04 }, result: '답 없는 가게로 보였어요.' },
    ],
  },
  {
    id: 'ev-hygiene',
    title: '위생 점검이 나온대요',
    body: '이번 주 구청 위생 점검이 있다는 소식이에요.',
    category: 'hygiene',
    lessonId: 'l-hyg-1',
    choices: [
      { label: '냉장고 온도·라벨부터 점검', effect: { cash: -20000, reputation: 0.05 }, result: '깔끔하게 통과! 손님들도 깨끗한 가게라고 느꼈어요.', best: true },
      { label: '평소대로 영업', effect: { reputation: -0.06 }, result: '지적을 받아 평판이 조금 떨어졌어요.' },
    ],
  },
  {
    id: 'ev-influencer',
    title: '동네 인플루언서가 연락했어요',
    body: '팔로워 2만 명 동네 계정이 무료 식사를 조건으로 소개해 준대요.',
    category: 'marketing',
    lessonId: 'l-insta-1',
    choices: [
      { label: '대표 메뉴를 대접하고 솔직한 후기를 부탁', effect: { cash: -30000, awareness: 10 }, result: '인지도가 쑥! 솔직 후기라 신뢰도 얻었어요.', best: true },
      { label: '정중히 거절', effect: {}, result: '오늘은 평소와 같았어요.' },
      { label: '좋게만 써 달라고 돈을 더 준다', effect: { cash: -100000, awareness: 6, reputation: -0.05 }, result: '광고 티가 나서 오히려 의심을 샀어요.' },
    ],
  },
  {
    id: 'ev-noshow',
    title: '알바생이 갑자기 못 나온대요',
    body: '오늘 점심 알바가 아파서 못 온다고 연락이 왔어요.',
    category: 'labor',
    lessonId: 'l-lab-1',
    choices: [
      { label: '대타를 구한다 (추가 인건비)', effect: { cash: -60000 }, result: '평소처럼 손님을 받았어요.', best: true },
      { label: '혼자 버틴다', effect: { capacity: -0.25, reputation: -0.03 }, result: '손님을 다 못 받고 대기가 길어졌어요.' },
    ],
  },
  {
    id: 'ev-support',
    title: '소상공인 지원사업 공고',
    body: '간판·홍보물 제작을 지원해 주는 공고가 올라왔어요. 서류 준비가 필요해요.',
    category: 'support',
    lessonId: 'l-sup-2',
    choices: [
      { label: '오늘 서류를 준비해 신청', effect: { cash: 200000, awareness: 3, demand: -0.03 }, result: '선정! 지원금 20만 원을 받았어요. 준비하느라 오늘은 조금 바빴어요.', best: true },
      { label: '바빠서 패스', effect: {}, result: '다음 기회를 노려요.' },
    ],
  },
  {
    id: 'ev-festival',
    title: '동네 축제가 열려요',
    body: '오늘 골목 축제로 유동 인구가 크게 늘 예정이에요.',
    category: 'ops',
    lessonId: 'l-cost-3',
    choices: [
      { label: '준비량을 늘리고 가게 앞 홍보', effect: { demand: 0.3, cash: -20000 }, result: '축제 손님을 많이 잡았어요! 준비량이 충분했는지 결과를 보세요.', best: true },
      { label: '평소대로', effect: { demand: 0.12 }, result: '자연스럽게 손님이 조금 늘었어요.' },
    ],
  },
  {
    id: 'ev-regular-bday',
    title: '단골 손님 생일이래요',
    body: '자주 오는 단골이 오늘 생일이라고 지나가듯 말했어요.',
    category: 'service',
    lessonId: 'l-svc-3',
    choices: [
      { label: '작은 서비스를 드린다', effect: { cash: -5000, reputation: 0.05, awareness: 2 }, result: '감동한 단골이 동네방네 자랑했어요.', best: true },
      { label: '축하 인사만', effect: { reputation: 0.01 }, result: '고마워했어요.' },
    ],
  },
  {
    id: 'ev-tax',
    title: '부가세 신고 기간이에요',
    body: '신고 기한이 다가와요. 영수증을 정리해야 해요.',
    category: 'tax',
    lessonId: 'l-tax-2',
    choices: [
      { label: '오늘 짬 내서 증빙 정리', effect: { cash: 50000, demand: -0.03 }, result: '빠진 비용을 찾아 세금이 줄었어요 (+5만 원).', best: true },
      { label: '마감 직전에 몰아서', effect: { cash: -40000 }, result: '급하게 하느라 비용을 놓쳤어요.' },
    ],
  },
  {
    id: 'ev-delivery-fee',
    title: '배달앱 수수료가 올랐어요',
    body: '배달 주문 수수료가 오른다는 공지가 왔어요.',
    category: 'digital',
    lessonId: 'l-deli-1',
    choices: [
      { label: '포장 주문 할인으로 유도', effect: { demand: 0.03, cost: 0.02 }, result: '직접 오는 손님이 늘어 수수료 부담을 줄였어요.', best: true },
      { label: '그대로 둔다', effect: { cost: 0.04 }, result: '남는 돈이 조금 줄었어요.' },
    ],
  },
  {
    id: 'ev-construction',
    title: '가게 앞 도로 공사',
    body: '오늘 가게 앞 보도블록 공사로 지나가기 불편해요.',
    category: 'marketing',
    lessonId: 'l-place-1',
    choices: [
      { label: '입구 안내문 + 지도 앱 "소식" 올리기', effect: { demand: -0.04, awareness: 2 }, result: '손님이 길을 잃지 않았어요.', best: true },
      { label: '아무것도 안 한다', effect: { demand: -0.15 }, result: '문 닫은 줄 알고 그냥 간 손님이 많았어요.' },
    ],
  },
  {
    id: 'ev-new-menu',
    title: '신메뉴 아이디어가 떠올랐어요',
    body: '요즘 유행하는 재료로 신메뉴를 만들어 볼까요?',
    category: 'ops',
    lessonId: 'l-cost-2',
    choices: [
      { label: '오늘 소량만 테스트 판매', effect: { cash: -20000, awareness: 4 }, result: '반응을 보고 결정할 수 있게 됐어요. 작게 시험하는 게 정답!', best: true },
      { label: '대량으로 바로 출시', effect: { cash: -120000, awareness: 6 }, result: '화제는 됐지만 남은 재료가 많이 남았어요.' },
      { label: '보류', effect: {}, result: '오늘은 평소대로.' },
    ],
  },
  {
    id: 'ev-card-machine',
    title: '카드 단말기가 고장 났어요',
    body: '아침부터 카드 결제가 안 돼요!',
    category: 'digital',
    choices: [
      { label: '계좌이체·간편결제 안내판 붙이기', effect: { demand: -0.04 }, result: '대부분 손님이 다른 방법으로 결제했어요.', best: true },
      { label: '현금만 받는다', effect: { demand: -0.2, reputation: -0.03 }, result: '현금 없는 손님은 그냥 돌아갔어요.' },
    ],
  },
  {
    id: 'ev-big-order',
    title: '단체 주문 문의',
    body: '근처 사무실에서 내일 30인분 단체 주문을 할 수 있냐고 물어요.',
    category: 'service',
    lessonId: 'l-svc-1',
    choices: [
      { label: '선입금 받고 수락', effect: { cash: 150000, reputation: 0.03 }, result: '단체 주문 성공! 사무실 단골이 생겼어요.', best: true },
      { label: '바빠서 거절', effect: {}, result: '다음 기회에.' },
    ],
  },
]

/** 사업을 잡아 가는 과정 — 장(챕터)마다 미션을 끝내면 보상 */
export const CHAPTERS: Chapter[] = [
  {
    id: 'ch1',
    title: '1장 · 창업 준비',
    story: '간판을 달고 첫 상품을 정했어요. 남는 가격을 매기는 것부터!',
    reward: 200000,
    missions: [
      { id: 'products2', label: '판매 항목 2개 이상 등록' },
      { id: 'margin', label: '모든 항목 원가율 50% 이하로 가격 정하기' },
      { id: 'firstDay', label: '첫 영업 시작하기' },
    ],
  },
  {
    id: 'ch2',
    title: '2장 · 첫 손님',
    story: '문을 열었어요. 손님을 맞고, 첫 흑자를 내 봐요.',
    reward: 300000,
    missions: [
      { id: 'busy60', label: '하루 수용량의 60% 이상 손님 받기' },
      { id: 'profit1', label: '흑자인 날 만들기' },
      { id: 'reply1', label: '리뷰 답글 미니게임 1번 맞히기' },
    ],
  },
  {
    id: 'ch3',
    title: '3장 · 단골 만들기',
    story: '다시 오는 손님이 생기기 시작했어요. 평판과 재고를 챙겨요.',
    reward: 400000,
    missions: [
      { id: 'rep38', label: '평판 ★3.8 이상' },
      { id: 'waste10', label: '폐기율 10% 이하인 날' },
      { id: 'days3', label: '3일 이상 영업' },
    ],
  },
  {
    id: 'ch4',
    title: '4장 · 동네 입소문',
    story: '"거기 괜찮대" 소문이 돌아요. 동네 상위권을 노려요.',
    reward: 500000,
    missions: [
      { id: 'aw50', label: '인지도 50 이상' },
      { id: 'mk3', label: '서로 다른 홍보 3가지 써 보기' },
      { id: 'top3', label: '하루 순위 TOP 3' },
    ],
  },
  {
    id: 'ch5',
    title: '5장 · 가게 키우기',
    story: '손님이 넘쳐요. 설비와 사람에 투자할 때예요.',
    reward: 800000,
    missions: [
      { id: 'equip1', label: '설비 1단계 이상' },
      { id: 'staff1', label: '알바 1명 이상 고용' },
      { id: 'profit1m', label: '누적 이익 100만 원' },
    ],
  },
  {
    id: 'ch6',
    title: '6장 · 동네 대표 가게',
    story: '한 시즌을 TOP 3로 마치면 더 큰 리그로 올라가요.',
    reward: 1000000,
    missions: [{ id: 'promote', label: '시즌 TOP 3로 승급하기' }],
  },
  {
    id: 'ch7',
    title: '7장 · 지역 최고 소상공인',
    story: '시·도 리그에서 우승하면 지역 최고의 소상공인!',
    reward: 3000000,
    missions: [{ id: 'champion', label: '시·도 리그 시즌 우승' }],
  },
]

/** 리뷰 답글 미니게임 */
export const REPLY_QUIZ = [
  {
    review: '맛은 있는데 너무 오래 기다렸어요 ★★★',
    options: [
      '주말이라 원래 바빠요. 이해해 주세요.',
      '오래 기다리게 해 죄송해요. 피크 시간엔 준비량을 늘려 더 빨리 드릴게요!',
      '감사합니다.',
    ],
    answer: 1,
    explain: '불편을 인정하고 구체적인 개선을 약속하면 다음 손님이 안심해요.',
  },
  {
    review: '사장님 친절하시고 양도 많아요 ★★★★★',
    options: [
      '감사합니다!',
      '좋게 봐 주셔서 감사해요! 다음엔 신메뉴도 꼭 드셔 보세요 😊',
      '당연하죠.',
    ],
    answer: 1,
    explain: '감사 + 다음 방문 이유를 주면 재방문으로 이어져요.',
  },
  {
    review: '가격에 비해 양이 적어요 ★★',
    options: [
      '재료값이 올라서 어쩔 수 없어요.',
      '다른 가게도 다 그래요.',
      '아쉬우셨다니 죄송해요. 말씀 주신 점 반영해 구성을 다시 살펴볼게요.',
    ],
    answer: 2,
    explain: '변명보다 사과와 개선 의지가 신뢰를 만들어요.',
  },
  {
    review: '품절이라 못 먹었어요 ㅠ ★★',
    options: [
      '다음부턴 일찍 오세요.',
      '헛걸음하게 해 죄송해요! 인기 메뉴 준비량을 늘려 둘게요.',
      '죄송합니다.',
    ],
    answer: 1,
    explain: '품절은 아쉬움이자 인기의 신호. 준비량을 늘리겠다는 약속이 좋아요.',
  },
]

export const REVIEW_TEXT = {
  value: ['가성비 최고예요', '이 가격에 이 맛이라니', '부담 없는 가격이라 자주 올 것 같아요'],
  pricey: ['맛은 있는데 좀 비싸요', '가격이 아쉬워요', '양에 비해 비싼 느낌'],
  quality: ['정말 맛있어요!', '재료가 신선해요', '정성이 느껴져요'],
  stockout: ['품절이라 못 샀어요 ㅠ', '먹고 싶은 게 다 떨어졌어요', '일찍 와야겠어요'],
  wait: ['너무 오래 기다렸어요', '사람이 많아 정신없었어요'],
  friendly: ['사장님이 친절하세요', '분위기가 좋아요', '또 올게요!'],
  plain: ['무난해요', '그냥 그래요', '평범했어요'],
}
