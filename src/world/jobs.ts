import type { CategoryId } from '@/types'
import { hash, rng } from '@/lib/rng'

export type JobId = 'marketing' | 'production' | 'sales' | 'finance' | 'hr' | 'cs'

export interface JobDef {
  id: JobId
  name: string
  emoji: string
  desc: string
  /** 승진에 필요한 배움 분야 */
  category: CategoryId
  skills: string
}

export const JOBS: JobDef[] = [
  { id: 'marketing', name: '마케팅팀', emoji: '📣', desc: '가게와 상품을 알리는 일. 홍보 채널·문구·리뷰 관리.', category: 'marketing', skills: '지도·SNS 홍보, 리뷰 관리' },
  { id: 'production', name: '생산관리팀', emoji: '🏭', desc: '얼마나 만들지 정하고 재고·원가를 관리하는 일.', category: 'ops', skills: '수요 예측, 원가율, 선입선출' },
  { id: 'sales', name: '영업팀', emoji: '🤝', desc: '거래처를 만나 주문을 따오고 가격을 협상하는 일.', category: 'digital', skills: '거래 조건, 메뉴 구성, 배달앱' },
  { id: 'finance', name: '재무회계팀', emoji: '🧾', desc: '돈의 흐름을 기록하고 세금·증빙을 챙기는 일.', category: 'tax', skills: '증빙, 부가세·종소세, 과세유형' },
  { id: 'hr', name: '인사팀', emoji: '🧑‍💼', desc: '사람을 뽑고 근로 조건을 지키며 팀을 꾸리는 일.', category: 'labor', skills: '근로계약서, 주휴수당, 4대보험' },
  { id: 'cs', name: '고객서비스팀', emoji: '💬', desc: '손님의 불편을 듣고 해결해 단골로 만드는 일.', category: 'service', skills: '응대 화법, 컴플레인, 재방문' },
]
export const JOB_MAP = Object.fromEntries(JOBS.map((j) => [j.id, j])) as Record<JobId, JobDef>

/** 직급 — 일급(원), 필요한 누적 실적, 필요한 직무 분야 레슨 수 */
export const RANKS = [
  { name: '인턴', pay: 60000, perf: 0, lessons: 0 },
  { name: '사원', pay: 80000, perf: 180, lessons: 1 },
  { name: '주임', pay: 100000, perf: 450, lessons: 1 },
  { name: '대리', pay: 130000, perf: 850, lessons: 2 },
  { name: '과장', pay: 170000, perf: 1400, lessons: 3 },
  { name: '팀장', pay: 220000, perf: 2100, lessons: 3 },
]

export interface WorkTask {
  q: string
  options: { label: string; score: number; feedback: string }[]
  lessonId?: string
}

