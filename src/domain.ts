// ===== 校园帮 CampusPal · 领域模型 =====
// 核心原则：身份可核验、资金有状态、信用由客观履约事件构成（不做随意加减分公式）

export type CertStatus = 'none' | 'pending' | 'approved' | 'expired'

export type TaskKind = '快递代取' | '餐食代买' | '打印代取' | '校内送物' | '占座'

export type TaskStatus = 'open' | 'accepted' | 'delivered' | 'disputed' | 'done' | 'cancelled'

export interface User {
  id: string
  name: string
  avatar: string // 姓氏单字
  tag: string // 演示身份标签
  school: string
  studentId: string // 学号
  faculty: string // 学院
  major: string // 专业
  admitYear: string // 入学年份
  cert: CertStatus
  validUntil: string // 学生卡有效期
  graduate: string // 预计毕业日期
  // 客观履约记录（信用画像，非公式）
  completed: number // 完成单量
  onTime: number // 准时单量
  ratingCount: number // 评价数
  ratingSum: number // 评价总分
  responsibleCancel: number // 经核实的责任取消
  reviews: DeliveryReview[] // 收到的送货员评论
  blocked: string[] // 拉黑的用户 id 列表
}

export interface Event {
  text: string
  at: string
}

export interface Review {
  stars: number
  text: string
}

export interface DeliveryReview {
  from: string // 评论人 id
  fromName: string // 评论人姓名
  stars: number
  text: string
  date: string
}

export interface Report {
  id: string
  targetId: string // 被举报的送货员 id
  targetName: string
  fromId: string
  fromName: string
  reason: string
  date: string
  status: 'pending' | 'resolved'
}

export interface Task {
  id: string
  owner: string
  runner: string | null
  kind: TaskKind
  title: string
  from: string
  to: string
  fromLat: number
  fromLng: number
  toLat: number
  toLng: number
  fee: number // 跑腿报酬（分）
  budget: number // 代买商品预算（分）
  value: number // 物品申报价值（分）
  note: string
  due: string
  status: TaskStatus
  actual: number // 代买实付（分）
  proof: boolean
  dispute: string
  agreement: boolean // 发单者确认大额协议
  runnerAgreement: boolean // 接单者确认大额协议
  events: Event[]
  reviews: Record<string, Review>
}

export interface LedgerEntry {
  task: string
  user: string
  amount: number
  type: '跑腿收入' | '垫付款返还' | '预算差额退款' | '退款'
  at: string
}

export interface AppState {
  version: number
  now: string
  user: string // 当前演示身份
  users: User[]
  tasks: Task[]
  ledger: LedgerEntry[]
  reports: Report[]
  seq: number
}

// ===== 常量 =====
export const DAY = 86400000
export const LARGE_LIMIT = 50000 // 大额协议演示阈值：500 元
export const SCHOOL = '香港大学'
export const SCHOOL_EN = 'THE UNIVERSITY OF HONG KONG'

// 港大主校区地标（用于地图预设选点）
export const LANDMARKS = [
  { name: '主图书馆', lat: 22.2837, lng: 114.1376 },
  { name: '智华馆', lat: 22.2839, lng: 114.1368 },
  { name: '大学街', lat: 22.2843, lng: 114.1363 },
  { name: '何添堂食堂', lat: 22.2834, lng: 114.1380 },
  { name: '港铁香港大学站', lat: 22.2847, lng: 114.1354 },
  { name: '百周年校园', lat: 22.2831, lng: 114.1344 },
]

// ===== 基础工具 =====
export const time = (d: string) => new Date(d).getTime()
export const addDays = (d: string, n: number) => new Date(time(d) + DAY * n).toISOString()
export const money = (n: number) => (n / 100).toFixed(2)
export const closed = (t: Task) => ['done', 'cancelled'].includes(t.status)

// ===== 毕业清算 =====
export function graduation(u: User, now: string) {
  const days = Math.ceil((time(u.graduate) - time(now)) / DAY)
  return {
    days,
    stage: days < 0 ? '已毕业' : days <= 30 ? '准备毕业' : '在校',
    deadline: addDays(u.graduate, 7),
  }
}

// ===== 接单资格检查 =====
export function eligibility(u: User, now: string): string {
  if (u.id === 'admin') return '管理员不参与接单'
  if (u.cert !== 'approved') return '请先完成港大学生卡审核'
  if (time(now) >= time(u.validUntil)) return '学生卡已过期，请续期并重新审核'
  if (time(now) >= time(u.graduate)) return '已进入毕业清算期，暂停接新任务'
  return ''
}

