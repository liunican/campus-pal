import { Fragment, useMemo, useState } from 'react'
import type { AppState, Task, TaskStatus, User } from './domain'
import {
  LARGE_LIMIT,
  SCHOOL,
  closed,
  creditProfile,
  eligibility,
  graduation,
  money,
  time,
} from './domain'
import { useAppStore } from './store'
import { Icon, KIND_ICON } from './icons'
import './App.css'

type View = 'hall' | 'publish' | 'orders' | 'identity' | 'wallet' | 'admin'

const NAV: { key: View; label: string; icon: string; desktop?: boolean }[] = [
  { key: 'hall', label: '任务大厅', icon: 'grid' },
  { key: 'publish', label: '发布任务', icon: 'plus' },
  { key: 'orders', label: '我的订单', icon: 'list' },
  { key: 'identity', label: '身份认证', icon: 'shield' },
  { key: 'wallet', label: '信用账户', icon: 'wallet', desktop: true },
]

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: '等待接单',
  accepted: '履约中',
  delivered: '待确认收货',
  disputed: '纠纷处理中',
  done: '已完成',
  cancelled: '已退款',
}

export default function App() {
  const { state, currentUser, toast, dispatch, setUser, setNow, reset } = useAppStore()
  const [view, setView] = useState<View>('hall')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [modal, setModal] = useState<React.ReactNode | null>(null)

  const detail = useMemo(() => state.tasks.find((t) => t.id === detailId) ?? null, [state.tasks, detailId])
  const g = graduation(currentUser, state.now)

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="shield" size={24} />
          </span>
          <div>
            <strong>校园帮</strong>
            <small>CAMPUSPAL</small>
          </div>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <a
              key={n.key}
              className={'nav-item' + (view === n.key ? ' active' : '') + (n.desktop ? ' desktop-only' : '')}
              onClick={() => setView(n.key)}
            >
              <Icon name={n.icon} />
              <span>{n.label}</span>
            </a>
          ))}
          <div className="nav-label">校园服务</div>
          <a className={'nav-item desktop-only' + (view === 'admin' ? ' active' : '')} onClick={() => setView('admin')}>
            <Icon name="user" />
            <span>平台工作台</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <div className="tiny-card">
            <Icon name="shield" size={18} />
            <strong>信用为凭，同窗互助</strong>
            双证核验 · 履约留痕 · 确认后结算
          </div>
          <div className="sidebar-footer">校园帮 CAMPUSPAL · 产品交互雏形</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="school">
            <Icon name="pin" size={18} /> {SCHOOL} <span>演示校园</span>
          </div>
          <div className="profile">
            <a className="muted" onClick={() => setView('wallet')}>信用账户</a>
            <div className="avatar">{currentUser.avatar}</div>
            <select value={state.user} onChange={(e) => setUser(e.target.value)} aria-label="切换演示身份">
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {u.tag}</option>
              ))}
            </select>
          </div>
        </header>

        <div className="demo-strip">
          <span>交互演示 · 合成身份 / 模拟资金 / 仅保存在当前浏览器</span>
          <span className="clock">演示时间 {fmtTime(state.now)}</span>
          <button onClick={() => setModal(guideModal())}>体验指南 ↗</button>
        </div>

        <main className="content">
          {currentUser.id !== 'admin' && g.days <= 30 && (
            <div className="notice">
              <Icon name="grad" size={17} /> {g.stage} · {fmtDay(currentUser.graduate)} 毕业，请于 {fmtDay(g.deadline)} 前处理未结算订单。
              <b> 查看清算 →</b>
            </div>
          )}

          {view === 'hall' && <Hall state={state} currentUser={currentUser} onOpen={setDetailId} onView={setView} />}
          {view === 'publish' && <Publish state={state} currentUser={currentUser} dispatch={dispatch} onOpen={setDetailId} onView={setView} setModal={setModal} />}
          {view === 'orders' && <Orders state={state} currentUser={currentUser} onOpen={setDetailId} />}
          {view === 'identity' && <Identity state={state} currentUser={currentUser} dispatch={dispatch} onView={setView} />}
          {view === 'wallet' && <Wallet state={state} currentUser={currentUser} onOpen={setDetailId} />}
          {view === 'admin' && <Admin state={state} dispatch={dispatch} setNow={setNow} onOpen={setDetailId} setModal={setModal} />}

          <footer className="page-footer">
            信用为凭，同窗互助 · CAMPUSPAL © 2026 · <button onClick={() => setModal(resetModal(reset))}>重置演示</button>
          </footer>
        </main>
      </div>

      <nav className="tabbar">
        {NAV.filter((n) => !n.desktop).map((n) => (
          <button key={n.key} className={'tab' + (view === n.key ? ' active' : '')} onClick={() => setView(n.key)}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      {detail && (
        <TaskDetail
          task={detail}
          state={state}
          currentUser={currentUser}
          dispatch={dispatch}
          setModal={setModal}
          onClose={() => setDetailId(null)}
          onView={setView}
        />
      )}

      {modal && (
        <div className="overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>{modal}</div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

// ===== 工具 =====
const fmtTime = (d: string) => new Date(d).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
const fmtDay = (d: string) => new Date(d).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
const who = (state: AppState, id: string) => state.users.find((u) => u.id === id)!

function pageHead(kicker: string, title: string, sub: string, action?: React.ReactNode) {
  return (
    <div className="page-head">
      <div>
        <div className="eyebrow">{kicker}</div>
        <h1>{title}</h1>
        <div className="muted">{sub}</div>
      </div>
      {action}
    </div>
  )
}

function Badge({ children, tone = '' }: { children: React.ReactNode; tone?: string }) {
  return <span className={'badge ' + tone}>{children}</span>
}

function Btn({ children, onClick, kind = '', disabled = false, type = 'button' }: { children: React.ReactNode; onClick?: () => void; kind?: string; disabled?: boolean; type?: 'button' | 'submit' }) {
  return (
    <button type={type} className={'btn ' + kind} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// ===== 大厅 =====
function Hall({ state, onOpen, onView }: any) {
  const [filter, setFilter] = useState<string>('全部')
  const [query, setQuery] = useState('')
  const open = state.tasks.filter((t: Task) => t.status === 'open' && time(t.due) > time(state.now))
  const mine = state.tasks.filter((t: Task) => (t.owner === state.user || t.runner === state.user) && !closed(t) && t.status !== 'open')
  const done = state.tasks.filter((t: Task) => (t.owner === state.user || t.runner === state.user) && t.status === 'done')
  const shown = open.filter((t: Task) => (filter === '全部' || t.kind === filter) && `${t.title}${t.from}${t.to}`.includes(query))

  return (
    <>
      {pageHead('A LITTLE HELP, A BETTER CAMPUS', '今天，也顺路帮个忙。', '从驿站到宿舍，从食堂到自习室，让同校的善意顺路抵达。', <Btn onClick={() => onView('publish')}><Icon name="plus" size={17} /> 发布任务</Btn>)}

      <section className="hero">
        <div>
          <span className="hero-tag">同校互助 · 安心托付</span>
          <h2>你的举手之劳，<br />是另一个人的刚刚好。</h2>
          <p>发一个小任务，遇见顺路的同学。<br />身份有核验，交付有记录，每一份付出都有回应。</p>
          <div className="hero-trust">
            <span><Icon name="shield" size={14} /> 双证核验</span>
            <span><Icon name="wallet" size={14} /> 先付款后结算</span>
            <span><Icon name="check" size={14} /> 信用可积累</span>
          </div>
        </div>
        <HeroArt />
      </section>

      <div className="stats">
        {stat('正在等待帮助', open.length, 'box')}
        {stat('我的进行中订单', mine.length, 'clock')}
        {stat('我的已完成订单', done.length, 'check')}
      </div>

      <div className="workspace">
        <section>
          <div className="section-header">
            <h2>发现顺路任务 <small>全部来自演示校园</small></h2>
            <label className="search"><Icon name="search" size={15} /><input placeholder="搜索任务、地点" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          </div>
          <div className="filters">
            {['全部', '快递代取', '餐食代买', '打印代取', '校内送物', '占座'].map((c) => (
              <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="cards">
            {shown.map((t: Task) => <TaskCard key={t.id} task={t} state={state} onOpen={onOpen} />)}
            {shown.length === 0 && empty('暂时没有匹配的任务', '换个分类，或发布你的第一份校园小任务。')}
          </div>
        </section>
        <aside className="aside">
          <div className="panel">
            <h3>每一次互助，都有保障</h3>
            <div className="trust-list">
              <div className="trust-item"><Icon name="shield" /><div><strong>同校身份，双重核验</strong><p>学生证 + 可查验学籍证明<br />报告过期暂停接新单</p></div></div>
              <div className="trust-item"><Icon name="wallet" /><div><strong>资金有状态，付出有回报</strong><p>发单预付，交付留证<br />确认收货后结算给接单者</p></div></div>
              <div className="trust-item"><Icon name="chat" /><div><strong>遇到问题，平台来协调</strong><p>纠纷期间暂停结算<br />双方证据留存、处理可追溯</p></div></div>
            </div>
          </div>
          <div className="callout">
            <h3><Icon name="grad" size={18} /> 信用，由履约积累</h3>
            <p>不做随意的加减分公式。你的信用画像，来自真实完成的每一单、每一次准时交付、每一条评价。</p>
            <a onClick={() => onView('wallet')}>查看信用画像 <Icon name="arrow" size={14} /></a>
          </div>
        </aside>
      </div>
    </>
  )
}

function stat(label: string, value: React.ReactNode, icon: string) {
  return (
    <div className="stat">
      <div><span className="muted">{label}</span><strong>{value}</strong></div>
      <div className="stat-icon"><Icon name={icon} size={23} /></div>
    </div>
  )
}

function empty(title: string, sub: string) {
  return <div className="empty"><h3>{title}</h3><p>{sub}</p></div>
}

function TaskCard({ task, state, onOpen }: { task: Task; state: AppState; onOpen: (id: string) => void }) {
  const owner = who(state, task.owner)
  return (
    <article className="task-card" onClick={() => onOpen(task.id)}>
      <div className="card-top">
        <span className="category"><i><Icon name={KIND_ICON[task.kind]} size={18} /></i>{task.kind}</span>
        <span className="reward"><small>¥</small>{money(task.fee)}</span>
      </div>
      <h3>{task.title}</h3>
      <div className="route">
        <span><i className="dot" />{task.from}</span>
        <span><i className="dot end" />{task.to}</span>
      </div>
      <div className="tags">
        <Badge>{STATUS_LABEL[task.status]}</Badge>
        {task.budget ? <Badge tone="amber">商品预算 ¥{money(task.budget)}</Badge> : <Badge>小件顺路</Badge>}
        {Math.max(task.value, task.budget) >= LARGE_LIMIT && <Badge tone="amber">大额协议</Badge>}
      </div>
      <div className="card-footer">
        <span className="person"><span className="avatar">{owner.avatar}</span>{owner.name}<br />{fmtTime(task.due)} 前</span>
        <span className="arrow-button">{task.status === 'open' ? '查看任务' : '订单详情'} <Icon name="arrow" size={15} /></span>
      </div>
    </article>
  )
}

// ===== 发布 =====
function Publish({ state, currentUser, dispatch, onOpen, onView, setModal }: any) {
  const err = eligibility(currentUser, state.now)
  return (
    <>
      {pageHead('POST A LITTLE HELP', '把小事，交给顺路的同学。', '信息写清楚，沟通少一点，互助更安心。')}
      {err && <div className="notice">{err}。<a onClick={() => onView('identity')}>前往认证 →</a></div>}
      <form className="publish-form" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); const n = dispatch('publish', '', { kind: d.get('kind'), title: d.get('title'), from: d.get('from'), to: d.get('to'), fee: Math.round(Number(d.get('fee')) * 100), budget: Math.round(Number(d.get('budget')) * 100), value: Math.round(Number(d.get('value')) * 100), due: d.get('due') + ':00+08:00', note: d.get('note'), agreement: !!d.get('agreement') }); if (n) onOpen('t' + (state.seq - 1)); }}>
        <div className="form-layout">
          <div className="panel">
            <h3>这次想找什么帮助？</h3>
            <p className="muted">提交后将模拟支付并发布到大厅。请只填写虚构的演示信息。</p>
            <div className="form-grid">
              <label className="field full">任务标题<input name="title" required maxLength={60} placeholder="例如：帮取一个小包裹，送到南苑楼下" /></label>
              <label className="field">任务类型<select name="kind">{['快递代取', '餐食代买', '打印代取', '校内送物', '占座'].map((k) => <option key={k}>{k}</option>)}</select></label>
              <label className="field">截止时间<input name="due" type="datetime-local" defaultValue={state.now.slice(0, 10) + 'T18:00'} required /></label>
              <label className="field">从哪里取<input name="from" required maxLength={60} placeholder="菜鸟驿站" /></label>
              <label className="field">送到哪里<input name="to" required maxLength={60} placeholder="南苑 3 栋楼下（公开地点）" /></label>
              <label className="field">跑腿报酬（元）<input name="fee" type="number" step="0.01" min="1" max="1000" defaultValue="5" required /></label>
              <label className="field">物品申报价值（元）<input name="value" type="number" step="0.01" min="0" max="10000" defaultValue="30" required /></label>
              <label className="field full">代买商品预算（元，其他任务填 0）<input name="budget" type="number" step="0.01" min="0" max="10000" defaultValue="0" required /></label>
              <label className="field full">补充说明<textarea name="note" maxLength={400} placeholder="物品大小、是否上楼、商品替换要求等。请勿填写真实宿舍号或取件码。" /></label>
              <label className="check field full"><input type="checkbox" name="agreement" /><span>如涉及大额物品（≥¥500），我已阅读并确认 <button type="button" onClick={() => setModal(agreementModal())}>风险与责任协议</button>。双方确认后方可接单。</span></label>
            </div>
          </div>
          <aside>
            <div className="panel">
              <h3>预付款明细</h3>
              <div className="summary-row"><span>跑腿报酬 + 商品预算</span><b>¥{money(0)}</b></div>
              <div className="guide">你的预付款先保留为待结算资金。收到物品并确认后，再结算给接单同学。</div>
              <Btn disabled={!!err} type="submit">模拟付款并发布 <Icon name="arrow" size={16} /></Btn>
              <p className="note">无真实扣款。代买者先垫付商品款，完成后返还；差额退回发单者。</p>
            </div>
            <div className="callout">
              <h3>小提示</h3>
              <p>地点只填写公开交接点。约定清楚截止时间、物品价值和交付方式，减少不必要的纠纷。</p>
            </div>
          </aside>
        </div>
      </form>
    </>
  )
}

// ===== 订单 =====
function Orders({ state, onOpen }: any) {
  const [filter, setFilter] = useState('全部')
  const ts = state.tasks.filter((t: Task) => state.user === 'admin' || t.owner === state.user || t.runner === state.user)
    .filter((t: Task) => filter === '全部' || (filter === '我发布的' ? t.owner === state.user : filter === '我接到的' ? t.runner === state.user : filter === '进行中' ? !closed(t) && t.status !== 'open' : filter === '已完成' ? t.status === 'done' : closed(t)))
  return (
    <>
      {pageHead('MY LITTLE MISSIONS', '每一份托付，都有进度。', '接单、交付、收货与结算，都记录在同一张订单中。', <Btn kind="secondary" onClick={() => {}}><Icon name="wallet" size={17} /> 我的账户</Btn>)}
      <div className="filters">
        {['全部', '我发布的', '我接到的', '进行中', '已完成', '已结束'].map((c) => (
          <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>
      <div className="cards wide-cards">
        {ts.map((t: Task) => <TaskCard key={t.id} task={t} state={state} onOpen={onOpen} />)}
        {ts.length === 0 && empty('这里还没有订单', '去大厅接一份顺路任务，或发布自己的需求。')}
      </div>
    </>
  )
}

// ===== 认证 =====
function Identity({ state, currentUser, dispatch, onView }: any) {
  const err = eligibility(currentUser, state.now)
  return (
    <>
      {pageHead('VERIFIED ON CAMPUS', '先认识，再放心托付。', '学生证 + 可查验学籍证明，双重核验你的同校身份。')}
      <div className={'notice ' + (!err ? 'green' : '')}>{!err ? '双证认证有效 · 可以接单' : err}。报告过期不扣信用，已有订单和资金仍可处理。</div>
      <div className="two-col">
        <div className="cert-card"><Icon name="user" size={28} /><h3>01 / 学生证</h3><p>姓名、学校、学号信息一致<br />本页只使用合成材料，不接收真实证件。</p><Badge>{currentUser.cert === 'pending' ? '待审核' : '合成学生证示例'}</Badge></div>
        <div className="cert-card"><Icon name="shield" size={28} /><h3>02 / 可查验学籍证明</h3><p>有效期至 {fmtDay(currentUser.validUntil)}<br />真实业务需通过官方查验渠道核对。</p><Badge tone={time(state.now) >= time(currentUser.validUntil) ? 'red' : ''}>{time(state.now) >= time(currentUser.validUntil) ? '报告已过期' : '报告在有效期内'}</Badge></div>
      </div>
      <div className="panel">
        <h3>提交或更新认证</h3>
        <p className="muted">体验流程：选择两份合成材料 → 提交 → 切换管理员审核 → 恢复接单。</p>
        <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('submitCert', '', { card: !!d.get('card'), report: !!d.get('report') }); }}>
          <label className="check"><input type="checkbox" name="card" required />选择合成学生证：{currentUser.name} / {SCHOOL}</label>
          <label className="check"><input type="checkbox" name="report" required />选择可查验学籍报告示例：在籍 / 有效期延长 180 天</label>
          <div className="actions">
            <Btn disabled={currentUser.cert === 'pending'}>{currentUser.cert === 'pending' ? '已提交，等待管理员审核' : '提交双证示例'}</Btn>
            <Btn kind="secondary" onClick={() => onView('orders')}>处理已有订单</Btn>
          </div>
        </form>
      </div>
    </>
  )
}

// ===== 信用账户 =====
function Wallet({ state, currentUser, onOpen }: any) {
  const cp = creditProfile(currentUser)
  const ledger = state.ledger.filter((l: any) => l.user === currentUser.id)
  const earned = ledger.filter((l: any) => l.type === '跑腿收入').reduce((a: number, l: any) => a + l.amount, 0)
  const returned = ledger.filter((l: any) => l.type === '垫付款返还').reduce((a: number, l: any) => a + l.amount, 0)
  return (
    <>
      {pageHead('TRUST GROWS WITH EVERY TASK', '靠谱，会被看见。', '每一笔履约与资金变动都有记录，信用由真实完成的任务积累。')}
      <div className="stats">
        {stat('累计跑腿收入', money(earned), 'wallet')}
        {stat('已完成接单', cp.completed, 'check')}
        {stat('已返还垫付款', money(returned), 'wallet')}
      </div>
      <div className="two-col">
        <div className="panel">
          <h3>我的信用画像</h3>
          <div className="summary-row"><span>完成接单</span><b>{cp.completed} 单</b></div>
          <div className="summary-row"><span>准时率</span><b>{cp.onTimeRate === null ? '记录不足' : cp.onTimeRate + '%（' + currentUser.onTime + '/' + currentUser.completed + '）'}</b></div>
          <div className="summary-row"><span>平均评分</span><b>{cp.avgRating === null ? '暂无评价' : cp.avgRating + ' 星（' + currentUser.ratingCount + ' 条）'}</b></div>
          <div className="summary-row"><span>信用阶段</span><b>{cp.levelLabel}</b></div>
          <p className="note">认证过期不扣分；申诉不直接认定违约。信用由客观履约事件构成，不做随意加减分。</p>
        </div>
        <div className="callout">
          <h3>你付出的时间，值得被尊重</h3>
          <p>确认收货后记入跑腿收入。代买垫付款返还单独列示，不把商品款算成你的收益。</p>
          <p>雏形不接入真实提现，所有金额均为模拟账务。</p>
        </div>
      </div>
      <div className="panel">
        <h3>账户流水 <span className="muted">仅当前演示身份</span></h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>订单</th><th>变动类型</th><th>金额</th><th>时间</th></tr></thead>
            <tbody>
              {ledger.slice().reverse().map((l: any) => (
                <tr key={l.task + l.at}><td><a onClick={() => onOpen(l.task)}>{l.task.toUpperCase()} ↗</a></td><td>{l.type}</td><td>+ ¥{money(l.amount)}</td><td>{fmtTime(l.at)}</td></tr>
              ))}
              {ledger.length === 0 && <tr><td colSpan={4}>完成一笔订单后，这里会显示模拟结算与退款流水。</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ===== 管理端 =====
function Admin({ state, dispatch, setNow, onOpen }: any) {
  if (state.user !== 'admin') {
    return (
      <>
        {pageHead('CAMPUS SUPPORT', '平台工作台', '审核身份、协调纠纷，让每份托付有回应。')}
        <div className="panel">
          <h3>切换管理员演示身份</h3>
          <p className="muted">当前为学生身份。真实业务会由服务端控制权限；此雏形提供角色切换以便体验。</p>
          <Btn onClick={() => dispatch('noop', '')}>切换为校园管理员</Btn>
        </div>
      </>
    )
  }
  const pending = state.users.filter((u: User) => u.cert === 'pending')
  const disputes = state.tasks.filter((t: Task) => t.status === 'disputed')
  return (
    <>
      {pageHead('CAMPUS SUPPORT', '每一份信任，都认真回应。', '审核与裁决均为演示操作，不会查验真实身份或移动真实资金。')}
      <div className="panel">
        <h3>场景时钟</h3>
        <form className="actions" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); setNow(String(d.get('date'))); }}>
          <label className="field">演示日期<input type="date" name="date" defaultValue={state.now.slice(0, 10)} required /></label>
          <Btn kind="secondary">更新演示日期</Btn>
        </form>
        <p className="note">11 月 20 日为许同学的毕业日期；11 月 28 日可查看超过毕业后 7 天的未结算订单。</p>
      </div>
      <div className="panel">
        <h3>待审核认证 <span className="count">{pending.length}</span></h3>
        {pending.map((u: User) => (
          <div key={u.id} className="summary-row"><div><b>{u.name}</b><p className="muted">两份合成材料一致 · {SCHOOL} · 在籍示例</p></div><Btn onClick={() => dispatch('approveCert', u.id)}>审核通过</Btn></div>
        ))}
        {pending.length === 0 && <p className="muted">没有待审核申请。可先切换「周同学」提交续期材料示例。</p>}
      </div>
      <div className="panel">
        <h3>待处理纠纷 <span className="count">{disputes.length}</span></h3>
        {disputes.map((t: Task) => (
          <div key={t.id} className="summary-row"><div><a onClick={() => onOpen(t.id)}><b>{t.title} ↗</b></a><p className="muted">{t.dispute}</p></div><Btn onClick={() => { onOpen(t.id); }}>查看与裁决</Btn></div>
        ))}
        {disputes.length === 0 && <p className="muted">当前没有纠纷。订单参与者可在履约中或待收货阶段发起申诉。</p>}
      </div>
    </>
  )
}

// ===== 任务详情（modal） =====
function TaskDetail({ task, state, currentUser, dispatch, setModal, onClose, onView }: any) {
  const owner = who(state, task.owner)
  const runner = task.runner ? who(state, task.runner) : null
  const isOwner = currentUser.id === task.owner
  const isRunner = currentUser.id === task.runner
  const member = isOwner || isRunner || currentUser.id === 'admin'
  const err = eligibility(currentUser, state.now)
  const full = Math.max(task.value, task.budget) >= LARGE_LIMIT
  const steps = ['已预付', '已接单', '已交付', '已结算']
  const idx = { open: 0, accepted: 1, delivered: 2, done: 3, disputed: 2, cancelled: 0 }[task.status as TaskStatus]

  let actions: React.ReactNode = null
  if (task.status === 'open') actions = isOwner
    ? <Btn kind="secondary" onClick={() => setModal(confirmModal('取消这份未接单任务？', `¥${money(task.fee + task.budget)} 模拟预付款将全部退回。`, () => dispatch('cancel', task.id)))}>取消任务并退款</Btn>
    : currentUser.id === 'admin' ? null : (err ? <div className="notice">{err} · <a onClick={onView ? () => { onClose(); onView('identity'); } : undefined}>去认证</a></div> : <Btn onClick={() => setModal(acceptModal(task, dispatch))}>我来帮忙 · 接下任务</Btn>)
  if (task.status === 'accepted' && isRunner) actions = <Btn onClick={() => setModal(deliverModal(task, dispatch))}>提交交付凭证</Btn>
  if (task.status === 'delivered' && isOwner) actions = <Btn onClick={() => setModal(confirmModal('确认收到物品并结算？', `接单者跑腿收入 ¥${money(task.fee)} · 返还垫付款 ¥${money(task.actual)} · 退回预算差额 ¥${money(task.budget - task.actual)}`, () => dispatch('confirm', task.id)))}>确认收货并结算</Btn>
  if (['accepted', 'delivered'].includes(task.status) && (isOwner || isRunner)) actions = <Btn kind="secondary" onClick={() => setModal(disputeModal(task, dispatch))}>遇到问题 · 发起申诉</Btn>
  if (task.status === 'disputed' && currentUser.id === 'admin') actions = <Btn onClick={() => setModal(resolveModal(task, dispatch))}>处理纠纷</Btn>
  if (task.status === 'done' && (isOwner || isRunner) && !task.reviews[currentUser.id]) actions = <Btn kind="soft" onClick={() => setModal(reviewModal(task, dispatch))}>评价这次互助</Btn>

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose}>×</button>
        {pageHead('TASK / ' + task.id.toUpperCase(), task.title, `${task.kind} · ${owner.name}发布 · 截止 ${fmtTime(task.due)}`, <Badge tone={task.status === 'disputed' ? 'red' : ''}>{STATUS_LABEL[task.status as TaskStatus]}</Badge>)}

        <div className="steps">
          {steps.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <span className="step-sep">—</span>}
              <span className={'step' + (i <= idx ? ' active' : '')}><b>{i + 1}</b>{s}</span>
            </Fragment>
          ))}
        </div>

        <div className="detail-grid">
          <div>
            <div className="panel">
              <h3>任务约定</h3>
              <div className="summary-row"><span>取件地点</span><b>{task.from}</b></div>
              <div className="summary-row"><span>交付地点</span><b>{task.to}</b></div>
              <div className="summary-row"><span>物品申报价值</span><b>¥{money(task.value)}</b></div>
              <p className="task-note">{task.note || '暂无补充说明'}</p>
              {full && <div className="notice">大额物品：发单者已确认协议{task.runnerAgreement ? '，接单者也已确认' : ''}。<button onClick={() => setModal(agreementModal())}>查看责任约定 →</button></div>}
              <div className="actions">{actions}</div>
              {!member && task.status !== 'open' && <p className="note">你不是此订单参与者，仅显示公开任务信息。</p>}
              {task.status === 'disputed' && member && <div className="notice">申诉说明：{task.dispute}<br />资金暂停结算，由校园管理员审核处理。</div>}
            </div>

            {member && task.proof && (
              <div className="panel">
                <h3>交付凭证</h3>
                <div className="proof"><Icon name="box" size={70} /><p>包裹已送达公开交接点</p><b>合成交付照片占位 · 非真实照片</b><p>{fmtTime(state.now)}</p></div>
                {task.budget > 0 && <p className="muted">商品小票示例金额：¥{money(task.actual)} · 预算差额 ¥{money(task.budget - task.actual)}</p>}
              </div>
            )}

            {member && (
              <div className="panel">
                <h3>订单时间线</h3>
                <ul className="timeline">
                  {task.events.slice().reverse().map((e: any) => <li key={e.at + e.text}>{e.text}<small>{fmtTime(e.at)}</small></li>)}
                </ul>
              </div>
            )}

            {task.status === 'done' && member && (
              <div className="panel">
                <h3>互助评价</h3>
                {Object.keys(task.reviews).length === 2
                  ? Object.entries(task.reviews).map(([uid, r]: any) => <div key={uid} className="review"><div>{who(state, uid).name} <span className="stars">{'★'.repeat(r.stars)}</span></div>{r.text || '感谢这次顺路互助！'}</div>)
                  : <p className="muted">双方提交后公开，减少评价压力。当前已提交 {Object.keys(task.reviews).length}/2。</p>}
              </div>
            )}
          </div>

          <aside>
            <div className="panel">
              <p className="muted">本单跑腿报酬</p>
              <div className="wallet-value">¥{money(task.fee)}</div>
              <div className="summary-row"><span>商品预算</span><b>¥{money(task.budget)}</b></div>
              <div className="summary-row"><span>发单者已预付</span><b>¥{money(task.fee + task.budget)}</b></div>
              <div className="summary-row"><span>资金状态</span><b>{task.status === 'done' ? '模拟结算完成' : task.status === 'cancelled' ? '已模拟退款' : task.status === 'disputed' ? '争议中 · 暂停结算' : '待结算'}</b></div>
              <p className="note">{task.budget ? '商品款由接单者先垫付，收货后返还。垫款返还与跑腿收入分别记账。' : '确认收货或平台裁决后，报酬才进入接单者账户。'}</p>
            </div>
            <div className="panel">
              <h3>本单同学</h3>
              <div className="summary-row"><span>发布者</span><b>{owner.name}</b></div>
              <div className="summary-row"><span>接单者</span><b>{runner ? runner.name : '等待同校同学'}</b></div>
              <p className="muted">材料对其他同学不可见。认证与有效期由平台核验。</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

// ===== modal 内容 =====
function guideModal() {
  return <>
    <button className="modal-close" data-action="close">×</button>
    <h2>3 分钟，体验一次顺路互助</h2>
    <ol className="risk-copy">
      <li>默认「陈同学」在大厅接单，进入订单后提交示例交付凭证。</li>
      <li>切换「林同学」确认收货，查看模拟收入、垫付款与差额退款。</li>
      <li>切换「周同学」体验学籍过期拦截；提交双证示例后由管理员审核。</li>
      <li>切换「许同学」查看毕业提醒；管理员工作台可以处理纠纷和调整演示日期。</li>
    </ol>
    <p>所有数据保存在当前浏览器，角色切换用于演示。没有真实支付、真实证件上传和跨用户服务。</p>
    <Btn>开始体验</Btn>
  </>
}

function agreementModal() {
  return <>
    <button className="modal-close">×</button>
    <h2>大额物品 · 风险与责任协议</h2>
    <p>演示阈值：物品申报价值或代买预算达到 ¥{money(LARGE_LIMIT)}。此处为产品流程示例，不是正式法律协议。</p>
    <ol className="risk-copy">
      <li>双方确认物品型号、数量、申报价值、包装状态与交付地点。</li>
      <li>接单者取货及交付时留存凭证；不得擅自拆封、替换或增加价格。</li>
      <li>发单者预付款留在待结算状态。代买者自愿垫付，确认收货或平台裁决后结算。</li>
      <li>出现丢失、破损或金额纠纷时暂停结算，由平台依据证据处理。</li>
      <li>免责仅限双方明确约定的合理风险边界，不免除故意、重大过失等依法不能免除的责任。</li>
    </ol>
    <p>正式业务须审核协议与保障能力，不能用勾选协议替代实际赔付保障。</p>
    <Btn>我已阅读</Btn>
  </>
}

function confirmModal(title: string, body: string, onConfirm: () => void) {
  return <>
    <button className="modal-close">×</button>
    <h2>{title}</h2>
    <p>{body}</p>
    <div className="actions"><Btn onClick={onConfirm}>确认</Btn><Btn kind="secondary">再想想</Btn></div>
  </>
}

function acceptModal(task: Task, dispatch: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>确认接下这份任务</h2>
    <p>{task.title}</p>
    <div className="summary-row"><span>跑腿报酬</span><b>¥{money(task.fee)}</b></div>
    {task.budget > 0 && <div className="notice">发布者已模拟预付 ¥{money(task.fee + task.budget)}，资金待结算。你需要先垫付商品款（预算 ¥{money(task.budget)}），收货确认后返还。</div>}
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('accept', task.id, { agreement: !!d.get('agreement') }); }}>
      {Math.max(task.value, task.budget) >= LARGE_LIMIT && <><div className="guide">大额物品协议：核对型号、价值和包装，保留取货及交付证据；纠纷暂停结算。</div><label className="check"><input type="checkbox" name="agreement" required />已阅读并确认大额物品风险与责任约定</label></>}
      <div className="actions"><Btn>确认接单</Btn></div>
    </form>
  </>
}

function deliverModal(task: Task, dispatch: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>提交交付凭证</h2>
    <p>先送达，再提交凭证。照片作为证据，仍需发布者确认收货。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('deliver', task.id, { actual: Math.round(Number(d.get('actual') || 0) * 100), proof: true }); }}>
      {task.budget > 0 && <label className="field">实际商品款（元）<input name="actual" type="number" min="0" max={task.budget / 100} step="0.01" defaultValue={task.budget / 100} required /></label>}
      <div className="proof"><Icon name="box" size={50} /><p>雏形仅提供合成交付示例，不收集真实照片。</p></div>
      <div className="actions"><Btn>提交，等待确认收货</Btn></div>
    </form>
  </>
}

function disputeModal(task: Task, dispatch: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>申请平台协调</h2>
    <p>提交后暂停结算。请描述交付、物品或金额问题。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('dispute', task.id, { reason: d.get('reason') }); }}>
      <label className="field">纠纷说明<textarea name="reason" required maxLength={500} placeholder="例如：收到的商品与约定型号不一致" /></label>
      <div className="actions"><Btn>提交申诉，暂停结算</Btn></div>
    </form>
  </>
}