export const TASKS: Record<JobId, WorkTask[]> = {
  marketing: [
    {
      q: '거래처 식당 사장님이 "손님이 우리 가게를 어떻게 찾는지" 물어요. 먼저 챙길 것은?',
      options: [
        { label: '지도 앱 기본 정보(영업시간·메뉴·사진) 정리', score: 100, feedback: '손님은 "동네+업종"으로 지도에서 먼저 찾아요.' },
        { label: '전단지 1만 장 인쇄', score: 40, feedback: '비용이 크고 효과 측정이 어려워요. 기본 정보부터!' },
        { label: '유명 연예인 광고 섭외', score: 10, feedback: '동네 가게엔 과한 비용이에요.' },
      ],
      lessonId: 'l-place-1',
    },
    {
      q: '새 메뉴 홍보 영상을 만들어요. 첫 2초에 넣을 장면은?',
      options: [
        { label: '가게 간판 정지 화면', score: 30, feedback: '정지 화면은 넘겨 버리기 쉬워요.' },
        { label: '지글지글 조리되는 가장 맛있는 순간', score: 100, feedback: '첫 2초에 눈과 귀를 잡아야 끝까지 봐요.' },
        { label: '사장님 인사말', score: 50, feedback: '정감은 있지만 첫 장면으로는 약해요.' },
      ],
      lessonId: 'l-insta-2',
    },
    {
      q: '동네 손님에게 닿는 해시태그 조합은?',
      options: [
        { label: '#맛집 #food #instagood', score: 30, feedback: '큰 태그는 금방 묻혀요.' },
        { label: '#망원동맛집 #망원동점심 #수제버거', score: 100, feedback: '동네 + 상황 + 메뉴 조합이 근처 손님에게 닿아요.' },
        { label: '태그 없이 올린다', score: 20, feedback: '검색에 잡히지 않아요.' },
      ],
      lessonId: 'l-insta-3',
    },
    {
      q: '"음식이 식어서 왔어요" 별점 2점 리뷰. 답글은?',
      options: [
        { label: '"배달 기사님 탓이에요"', score: 10, feedback: '남 탓은 다음 손님에게 나쁜 인상을 줘요.' },
        { label: '"죄송해요. 포장을 바꿔 더 따뜻하게 보내 드릴게요"', score: 100, feedback: '인정 → 사과 → 구체적 개선이 정답.' },
        { label: '답글을 달지 않는다', score: 30, feedback: '답 없는 가게로 보여요.' },
      ],
      lessonId: 'l-deli-2',
    },
    {
      q: '이번 달 홍보 예산이 10만 원뿐이에요. 가장 효율적인 배분은?',
      options: [
        { label: '무료 SNS 꾸준히 + 지도 광고 소액', score: 100, feedback: '무료 채널을 꾸준히, 유료는 검색 노출에 집중.' },
        { label: '하루에 전단지로 전부 쓰기', score: 40, feedback: '하루 반짝 효과로 끝나기 쉬워요.' },
        { label: '홍보 안 하고 아낀다', score: 20, feedback: '알려지지 않으면 손님이 오지 않아요.' },
      ],
      lessonId: 'l-place-2',
    },
    {
      q: '단골을 늘리는 홍보 아이디어로 가장 좋은 것은?',
      options: [
        { label: '다음 주 신메뉴를 미리 알려 "다시 올 이유" 만들기', score: 100, feedback: '재방문은 다음에 올 이유에서 시작돼요.' },
        { label: '매주 가격을 바꾸기', score: 20, feedback: '혼란스러워요.' },
        { label: '메뉴 수를 줄이기', score: 40, feedback: '정리는 좋지만 단골을 늘리는 방법은 아니에요.' },
      ],
      lessonId: 'l-svc-3',
    },
  ],
  production: [
    {
      q: '어제 김밥 50줄 만들어 40줄 팔고 10줄 버렸어요. 오늘은?',
      options: [
        { label: '오늘도 50줄', score: 30, feedback: '같은 폐기가 반복돼요.' },
        { label: '어제 판매량 + 10% 정도인 44줄', score: 100, feedback: '판매 기록으로 준비량을 정하는 게 기본이에요.' },
        { label: '품절이 무서우니 70줄', score: 10, feedback: '버리는 재료가 더 늘어요.' },
      ],
      lessonId: 'l-cost-3',
    },
    {
      q: '판매가 12,000원, 재료비 3,600원 메뉴의 원가율은?',
      options: [
        { label: '25%', score: 20, feedback: '3,600 ÷ 12,000 = 0.3' },
        { label: '30%', score: 100, feedback: '정답! 원가율 = 재료비 ÷ 판매가 × 100' },
        { label: '36%', score: 20, feedback: '나누는 순서를 다시 확인해요.' },
      ],
      lessonId: 'l-cost-1',
    },
    {
      q: '냉장고에 새로 들어온 재료는 어디에?',
      options: [
        { label: '앞쪽에', score: 20, feedback: '오래된 재료가 뒤로 밀려 버리게 돼요.' },
        { label: '뒤쪽에 (선입선출)', score: 100, feedback: '먼저 들어온 것을 먼저 써요.' },
        { label: '아무 데나', score: 10, feedback: '재고 관리가 어려워져요.' },
      ],
      lessonId: 'l-cost-3',
    },
    {
      q: '많이 남는데 덜 팔리는 메뉴, 어떻게 할까요?',
      options: [
        { label: '바로 메뉴에서 뺀다', score: 30, feedback: '수익성 좋은 메뉴를 잃어요.' },
        { label: '추천 멘트·세트 구성으로 더 알린다', score: 100, feedback: '효자 후보는 알리는 게 먼저.' },
        { label: '가격을 크게 올린다', score: 20, feedback: '더 안 팔려요.' },
      ],
      lessonId: 'l-cost-2',
    },
    {
      q: '원가율을 계산할 때 빠뜨리기 쉬운 것은?',
      options: [
        { label: '포장 용기·기본 반찬', score: 100, feedback: '이걸 빼면 원가율이 실제보다 낮게 나와요.' },
        { label: '메인 재료', score: 10, feedback: '메인 재료는 보통 잘 챙겨요.' },
        { label: '판매가', score: 10, feedback: '판매가는 원가가 아니에요.' },
      ],
      lessonId: 'l-cost-1',
    },
    {
      q: '축제 날 손님이 평소의 1.5배 올 것 같아요. 준비는?',
      options: [
        { label: '평소대로', score: 30, feedback: '품절로 손님을 놓쳐요.' },
        { label: '인기 메뉴 위주로 준비량을 늘린다', score: 100, feedback: '잘 팔리는 것부터 늘리면 폐기 위험이 적어요.' },
        { label: '모든 메뉴를 2배로', score: 40, feedback: '안 팔리는 메뉴는 남아요.' },
      ],
      lessonId: 'l-cost-2',
    },
  ],
  sales: [
    {
      q: '사무실에서 30인분 단체 주문 문의. 먼저 확인할 것은?',
      options: [
        { label: '날짜·시간·메뉴·선입금 여부', score: 100, feedback: '조건을 분명히 해야 노쇼·분쟁을 막아요.' },
        { label: '바로 "네 됩니다"', score: 30, feedback: '준비가 안 되면 신뢰를 잃어요.' },
        { label: '바빠서 거절', score: 20, feedback: '좋은 거래처가 될 수 있었어요.' },
      ],
      lessonId: 'l-svc-1',
    },
    {
      q: '거래처가 "10% 깎아 주면 매주 주문할게요" 해요.',
      options: [
        { label: '원가율을 계산해 남는지 보고 조건부 수락', score: 100, feedback: '할인도 숫자로 판단해요.' },
        { label: '무조건 수락', score: 30, feedback: '팔수록 손해일 수 있어요.' },
        { label: '무조건 거절', score: 40, feedback: '좋은 기회를 놓칠 수 있어요.' },
      ],
      lessonId: 'l-cost-1',
    },
    {
      q: '배달앱 메뉴판을 정리해요. 맨 위에 둘 것은?',
      options: [
        { label: '대표 메뉴 3개', score: 100, feedback: '빨리 고르게 해야 이탈이 줄어요.' },
        { label: '가나다순 전체 메뉴', score: 20, feedback: '고르기 어려워요.' },
        { label: '가장 비싼 메뉴', score: 40, feedback: '대표 메뉴가 먼저예요.' },
      ],
      lessonId: 'l-deli-1',
    },
    {
      q: '신규 거래처에 처음 방문했어요. 가장 좋은 첫인사는?',
      options: [
        { label: '날씨 한마디와 함께 우리 강점 한 줄 소개', score: 100, feedback: '첫 10초의 인상이 오래가요.' },
        { label: '가격표부터 내민다', score: 30, feedback: '관계보다 거래가 먼저면 부담스러워요.' },
        { label: '말없이 명함만', score: 20, feedback: '기억에 남지 않아요.' },
      ],
      lessonId: 'l-svc-1',
    },
    {
      q: '배달 메뉴 이름을 바꾼다면?',
      options: [
        { label: '"수제 돈까스"', score: 40, feedback: '무난하지만 이유가 약해요.' },
        { label: '"매일 아침 직접 두드린 수제 돈까스"', score: 100, feedback: '이름에 장점이 들어가면 고를 이유가 생겨요.' },
        { label: '"돈까스 A"', score: 10, feedback: '매력이 없어요.' },
      ],
      lessonId: 'l-deli-1',
    },
    {
      q: '배달앱 수수료가 올랐어요. 영업팀 제안은?',
      options: [
        { label: '포장 주문 할인으로 직접 오는 손님 늘리기', score: 100, feedback: '수수료 부담을 줄이는 채널 전환.' },
        { label: '배달 메뉴만 가격을 두 배로', score: 20, feedback: '주문이 끊겨요.' },
        { label: '아무것도 안 한다', score: 30, feedback: '이익이 줄어요.' },
      ],
      lessonId: 'l-deli-3',
    },
  ],
  finance: [
    {
      q: '현금으로 재료를 샀어요. 비용 처리를 위해 받아야 할 것은?',
      options: [
        { label: '지출증빙용 현금영수증 (사업자번호)', score: 100, feedback: '적격증빙이 있어야 비용으로 인정받기 좋아요.' },
        { label: '손글씨 메모', score: 10, feedback: '적격증빙이 아니에요.' },
        { label: '필요 없다', score: 10, feedback: '비용 인정이 어려울 수 있어요.' },
      ],
      lessonId: 'l-tax-2',
    },
    {
      q: '개인사업자 종합소득세는 언제 신고하나요?',
      options: [
        { label: '1월', score: 20, feedback: '1월은 부가세 2기 확정신고예요.' },
        { label: '5월', score: 100, feedback: '지난해 소득을 5월에 신고·납부해요.' },
        { label: '7월', score: 20, feedback: '7월은 부가세 1기 확정신고예요.' },
      ],
      lessonId: 'l-tax-1',
    },
    {
      q: '부가세 신고 기한이 일요일이면?',
      options: [
        { label: '그 전 금요일까지', score: 30, feedback: '앞당겨지지 않아요.' },
        { label: '다음 영업일까지', score: 100, feedback: '주말·공휴일이면 다음 영업일이 기한이에요.' },
        { label: '기한이 없어진다', score: 0, feedback: '기한은 그대로 있어요.' },
      ],
      lessonId: 'l-tax-1',
    },
    {
      q: '사업용 카드 사용 내역을 쉽게 모으려면?',
      options: [
        { label: '홈택스에 사업용 신용카드로 등록', score: 100, feedback: '내역이 자동으로 모여 신고가 쉬워져요.' },
        { label: '개인 카드와 섞어서 쓴다', score: 20, feedback: '구분이 어려워져요.' },
        { label: '영수증을 버린다', score: 0, feedback: '증빙을 잃어요.' },
      ],
      lessonId: 'l-tax-2',
    },
    {
      q: '인테리어 비용이 큰 개업 초기, 따져 볼 것은?',
      options: [
        { label: '일반과세자의 부가세 환급 가능성', score: 100, feedback: '초기 투자가 크면 일반과세자가 유리할 수 있어요.' },
        { label: '간판 색깔', score: 10, feedback: '세금과는 관련 없어요.' },
        { label: '상호 글자 수', score: 10, feedback: '관련 없어요.' },
      ],
      lessonId: 'l-tax-3',
    },
    {
      q: '이번 달 매출 300만 원, 비용 220만 원. 이익률은?',
      options: [
        { label: '약 27%', score: 100, feedback: '(300-220) ÷ 300 ≈ 26.7%' },
        { label: '73%', score: 20, feedback: '그건 비용 비율이에요.' },
        { label: '80만 원%', score: 0, feedback: '이익은 80만 원, 비율은 %로 나눠요.' },
      ],
      lessonId: 'l-cost-1',
    },
  ],
  hr: [
    {
      q: '주 2일 일하는 아르바이트생, 근로계약서는?',
      options: [
        { label: '안 써도 된다', score: 0, feedback: '근로시간과 관계없이 서면 작성이 원칙이에요.' },
        { label: '서면으로 쓰고 한 부를 준다', score: 100, feedback: '정답! 교부까지 해야 해요.' },
        { label: '말로만 약속', score: 10, feedback: '분쟁의 씨앗이 돼요.' },
      ],
      lessonId: 'l-lab-1',
    },
    {
      q: '주휴수당이 생기는 1주 소정근로시간 기준은?',
      options: [
        { label: '10시간 이상', score: 20, feedback: '기준보다 낮아요.' },
        { label: '15시간 이상', score: 100, feedback: '15시간 이상 + 개근이 기준이에요.' },
        { label: '40시간 이상', score: 20, feedback: '기준보다 높아요.' },
      ],
      lessonId: 'l-lab-2',
    },
    {
      q: '하루 4시간 × 주 5일 근무자의 주휴시간은?',
      options: [
        { label: '2시간', score: 20, feedback: '20 ÷ 40 × 8 = 4' },
        { label: '4시간', score: 100, feedback: '정답!' },
        { label: '8시간', score: 30, feedback: '주 40시간 근무자 기준이에요.' },
      ],
      lessonId: 'l-lab-2',
    },
    {
      q: '4대보험이 아닌 것은?',
      options: [
        { label: '고용보험', score: 10, feedback: '4대보험이에요.' },
        { label: '산재보험', score: 10, feedback: '4대보험이에요.' },
        { label: '자동차보험', score: 100, feedback: '정답! 4대보험은 국민연금·건강·고용·산재.' },
      ],
      lessonId: 'l-lab-3',
    },
    {
      q: '새해가 되면 인사팀이 꼭 확인할 것은?',
      options: [
        { label: '직원 시급이 새 최저임금 이상인지', score: 100, feedback: '최저임금은 매년 바뀌어요.' },
        { label: '회사 로고 색', score: 0, feedback: '인사 업무가 아니에요.' },
        { label: '아무것도 없다', score: 10, feedback: '연초 점검이 중요해요.' },
      ],
      lessonId: 'l-lab-2',
    },
    {
      q: '알바생이 갑자기 결근해요. 가장 좋은 대응은?',
      options: [
        { label: '대타를 구하고 다음엔 비상 연락망을 만든다', score: 100, feedback: '오늘 문제 해결 + 재발 방지.' },
        { label: '화를 내고 해고 통보', score: 10, feedback: '절차 없이 해고하면 분쟁이 생겨요.' },
        { label: '혼자 버틴다', score: 40, feedback: '손님 응대 품질이 떨어져요.' },
      ],
      lessonId: 'l-lab-1',
    },
  ],
  cs: [
    {
      q: '화가 난 손님이 왔어요. 첫마디는?',
      options: [
        { label: '"규정상 안 돼요"', score: 10, feedback: '대화가 막혀요.' },
        { label: '"많이 불편하셨겠어요"', score: 100, feedback: '공감이 먼저예요.' },
        { label: '"잠시만요" 하고 자리를 피한다', score: 20, feedback: '더 화나요.' },
      ],
      lessonId: 'l-svc-2',
    },
    {
      q: '음식이 잘못 나왔다는 손님에게 해결책을 줄 때는?',
      options: [
        { label: '"새로 해 드릴까요, 다른 메뉴로 바꿔 드릴까요?"', score: 100, feedback: '선택권을 주면 빨리 진정돼요.' },
        { label: '"그냥 드세요"', score: 0, feedback: '불만이 커져요.' },
        { label: '말없이 환불', score: 50, feedback: '해결은 됐지만 관계는 못 지켰어요.' },
      ],
      lessonId: 'l-svc-2',
    },
    {
      q: '두 번째 방문한 손님을 알아봤어요.',
      options: [
        { label: '"또 오셨네요! 지난번 그 메뉴로 드릴까요?"', score: 100, feedback: '알아봐 주는 순간 단골이 시작돼요.' },
        { label: '모른 척한다', score: 30, feedback: '기회를 놓쳤어요.' },
        { label: '"자주 오시네요?" 하고 끝', score: 50, feedback: '조금 아쉬워요.' },
      ],
      lessonId: 'l-svc-1',
    },
    {
      q: '"품절이라 못 먹었어요" 리뷰. 답글은?',
      options: [
        { label: '"다음부턴 일찍 오세요"', score: 10, feedback: '손님 탓이에요.' },
        { label: '"헛걸음하게 해 죄송해요. 준비량을 늘려 둘게요!"', score: 100, feedback: '사과 + 개선 약속.' },
        { label: '"죄송합니다."', score: 50, feedback: '짧아서 성의가 덜 느껴져요.' },
      ],
      lessonId: 'l-deli-2',
    },
    {
      q: '재방문을 부르는 작은 장치로 좋은 것은?',
      options: [
        { label: '스탬프 쿠폰 (5번 방문 시 음료)', score: 100, feedback: '부담 없는 다음 방문 이유.' },
        { label: '매번 큰 할인', score: 30, feedback: '남는 게 없어요.' },
        { label: '아무것도 안 한다', score: 20, feedback: '기억에서 잊혀요.' },
      ],
      lessonId: 'l-svc-3',
    },
    {
      q: '단골 손님 생일이라고 들었어요.',
      options: [
        { label: '작은 서비스와 축하 인사', score: 100, feedback: '감동은 입소문으로 돌아와요.' },
        { label: '모른 척', score: 20, feedback: '기회를 놓쳤어요.' },
        { label: '큰 선물을 산다', score: 40, feedback: '부담스러울 수 있어요.' },
      ],
      lessonId: 'l-svc-3',
    },
  ],
}