// ===== 信用画像（客观履约事件，可解释）=====
export interface CreditProfile {
  completed: number
  onTimeRate: number | null // 百分比，记录不足为 null
  avgRating: number | null
  responsibleCancel: number
  level: CreditLevel
  levelLabel: string
}

export type CreditLevel = 'new' | 'bronze' | 'silver' | 'gold'

export function creditProfile(u: User): CreditProfile {
  const onTimeRate = u.completed ? Math.round((u.onTime / u.completed) * 100) : null
  const avgRating = u.ratingCount ? Math.round((u.ratingSum / u.ratingCount) * 10) / 10 : null
  const level = deriveLevel(u.completed, onTimeRate, avgRating)
  const labels: Record<CreditLevel, string> = {
    new: '新同学 · 信用积累中',
    bronze: '铜牌跑腿侠',
    silver: '银牌跑腿侠',
    gold: '金牌跑腿侠',
  }
  return { completed: u.completed, onTimeRate, avgRating, responsibleCancel: u.responsibleCancel, level, levelLabel: labels[level] }
}

// 信用等级：基于客观指标的可解释规则，非黑箱公式
function deriveLevel(completed: number, onTimeRate: number | null, avgRating: number | null): CreditLevel {
  if (completed >= 30 && (onTimeRate ?? 0) >= 95 && (avgRating ?? 0) >= 4.8) return 'gold'
  if (completed >= 15 && (onTimeRate ?? 0) >= 90 && (avgRating ?? 0) >= 4.5) return 'silver'
  if (completed >= 5 && (avgRating ?? 0) >= 4.0) return 'bronze'
  return 'new'
}

