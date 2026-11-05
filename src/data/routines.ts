import type { BizType, CategoryId, RoutineTemplate, SlotId, TaskTag } from '@/types'
import { CATEGORY_MAP } from './categories'

/** 하루 시간대 — 시각은 영업시간에 맞춰 lib/today.ts 에서 계산 */
export const SLOTS: { id: SlotId; label: string; short: string; icon: string; hint: string }[] = [
  { id: 'open', label: '오픈 전', short: '오픈', icon: 'Sunrise', hint: '문 열기 전 준비' },
  { id: 'morning', label: '오전', short: '오전', icon: 'Sun', hint: '첫 손님 맞이' },
  { id: 'lunch', label: '점심시간', short: '점심', icon: 'UtensilsCrossed', hint: '바쁜 시간, 짧게만' },
  { id: 'break', label: '쉬는 시간', short: '쉬는 시간', icon: 'Coffee', hint: '틈새에 짜잘하게' },
  { id: 'evening', label: '저녁', short: '저녁', icon: 'Sunset', hint: '저녁 손님 전 점검' },
  { id: 'close', label: '마감', short: '마감', icon: 'Moon', hint: '하루 정리' },
]

export const SLOT_MAP = Object.fromEntries(SLOTS.map((s) => [s.id, s])) as Record<SlotId, (typeof SLOTS)[number]>

/** 할 일 분류 표시 — 학습 분야 + 컨디션 + 안전 */
type TagMeta = { name: string; color: string; soft: string; icon: string }
const CATEGORY_TAGS = Object.fromEntries(
  Object.values(CATEGORY_MAP).map((c) => [c.id, { name: c.short, color: c.color, soft: c.soft, icon: c.icon }]),
) as Record<CategoryId, TagMeta>

export const TAG_META: Record<TaskTag, TagMeta> = {
  ...CATEGORY_TAGS,
  care: { name: '컨디션', color: '#D6336C', soft: '#FFF0F6', icon: 'HeartPulse' },
  safety: { name: '안전', color: '#D9480F', soft: '#FFF4E6', icon: 'ShieldAlert' },
  learn: { name: '배움', color: '#7B61FF', soft: '#F1EEFF', icon: 'GraduationCap' },
}

const FOODISH: BizType[] = ['food', 'cafe']

/**
 * 가게 운영 기본 루틴 — 업종에 맞는 것만 기본으로 켜지고, 마이 > 루틴 관리에서 켜고 끌 수 있어요.
 */
