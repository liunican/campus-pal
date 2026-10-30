// ===== 数据模型 =====

export type TaskType = '快递' | '代买' | '占座' | '带饭' | '打印' | '其他'

export type TaskStatus = 'open' | 'inProgress' | 'pendingConfirm' | 'completed' | 'cancelled'

export type CreditLevel = '青铜' | '白银' | '黄金' | '钻石'

export interface User {
  id: string
  name: string
  avatar: string // emoji 头像
  school: string
  major: string
  creditScore: number // 信用分 0-1000
  verified: boolean // 学号实名认证
  publishedCount: number
  completedCount: number
  completionRate: number // 完成率 0-100
  avgRating: number // 平均评分 0-5
}

export interface Review {
  id: string
  fromName: string
  fromAvatar: string
  rating: number
  content: string
  date: string
}

export interface Task {
  id: string
  type: TaskType
  title: string
  description: string
  price: number // 跑腿费（元）
  location: string // 办事地点
  deliverTo: string // 送达地点
  deadline: string // 截止时间
  urgent: boolean
  status: TaskStatus
  publisher: User
  runner?: User
  createdAt: number
  completedAt?: number
  rewardCredit: number // 完成后获得的信用分
  reviews: Review[]
}

// 信用分规则（用于产品展示）
export const CREDIT_RULES = [
  { action: '完成学号实名认证', delta: '+100', icon: '🎓' },
  { action: '首次发布任务', delta: '+20', icon: '📝' },
  { action: '每完成一单跑腿', delta: '+10', icon: '✅' },
  { action: '获得 5 星好评', delta: '+5', icon: '⭐' },
  { action: '获得差评', delta: '-20', icon: '👎' },
  { action: '接单后违约', delta: '-50', icon: '🚫' },
] as const

// 信用等级
export function getCreditLevel(score: number): CreditLevel {
  if (score >= 800) return '钻石'
  if (score >= 600) return '黄金'
  if (score >= 400) return '白银'
  return '青铜'
}

export const LEVEL_COLOR: Record<CreditLevel, string> = {
  钻石: '#8b5cf6',
  黄金: '#f59e0b',
  白银: '#94a3b8',
  青铜: '#b45309',
}