// ===== 种子数据 =====
export function seed(): AppState {
  const now = '2026-10-31T14:00:00+08:00'
  const base = {
    school: SCHOOL,
    cert: 'approved' as CertStatus,
    validUntil: '2027-04-30T23:59:59+08:00',
    graduate: '2027-06-30T23:59:59+08:00',
    completed: 0,
    onTime: 0,
    ratingCount: 0,
    ratingSum: 0,
    responsibleCancel: 0,
    reviews: [] as DeliveryReview[],
    blocked: [] as string[],
  }
  const users: User[] = [
    {
      ...base,
      id: 'lin',
      name: '林晚',
      avatar: '林',
      tag: '发布者',
      studentId: '3035123456',
      faculty: '工程学院',
      major: '计算机科学',
      admitYear: '2024',
      completed: 12,
      onTime: 12,
      ratingCount: 9,
      ratingSum: 44,
      reviews: [
        { from: 'chen', fromName: '陈默', stars: 5, text: '任务描述清晰，沟通顺畅，好相处的发布者！', date: '2026-10-27T15:00:00+08:00' },
        { from: 'zhou', fromName: '周扬', stars: 5, text: '感谢信任，合作愉快。', date: '2026-10-22T10:00:00+08:00' },
      ],
    },
    {
      ...base,
      id: 'chen',
      name: '陈默',
      avatar: '陈',
      tag: '接单者',
      studentId: '3035234567',
      faculty: '工程学院',
      major: '机械工程',
      admitYear: '2023',
      completed: 46,
      onTime: 45,
      ratingCount: 38,
      ratingSum: 186,
      reviews: [
        { from: 'lin', fromName: '林晚', stars: 5, text: '取件很快，包装完好，还主动拍了照，很靠谱！', date: '2026-10-28T12:00:00+08:00' },
        { from: 'xu', fromName: '许宁', stars: 5, text: '准时送到，沟通顺畅，五星好评。', date: '2026-10-25T18:30:00+08:00' },
        { from: 'zhou', fromName: '周扬', stars: 4, text: '态度很好，就是稍微晚了几分钟，总体满意。', date: '2026-10-20T14:10:00+08:00' },
      ],
    },
    { ...base, id: 'zhou', name: '周扬', avatar: '周', tag: '认证过期', studentId: '3035345678', faculty: '理学院', major: '物理学', admitYear: '2023', validUntil: '2026-10-30T23:59:59+08:00', completed: 7, onTime: 6, ratingCount: 5, ratingSum: 23 },
    {
      ...base,
      id: 'xu',
      name: '许宁',
      avatar: '许',
      tag: '即将毕业',
      studentId: '3035456789',
      faculty: '社会科学学院',
      major: '经济学',
      admitYear: '2022',
      graduate: '2026-11-20T23:59:59+08:00',
      completed: 3,
      onTime: 3,
      ratingCount: 2,
      ratingSum: 10,
      reviews: [
        { from: 'chen', fromName: '陈默', stars: 4, text: '很细心，就是地址稍微有点难找。', date: '2026-10-24T16:30:00+08:00' },
      ],
    },
    { ...base, id: 'admin', name: '校园管理员', avatar: '管', tag: '审核与申诉', studentId: '—', faculty: '教务处', major: '', admitYear: '', cert: 'approved', completed: 0 },
  ]

  // 港大地点 → 坐标
  const P: Record<string, [number, number]> = {
    港铁香港大学站: [22.2847, 114.1354],
    百周年校园: [22.2831, 114.1344],
    何添堂食堂: [22.2834, 114.1380],
    主图书馆: [22.2837, 114.1376],
    智华馆: [22.2839, 114.1368],
    大学街: [22.2843, 114.1363],
  }

  const rows: [string, string, TaskKind, string, string, string, number, number, number, string, string][] = [
    ['t1', 'lin', '快递代取', '帮取一个包裹，顺路到百周年校园', '港铁香港大学站快递柜', '百周年校园 3 楼', 400, 0, 0, '小包裹约 1kg，不用上楼，到楼下联系即可。', '16:30'],
    ['t2', 'lin', '餐食代买', '图书馆续命咖啡，冰美式一杯', '何添堂食堂咖啡店', '主图书馆一楼', 500, 3000, 0, '少冰不加糖，售罄请先联系我。', '16:00'],
    ['t3', 'xu', '打印代取', '论文打印，送到智华馆', '大学街打印店', '智华馆 2 楼', 600, 0, 0, '已在线付打印费，取件报尾号 0621。', '17:00'],
    ['t4', 'lin', '校内送物', '落在教室的教材，帮忙带回来', '主图书馆 4 楼', '百周年校园大厅', 350, 0, 0, '蓝色封面统计学教材，送到大厅即可。', '18:00'],
    ['t5', 'lin', '餐食代买', '代买绘图板，需确认大额协议', '大学街数码店', '智华馆会客区', 1200, 68000, 70000, '核对型号与封装，保留小票，双方确认协议后接单。', '19:00'],
    ['t6', 'chen', '快递代取', '两本新书，找顺路的同学', '港铁香港大学站', '主图书馆入口', 450, 0, 0, '已到站，小件可手提。', '17:30'],
  ]

  const coordOf = (name: string): [number, number] => {
    for (const k of Object.keys(P)) if (name.includes(k)) return P[k]
    return [22.2840, 114.1363] // 默认港大主校区中心
  }

  const tasks: Task[] = rows.map((r) => {
    const [fromLat, fromLng] = coordOf(r[4])
    const [toLat, toLng] = coordOf(r[5])
    return {
      id: r[0],
      owner: r[1],
      runner: null,
      kind: r[2],
      title: r[3],
      from: r[4],
      to: r[5],
      fromLat,
      fromLng,
      toLat,
      toLng,
      fee: r[6],
      budget: r[7],
      value: r[8],
      note: r[9],
      due: `2026-10-31T${r[10]}:00+08:00`,
      status: 'open',
      actual: 0,
      proof: false,
      dispute: '',
      agreement: r[7] >= LARGE_LIMIT,
      runnerAgreement: false,
      events: [{ text: '发布者已模拟支付，资金待结算', at: now }],
      reviews: {},
    }
  })

  const reports: Report[] = [
    { id: 'r1', targetId: 'zhou', targetName: '周扬', fromId: 'lin', fromName: '林晚', reason: '接单后未按时交付，多次联系不上', date: '2026-10-29T09:00:00+08:00', status: 'pending' },
    { id: 'r2', targetId: 'xu', targetName: '许宁', fromId: 'chen', fromName: '陈默', reason: '交付的物品有轻微破损，包装不严', date: '2026-10-26T14:20:00+08:00', status: 'resolved' },
  ]

  return { version: 1, now, user: 'chen', users, tasks, ledger: [], reports, seq: 7 }
}

// ===== 命令执行（状态机 + 资金守恒）=====
function requireThat(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new Error(msg)
}

