import type { CategoryId } from '@/types'

/** 1분 안에 읽는 "오늘의 한입 팁" */
export const DAILY_TIPS: { category: CategoryId; text: string; lessonId?: string }[] = [
  { category: 'marketing', text: '지도 앱에서 우리 가게를 검색해 영업시간이 맞는지 확인해 보세요. 바뀐 게 있다면 지금 바로 수정!', lessonId: 'l-place-1' },
  { category: 'service', text: '오늘 두 번째 방문한 손님이 있다면 "또 오셨네요!" 한마디. 단골은 알아봐 주는 순간 시작돼요.', lessonId: 'l-svc-1' },
  { category: 'tax', text: '오늘 현금으로 산 재료가 있다면 "지출증빙용 현금영수증"을 받았는지 확인해 보세요.', lessonId: 'l-tax-2' },
  { category: 'ops', text: '냉장고 한 칸만 골라 입고일 라벨을 붙여 보세요. 선입선출은 한 칸부터 시작해도 충분해요.', lessonId: 'l-cost-3' },
  { category: 'digital', text: '어제 들어온 배달 리뷰에 답글을 달았나요? 하루 안에 단 답글이 다음 주문을 부릅니다.', lessonId: 'l-deli-2' },
  { category: 'hygiene', text: '마감 전에 냉장·냉동고 온도를 한 번 기록해 두세요. 10초면 끝나요.', lessonId: 'l-hyg-1' },
  { category: 'marketing', text: '오늘 가장 맛있게 나온 메뉴를 창가 자연광에서 45도로 한 장 찍어 두세요.', lessonId: 'l-place-2' },
  { category: 'support', text: '지원사업 서류를 모아 둘 폴더를 휴대폰에 하나 만들어 두세요. 사업자등록증명부터 넣어 보세요.', lessonId: 'l-sup-2' },
  { category: 'labor', text: '직원 근로계약서, 한 부를 직원에게 줬는지 기억나세요? 기억이 안 나면 오늘 확인해 보세요.', lessonId: 'l-lab-1' },
  { category: 'ops', text: '가장 많이 팔리는 메뉴의 재료비를 계산기로 한 번 두드려 보세요. 원가율이 몇 %인가요?', lessonId: 'l-cost-1' },
  { category: 'service', text: '"대신 이렇게는 해 드릴 수 있어요." 오늘 한 번 써 보세요. "안 돼요"보다 훨씬 부드러워요.', lessonId: 'l-svc-2' },
  { category: 'marketing', text: '브레이크 타임에 15초 영상 하나만 찍어 두세요. 첫 2초는 가장 맛있어 보이는 순간으로!', lessonId: 'l-insta-2' },
  { category: 'digital', text: '배달 포장대에 "실링·김 빼기·소스 분리·요청사항" 메모를 붙여 두면 실수가 줄어요.', lessonId: 'l-deli-3' },
  { category: 'hygiene', text: '날고기 손질 후 손 씻기 30초. 손가락 사이와 손톱 밑까지!', lessonId: 'l-hyg-3' },
]

export function tipOfDay(date: Date): (typeof DAILY_TIPS)[number] {
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86400000)
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length]
}