function resolveModal(task: Task, dispatch: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>平台纠纷处理</h2>
    <p>订单：{task.title}</p>
    <div className="guide">申诉：{task.dispute}<br />交付凭证：{task.proof ? '已附示例凭证' : '未提交'}<br />模拟预付款：¥{money(task.fee + task.budget)}</div>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch(String(d.get('result')), task.id, { reason: d.get('reason') }); }}>
      <label className="field">处理结果<select name="result"><option value="resolveRefund">全额退款给发布者</option><option value="resolvePay" disabled={!task.proof}>依凭证结算给接单者，退回预算差额</option></select></label>
      <label className="field">裁决依据<textarea name="reason" required maxLength={300} placeholder="记录双方沟通与凭证核验结果" /></label>
      <div className="actions"><Btn>确认模拟裁决</Btn></div>
    </form>
  </>
}

function reviewModal(task: Task, dispatch: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>给这次互助一个回应</h2>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('review', task.id, { stars: Number(d.get('stars')), text: d.get('text') }); }}>
      <label className="field">服务评分<select name="stars"><option value="5">★★★★★ 很满意</option><option value="4">★★★★ 满意</option><option value="3">★★★ 一般</option><option value="2">★★ 不太满意</option><option value="1">★ 不满意</option></select></label>
      <label className="field">评价<textarea name="text" maxLength={200} placeholder="沟通及时、交付准时，都可以说一说" /></label>
      <p className="note">双方提交后公开，减少相互评价的压力。</p>
      <div className="actions"><Btn>提交评价</Btn></div>
    </form>
  </>
}