export function act(s: AppState, command: string, id: string, data: Record<string, any> = {}) {
  const u = s.users.find((x) => x.id === s.user)!
  const t = s.tasks.find((x) => x.id === id)!
  const event = (text: string) => t.events.push({ text, at: s.now })

  if (command === 'publish') {
    requireThat(!eligibility(u, s.now), eligibility(u, s.now))
    const fee = Number(data.fee)
    const budget = Number(data.budget)
    const value = Number(data.value)
    requireThat(Number.isSafeInteger(fee) && fee >= 100 && fee <= 100000, '跑腿报酬需在 1 至 1000 元之间')
    requireThat(Number.isSafeInteger(budget) && budget >= 0 && budget <= 1000000, '代买预算需在 0 至 10000 元之间')
    requireThat(Number.isSafeInteger(value) && value >= 0 && value <= 1000000, '请填写合理物品价值')
    requireThat(['快递代取', '餐食代买', '打印代取', '校内送物', '占座'].includes(data.kind), '请选择任务类型')
    requireThat(data.kind === '餐食代买' || budget === 0, '非代买任务无需商品预算')
    requireThat(data.kind !== '餐食代买' || budget > 0, '代买任务需要商品预算')
    requireThat(time(data.due) > time(s.now) && time(data.due) <= time(u.graduate), '截止时间应晚于当前演示时间、早于毕业时间')
    for (const k of ['title', 'from', 'to']) requireThat(String(data[k] || '').trim().length > 0, '请填写完整任务信息')
    requireThat(Math.max(value, budget) < LARGE_LIMIT || data.agreement, '大额物品需先阅读并确认风险与责任协议')
    const n: Task = {
      id: 't' + s.seq++,
      owner: u.id,
      runner: null,
      kind: data.kind,
      title: data.title.slice(0, 60),
      from: data.from.slice(0, 60),
      to: data.to.slice(0, 60),
      fromLat: Number(data.fromLat) || 22.2840,
      fromLng: Number(data.fromLng) || 114.1363,
      toLat: Number(data.toLat) || 22.2840,
      toLng: Number(data.toLng) || 114.1363,
      note: String(data.note || '').slice(0, 400),
      due: data.due,
      fee,
      budget,
      value,
      actual: 0,
      proof: false,
      dispute: '',
      agreement: !!data.agreement,
      runnerAgreement: false,
      status: 'open',
      events: [{ text: '发布者已模拟支付，资金待结算', at: s.now }],
      reviews: {},
    }
    s.tasks.unshift(n)
    return n
  }

  if (command === 'submitCert') {
    requireThat(u.id !== 'admin', '管理员不能提交')
    requireThat(data.card, '请确认港大学生卡信息')
    u.cert = 'pending'
    return
  }

  if (command === 'approveCert') {
    requireThat(u.id === 'admin', '需要管理员审核')
    const target = s.users.find((x) => x.id === id)
    requireThat(target?.cert === 'pending', '仅可审核待审核申请')
    target!.cert = 'approved'
    target!.validUntil = addDays(s.now, 180)
    return
  }

  // ===== 对送货员的评论 / 举报 / 拉黑 =====
  if (command === 'reviewDeliverer') {
    const target = s.users.find((x) => x.id === id)
    requireThat(target, '送货员不存在')
    requireThat(target.id !== u.id, '不能评论自己')
    requireThat([1, 2, 3, 4, 5].includes(Number(data.stars)), '请选择 1 至 5 星')
    target.reviews.push({
      from: u.id,
      fromName: u.name,
      stars: Number(data.stars),
      text: String(data.text || '').slice(0, 200),
      date: s.now,
    })
    target.ratingCount += 1
    target.ratingSum += Number(data.stars)
    return
  }

  if (command === 'reportDeliverer') {
    const target = s.users.find((x) => x.id === id)
    requireThat(target, '送货员不存在')
    requireThat(target.id !== u.id, '不能举报自己')
    requireThat(String(data.reason || '').trim().length > 0, '请填写举报原因')
    s.reports.push({
      id: 'r' + s.seq++,
      targetId: target.id,
      targetName: target.name,
      fromId: u.id,
      fromName: u.name,
      reason: String(data.reason).slice(0, 300),
      date: s.now,
      status: 'pending',
    })
    return
  }

  if (command === 'blockDeliverer') {
    const target = s.users.find((x) => x.id === id)
    requireThat(target, '送货员不存在')
    requireThat(target.id !== u.id, '不能拉黑自己')
    const idx = u.blocked.indexOf(target.id)
    if (idx >= 0) u.blocked.splice(idx, 1)
    else u.blocked.push(target.id)
    return
  }

  if (command === 'resolveReport') {
    requireThat(u.id === 'admin', '需要管理员处理')
    const report = s.reports.find((x) => x.id === id)
    requireThat(report, '举报不存在')
    report.status = 'resolved'
    return
  }

  const member = t.owner === u.id || t.runner === u.id

  if (command === 'accept') {
    requireThat(t.status === 'open', '任务已被接走或已结束')
    requireThat(t.owner !== u.id, '不能接自己的订单')
    requireThat(!eligibility(u, s.now), eligibility(u, s.now))
    requireThat(s.users.find((x) => x.id === t.owner)!.school === u.school, '只能接本校任务')
    requireThat(time(t.due) > time(s.now), '任务已超过截止时间')
    requireThat(Math.max(t.value, t.budget) < LARGE_LIMIT || data.agreement, '大额任务需双方确认协议')
    t.runner = u.id
    t.status = 'accepted'
    t.runnerAgreement = !!data.agreement
    event('接单成功，进入履约中')
  } else if (command === 'deliver') {
    requireThat(t.runner === u.id && t.status === 'accepted', '仅接单者可提交履约中的订单')
    const actual = t.budget ? Number(data.actual) : 0
    requireThat(Number.isSafeInteger(actual) && actual >= 0 && actual <= t.budget, '实际商品款不能超过已支付预算')
    requireThat(data.proof, '请先添加交付凭证')
    t.actual = actual
    t.proof = true
    t.status = 'delivered'
    event('已提交交付凭证，等待发布者确认')
  } else if (command === 'dispute') {
    requireThat(member && ['accepted', 'delivered'].includes(t.status), '此订单不能发起申诉')
    requireThat(String(data.reason || '').trim().length > 0, '请填写纠纷说明')
    t.status = 'disputed'
    t.dispute = String(data.reason).slice(0, 500)
    event('已发起申诉，资金暂停结算')
  } else if (command === 'cancel') {
    requireThat(t.owner === u.id && t.status === 'open', '仅未接单的发布者可直接取消')
    t.status = 'cancelled'
    s.ledger.push({ task: t.id, user: t.owner, amount: t.fee + t.budget, type: '退款', at: s.now })
    event('未接单取消，模拟预付款已全额退回')
  } else if (command === 'confirm' || command === 'resolvePay') {
    requireThat(
      command === 'confirm' ? u.id === t.owner && t.status === 'delivered' : u.id === 'admin' && t.status === 'disputed' && t.proof,
      '需要收货确认或有交付凭证的管理员裁决',
    )
    if (command === 'resolvePay') requireThat(String(data.reason || '').trim().length > 0, '裁决需要填写理由')
    const actual = t.actual || 0
    requireThat(actual <= t.budget, '商品金额异常')
    t.status = 'done'
    // 资金守恒：接单者得报酬 + 垫付款返还；发单者得预算差额退款
    s.ledger.push({ task: t.id, user: t.runner!, amount: t.fee, type: '跑腿收入', at: s.now })
    if (actual) s.ledger.push({ task: t.id, user: t.runner!, amount: actual, type: '垫付款返还', at: s.now })
    if (t.budget > actual) s.ledger.push({ task: t.id, user: t.owner, amount: t.budget - actual, type: '预算差额退款', at: s.now })
    event(command === 'confirm' ? '发布者确认收货，模拟结算完成' : '管理员裁决结算：' + String(data.reason).slice(0, 300))
  } else if (command === 'resolveRefund') {
    requireThat(u.id === 'admin' && t.status === 'disputed', '需要管理员处理申诉')
    requireThat(String(data.reason || '').trim().length > 0, '裁决需要填写理由')
    t.status = 'cancelled'
    s.ledger.push({ task: t.id, user: t.owner, amount: t.fee + t.budget, type: '退款', at: s.now })
    event('管理员裁决全额退款：' + String(data.reason).slice(0, 300))
  } else if (command === 'review') {
    requireThat(member && t.status === 'done' && !t.reviews[u.id], '仅完成订单可评价一次')
    requireThat([1, 2, 3, 4, 5].includes(Number(data.stars)), '请选择 1 至 5 星')
    t.reviews[u.id] = { stars: Number(data.stars), text: String(data.text || '').slice(0, 200) }
    // 客观履约记录：评价计入被评者的信用画像
    const target = u.id === t.owner ? s.users.find((x) => x.id === t.runner)! : s.users.find((x) => x.id === t.owner)!
    target.ratingCount += 1
    target.ratingSum += Number(data.stars)
    event('已提交评价，双方评价后公开')
  } else {
    throw new Error('不支持的操作')
  }
  return t
}