/** 오늘 업무 3개 (날짜·직무로 고정) */
export function tasksFor(job: JobId, date: string, n = 3): WorkTask[] {
  const pool = TASKS[job]
  const r = rng(hash(`work:${job}:${date}`))
  const idx = pool.map((_, i) => i).sort(() => r() - 0.5)
  return idx.slice(0, n).map((i) => pool[i])
}

/** 하루 업무 결과 → 실적 점수(0~100)와 일급 */
export function workResult(scores: number[], rankIndex: number, lessonBonus: number): { perf: number; pay: number } {
  const avg = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : 0
  const perf = Math.min(100, Math.round(avg * (1 + Math.min(0.2, lessonBonus * 0.05))))
  const pay = Math.round((RANKS[rankIndex].pay * (0.7 + (0.5 * perf) / 100)) / 100) * 100
  return { perf, pay }
}

export function canPromote(rankIndex: number, totalPerf: number, roleLessons: number): boolean {
  const next = RANKS[rankIndex + 1]
  return !!next && totalPerf >= next.perf && roleLessons >= next.lessons
}

const COLLEAGUE_NAMES = ['김하늘', '이도윤', '박서연', '최민준', '정유나', '한지호', '오세린']

/** 같은 팀 동료 (가상) — 오늘 실적 */
export function colleagues(job: JobId, date: string): { name: string; perf: number }[] {
  const r = rng(hash(`team:${job}:${date}`))
  return COLLEAGUE_NAMES.slice(0, 5).map((name, i) => ({ name, perf: Math.round(45 + r() * 50 - i * 2) }))
}