function resetModal(reset: () => void) {
  return <>
    <button className="modal-close">×</button>
    <h2>重置演示场景？</h2>
    <p>清除本浏览器中的演示订单与流水，恢复初始示例。此操作不涉及真实交易。</p>
    <div className="actions"><Btn onClick={reset}>确认重置</Btn><Btn kind="secondary">保留当前进度</Btn></div>
  </>
}

// ===== Hero 插画（原创 SVG）=====
function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 430 210" fill="none" aria-hidden="true">
      <ellipse cx="233" cy="185" rx="163" ry="12" fill="#e0e7ff" />
      <path d="M37 145C70 90 98 171 151 140s59-95 113-58 89 33 124-22" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="5 7" />
      <g transform="translate(77,90) rotate(-10)">
        <rect width="91" height="75" rx="7" fill="#fde68a" />
        <path d="M0 25h91M45 0v75" stroke="#d4b464" strokeWidth="2" />
        <path d="M34 0h21v30l-11-6-10 6z" fill="#fef3c7" />
        <path d="M63 51h17m-17 8h12" stroke="#b39d56" strokeWidth="2" />
      </g>
      <g transform="translate(226,37) rotate(12)">
        <rect width="85" height="131" rx="14" fill="#3730a3" />
        <rect x="7" y="8" width="71" height="114" rx="9" fill="#eef2ff" />
        <rect x="28" y="12" width="30" height="5" rx="3" fill="#3730a3" />
        <circle cx="43" cy="48" r="18" fill="#c7d2fe" />
        <path d="M34 48l7 7 13-15" stroke="#4f46e5" strokeWidth="3" />
        <rect x="18" y="78" width="50" height="5" rx="2" fill="#dde6d0" />
        <rect x="25" y="89" width="36" height="4" rx="2" fill="#e8edde" />
        <rect x="19" y="104" width="48" height="10" rx="4" fill="#a5b4fc" />
      </g>
      <g transform="translate(332,117)">
        <path d="M0 5h38l-4 53H5z" fill="#fef3c7" />
        <path d="M-2 5h42V0H-2z" fill="#4f46e5" />
        <path d="M7 24h25v18H7z" fill="#c7d2fe" />
        <path d="M15-4c-9-8 8-10 0-19m13 20c-9-8 8-10 0-19" stroke="#a5b4fc" strokeWidth="2" />
      </g>
      <circle cx="187" cy="33" r="18" fill="#f8fafc" />
      <path d="M179 33l5 5 11-12" stroke="#4f46e5" strokeWidth="2" />
      <path d="M64 48l8 4-7 11-2-8-9-2z" fill="#818cf8" />
      <path d="M375 35v12m-6-6h12" stroke="#818cf8" strokeWidth="2" />
    </svg>
  )
}