export const ROUTINES: RoutineTemplate[] = [
  // ── 오픈 전
  { id: 'r-open-clean', title: '매장 바닥·테이블 청소', slot: 'open', minutes: 10, tag: 'hygiene', freq: 'daily' },
  {
    id: 'r-open-temp',
    title: '냉장·냉동고 온도 기록',
    slot: 'open',
    minutes: 1,
    tag: 'hygiene',
    freq: 'daily',
    bizTypes: ['food', 'cafe', 'retail'],
    tip: '냉장 10℃(권장 5℃) 이하, 냉동 -18℃ 이하',
    lessonId: 'l-hyg-1',
  },
  { id: 'r-open-prep', title: '오늘 재료 손질·준비량 확인', slot: 'open', minutes: 15, tag: 'ops', freq: 'daily', bizTypes: FOODISH },
  { id: 'r-open-display', title: '진열대 정리·빈 칸 채우기', slot: 'open', minutes: 10, tag: 'ops', freq: 'daily', bizTypes: ['retail'] },
  {
    id: 'r-open-booking',
    title: '오늘 예약 확인·고객 메모 보기',
    slot: 'open',
    minutes: 3,
    tag: 'service',
    freq: 'daily',
    bizTypes: ['beauty', 'service'],
    tip: '지난번 요청사항을 기억해 주면 단골이 돼요',
    lessonId: 'l-svc-3',
  },
  { id: 'r-open-cash', title: '시재(거스름돈) 확인', slot: 'open', minutes: 2, tag: 'tax', freq: 'daily' },
  { id: 'r-open-pos', title: '포스·카드단말기·주문앱 켜기', slot: 'open', minutes: 1, tag: 'digital', freq: 'daily' },

  // ── 오전
  { id: 'r-am-sign', title: '간판·조명 켜고 입구 정리', slot: 'morning', minutes: 2, tag: 'marketing', freq: 'daily' },
  {
    id: 'r-am-shortage',
    title: '부족한 재료·물품 메모',
    slot: 'morning',
    minutes: 2,
    tag: 'ops',
    freq: 'daily',
    tip: '쉬는 시간에 발주할 때 이 메모를 보면 돼요',
  },

  // ── 점심시간
  { id: 'r-lunch-refill', title: '피크 전 수저·물·소스 채우기', slot: 'lunch', minutes: 3, tag: 'service', freq: 'daily', bizTypes: FOODISH },
  { id: 'r-lunch-greet', title: '손님께 날씨 인사 한마디', slot: 'lunch', minutes: 0, tag: 'service', freq: 'daily', lessonId: 'l-svc-1' },

  // ── 쉬는 시간 (짜잘하게)
  { id: 'r-brk-meal', title: '사장님 식사 챙기기', slot: 'break', minutes: 15, tag: 'care', freq: 'daily', tip: '끼니 거르면 저녁 장사가 더 힘들어요' },
  { id: 'r-brk-stretch', title: '1분 스트레칭 + 물 한 잔', slot: 'break', minutes: 1, tag: 'care', freq: 'daily' },
  {
    id: 'r-brk-review',
    title: '새 리뷰에 답글 달기',
    slot: 'break',
    minutes: 5,
    tag: 'digital',
    freq: 'daily',
    tip: '감사 → 구체적 언급 → 다음 방문 제안',
    lessonId: 'l-place-3',
  },
  { id: 'r-brk-order', title: '내일 발주 목록 정리', slot: 'break', minutes: 5, tag: 'ops', freq: 'daily', bizTypes: ['food', 'cafe', 'retail'] },
  { id: 'r-brk-learn', title: '3분 틈새 학습', slot: 'break', minutes: 3, tag: 'learn', freq: 'daily', auto: 'learn', tip: '레슨 하나를 끝내면 자동으로 체크돼요' },

  // ── 저녁
  { id: 'r-pm-refill', title: '저녁 전 소모품·재료 보충', slot: 'evening', minutes: 3, tag: 'ops', freq: 'daily', bizTypes: FOODISH },
  { id: 'r-pm-check', title: '화장실·입구 한 번 둘러보기', slot: 'evening', minutes: 2, tag: 'hygiene', freq: 'daily' },

  // ── 마감
  { id: 'r-close-sales', title: '오늘 매출 확인·기록', slot: 'close', minutes: 3, tag: 'tax', freq: 'daily' },
  { id: 'r-close-receipt', title: '영수증·증빙 정리', slot: 'close', minutes: 2, tag: 'tax', freq: 'daily', lessonId: 'l-tax-2' },
  {
    id: 'r-close-label',
    title: '남은 재료 라벨 붙여 보관',
    slot: 'close',
    minutes: 3,
    tag: 'hygiene',
    freq: 'daily',
    bizTypes: FOODISH,
    tip: '개봉일·만든 날짜를 적어 두세요',
    lessonId: 'l-hyg-2',
  },
  { id: 'r-close-clean', title: '주방·작업대 마감 청소', slot: 'close', minutes: 15, tag: 'hygiene', freq: 'daily' },
  { id: 'r-close-safety', title: '가스 밸브·전기·문단속 확인', slot: 'close', minutes: 1, tag: 'safety', freq: 'daily' },
  { id: 'r-close-memo', title: '내일 할 일 한 줄 메모', slot: 'close', minutes: 1, tag: 'ops', freq: 'daily', tip: '아래 "할 일 추가"로 내일 날짜에 넣어 두면 돼요' },

  // ── 주간
  { id: 'w-stock', title: '주간 재고 점검 (선입선출)', slot: 'break', minutes: 20, tag: 'ops', freq: 'weekly', weekday: 1, lessonId: 'l-cost-3' },
  { id: 'w-fridge', title: '냉장고 정리·기한 지난 재료 폐기', slot: 'close', minutes: 15, tag: 'hygiene', freq: 'weekly', weekday: 2, bizTypes: FOODISH },
  { id: 'w-sns', title: 'SNS 게시물 1개 올리기', slot: 'break', minutes: 10, tag: 'marketing', freq: 'weekly', weekday: 4, lessonId: 'l-insta-2' },
  { id: 'w-place', title: '지도(플레이스) 정보·소식 업데이트', slot: 'break', minutes: 5, tag: 'marketing', freq: 'weekly', weekday: 5, lessonId: 'l-place-1' },
  { id: 'w-staff', title: '직원 근무시간 기록 확인·근무표 공유', slot: 'close', minutes: 10, tag: 'labor', freq: 'weekly', weekday: 0, lessonId: 'l-lab-2' },

  // ── 월간
  { id: 'm-review', title: '지난달 매출·원가 돌아보기', slot: 'break', minutes: 20, tag: 'ops', freq: 'monthly', monthDay: 1, lessonId: 'l-cost-1' },
  { id: 'm-support', title: '이번 달 지원사업 공고 훑어보기', slot: 'break', minutes: 10, tag: 'support', freq: 'monthly', monthDay: 3, lessonId: 'l-sup-1' },
  { id: 'm-pay', title: '거래처 대금·월세 결제 확인', slot: 'break', minutes: 5, tag: 'tax', freq: 'monthly', monthDay: 25 },
]

export const ROUTINE_MAP = Object.fromEntries(ROUTINES.map((r) => [r.id, r])) as Record<string, RoutineTemplate>

/** 이 업종에서 기본으로 켜지는지 */
export function defaultOn(r: RoutineTemplate, biz: BizType): boolean {
  return !r.bizTypes || r.bizTypes.includes(biz)
}
