import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { AppState, Task, TaskStatus, User } from './domain'
import {
  DORMITORIES,
  LANDMARKS,
  LARGE_LIMIT,
  REVIEW_TAGS,
  SCHOOL,
  SCHOOL_EN,
  closed,
  creditProfile,
  distance,
  eligibility,
  graduation,
  money,
  time,
} from './domain'
import { useAppStore } from './store'
import { Icon, KIND_ICON, Crest, BuildingArt, Medal } from './icons'
import { t } from './translations'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './App.css'

type View = 'hall' | 'publish' | 'orders' | 'card' | 'admin' | 'messages'

const NAV: { key: View; label: string; icon: string; desktop?: boolean }[] = [
  { key: 'hall', label: 'nav.hall', icon: 'grid' },
  { key: 'publish', label: 'nav.publish', icon: 'plus' },
  { key: 'orders', label: 'nav.orders', icon: 'list' },
  { key: 'card', label: 'nav.card', icon: 'shield' },
  { key: 'admin', label: 'nav.admin', icon: 'user', desktop: true },
]

const STATUS_LABEL: Record<TaskStatus, string> = {
  open: 'status.open',
  accepted: 'status.accepted',
  delivered: 'status.delivered',
  disputed: 'status.disputed',
  done: 'status.done',
  cancelled: 'status.cancelled',
}

export default function App() {
  const { state, currentUser, toast, dispatch, setUser, setNow, reset, markRead, markAllRead, lang, toggleLang } = useAppStore()
  const [view, setView] = useState<View>('hall')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [modal, setModal] = useState<React.ReactNode | null>(null)

  const detail = useMemo(() => state.tasks.find((t) => t.id === detailId) ?? null, [state.tasks, detailId])
  const g = graduation(currentUser, state.now)
  const unreadCount = state.notifications.filter((n) => n.userId === currentUser.id && !n.read).length

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Crest size={30} />
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
              <span>{t(n.label)}</span>
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tiny-card">
            <Crest size={22} />
            <strong>学生卡 · 信用名片</strong>
            学生卡核验 · 履约留痕 · 确认后结算
          </div>
          <div className="sidebar-footer">校园帮 CAMPUSPAL · 港大互助平台</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="school">
            <Icon name="pin" size={18} /> {lang === 'en' ? 'HKU' : SCHOOL} <span>{t('top.campus')}</span>
          </div>
          <div className="profile">
            <a className="muted" onClick={() => setView('card')}>{t('top.myCard')}</a>
            <button className="lang-btn" onClick={toggleLang} aria-label="切换语言">{lang === 'zh' ? 'EN' : '中文'}</button>
            <button className={'bell' + (view === 'messages' ? ' active' : '')} onClick={() => setView('messages')} aria-label="消息通知">
              <Icon name="chat" size={20} />
              {unreadCount > 0 && <span className="bell-badge">{unreadCount}</span>}
            </button>
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
          {view === 'card' && <Card state={state} currentUser={currentUser} dispatch={dispatch} onOpen={setDetailId} onView={setView} />}
          {view === 'admin' && <Admin state={state} dispatch={dispatch} setNow={setNow} onOpen={setDetailId} setModal={setModal} />}
          {view === 'messages' && <Messages state={state} currentUser={currentUser} markRead={markRead} markAllRead={markAllRead} />}

          <footer className="page-footer">
            信用为凭，同窗互助 · CAMPUSPAL © 2026 · <button onClick={() => setModal(resetModal(reset))}>重置演示</button>
          </footer>
        </main>
      </div>

      <nav className="tabbar">
        {NAV.filter((n) => !n.desktop).map((n) => (
          <button key={n.key} className={'tab' + (view === n.key ? ' active' : '')} onClick={() => setView(n.key)}>
            <Icon name={n.icon} size={22} />
            <span>{t(n.label)}</span>
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
          <div className="modal" onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).closest('.modal-close')) setModal(null) }}>{modal}</div>
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

// ===== 学生卡名片 =====
function StudentCard({ user, full = false }: { user: User; full?: boolean }) {
  const cp = creditProfile(user)
  return (
    <div className={'student-card' + (full ? ' full' : '')}>
      <BuildingArt className="sc-watermark" />
      <div className="sc-header">
        <span className="sc-crest"><Crest size={full ? 34 : 24} /></span>
        <div className="sc-school">
          <strong>{SCHOOL_EN}</strong>
          <span>{SCHOOL} · 学生证</span>
        </div>
        <span className="sc-badge-cert">{user.cert === 'approved' ? '已认证' : user.cert === 'pending' ? '待审核' : '未认证'}</span>
      </div>
      <div className="sc-body">
        <div className="sc-photo">{user.avatar}</div>
        <div className="sc-info">
          <strong className="sc-name">{user.name}</strong>
          <span className="sc-id">UID {user.studentId}</span>
          <span className="sc-major">{user.faculty}{user.major ? ' · ' + user.major : ''}</span>
        </div>
      </div>
      <div className="sc-credit">
        <span className="sc-level"><Medal level={cp.level} size={16} /> {cp.levelLabel}</span>
        <span>★ {cp.avgRating ?? '—'}</span>
        <span>好评 {cp.goodRate ?? '—'}%</span>
        <span>{cp.completed} 单 · 准时 {cp.onTimeRate ?? '—'}%</span>
      </div>
      <div className="sc-footer">
        <span>有效期至 {fmtDay(user.validUntil)}</span>
        <span className="sc-stripe" />
      </div>
    </div>
  )
}

function MiniCard({ user }: { user: User }) {
  const cp = creditProfile(user)
  return (
    <div className="mini-card">
      <span className="mc-crest"><Crest size={22} /></span>
      <div className="mc-info">
        <strong>{user.name}{user.cert === 'approved' && <i className="verified">✓</i>}</strong>
        <span>{user.faculty} · {cp.levelLabel}</span>
      </div>
      <span className="mc-credit"><Medal level={cp.level} size={16} /> ★ {cp.avgRating ?? '—'}</span>
    </div>
  )
}

// ===== 大厅 =====
function Hall({ state, currentUser, onOpen, onView }: any) {
  const [filter, setFilter] = useState<string>('全部')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'顺路' | '价格'>('顺路')
  const myDorm = DORMITORIES.find((d) => d.name === currentUser.dormitory)
  const open = state.tasks.filter((t: Task) => t.status === 'open' && time(t.due) > time(state.now))
  const mine = state.tasks.filter((t: Task) => (t.owner === state.user || t.runner === state.user) && !closed(t) && t.status !== 'open')
  const done = state.tasks.filter((t: Task) => (t.owner === state.user || t.runner === state.user) && t.status === 'done')
  const withDist: { t: Task; dist: number }[] = open.map((t: Task) => ({
    t,
    dist: myDorm ? distance(myDorm.lat, myDorm.lng, t.toLat, t.toLng) : Number.MAX_SAFE_INTEGER,
  }))
  const shown = withDist
    .filter(({ t }) => (filter === '全部' || t.kind === filter) && `${t.title}${t.from}${t.to}`.includes(query))
    .sort((a, b) => (sort === '顺路' ? a.dist - b.dist : b.t.fee - a.t.fee))

  return (
    <>
      {pageHead(t('hall.kicker'), t('hall.title'), t('hall.sub'), <Btn onClick={() => onView('publish')}><Icon name="plus" size={17} /> {t('hall.postTask')}</Btn>)}

      <MiniCard user={currentUser} />

      <section className="hero">
        <div>
          <span className="hero-tag">{t('hall.heroTag')}</span>
          <h2>{t('hall.heroTitle')}</h2>
          <p>{t('hall.heroSub')}</p>
          <div className="hero-trust">
            <span><Icon name="shield" size={14} /> {t('hall.trust1')}</span>
            <span><Icon name="wallet" size={14} /> {t('hall.trust2')}</span>
            <span><Icon name="check" size={14} /> {t('hall.trust3')}</span>
          </div>
        </div>
        <BuildingArt className="hero-building" />
      </section>

      <div className="stats">
        {stat('正在等待帮助', open.length, 'box')}
        {stat('我的进行中订单', mine.length, 'clock')}
        {stat('我的已完成订单', done.length, 'check')}
      </div>

      <div className="workspace">
        <section>
          <div className="section-header">
            <h2>{t('hall.discover')} <small>{t('top.campus')}</small></h2>
            <label className="search"><Icon name="search" size={15} /><input placeholder="搜索任务、地点" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
          </div>
          <div className="filters">
            {['全部', '快递代取', '餐食代买', '打印代取', '校内送物', '占座'].map((c) => (
              <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>{c}</button>
            ))}
            <span className="sort-sep" />
            {(['顺路', '价格'] as const).map((s) => (
              <button key={s} className={'chip sort' + (sort === s ? ' active' : '')} onClick={() => setSort(s)}>{s === '顺路' ? t('hall.sortRoute') : t('hall.sortPrice')}</button>
            ))}
          </div>
          <div className="cards">
            {shown.map(({ t, dist }) => <TaskCard key={t.id} task={t} state={state} onOpen={onOpen} dist={dist} />)}
            {shown.length === 0 && empty('暂时没有匹配的任务', '换个分类，或发布你的第一份校园小任务。')}
          </div>
        </section>
        <aside className="aside">
          <div className="panel">
            <h3>每一次互助，都有保障</h3>
            <div className="trust-list">
              <div className="trust-item"><Icon name="shield" /><div><strong>港大学生卡，身份核验</strong><p>学生卡实名认证<br />过期需续期重新审核</p></div></div>
              <div className="trust-item"><Icon name="wallet" /><div><strong>资金有状态，付出有回报</strong><p>发单预付，交付留证<br />确认收货后结算给接单者</p></div></div>
              <div className="trust-item"><Icon name="chat" /><div><strong>遇到问题，平台来协调</strong><p>纠纷期间暂停结算<br />双方证据留存、处理可追溯</p></div></div>
            </div>
          </div>
          <div className="callout">
            <h3><Icon name="grad" size={18} /> 信用，由履约积累</h3>
            <p>不做随意的加减分公式。你的信用画像，来自真实完成的每一单、每一次准时交付、每一条评价。</p>
            <a onClick={() => onView('card')}>查看信用画像 <Icon name="arrow" size={14} /></a>
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

function TaskCard({ task, state, onOpen, dist }: { task: Task; state: AppState; onOpen: (id: string) => void; dist?: number }) {
  const owner = who(state, task.owner)
  const remainMin = Math.max(0, Math.round((time(task.due) - time(state.now)) / 60000))
  const distLabel = dist !== undefined && dist < 1500 ? (dist < 1000 ? dist + 'm' : (dist / 1000).toFixed(1) + 'km') : null
  return (
    <article className="task-card" onClick={() => onOpen(task.id)}>
      <div className="card-top">
        <span className="category"><i><Icon name={KIND_ICON[task.kind]} size={18} /></i>{t('kind.' + task.kind)}</span>
        <span className="reward"><small>¥</small>{money(task.fee)}</span>
      </div>
      <h3>{task.title}</h3>
      <div className="route">
        <span><i className="dot" />{task.from}</span>
        <span><i className="dot end" />{task.to}</span>
      </div>
      <div className="tags">
        <Badge>{t(STATUS_LABEL[task.status])}</Badge>
        {distLabel && <Badge tone="green">{t('hall.onRoute').replace('{d}', distLabel)}</Badge>}
        {task.budget ? <Badge tone="amber">{t('common.budget')} ¥{money(task.budget)}</Badge> : <Badge>{t('common.smallItem')}</Badge>}
        {Math.max(task.value, task.budget) >= LARGE_LIMIT && <Badge tone="amber">{t('common.large')}</Badge>}
        {remainMin > 0 && remainMin <= 30 && <Badge tone="red">{t('hall.remaining').replace('{n}', String(remainMin))}</Badge>}
      </div>
      <div className="card-footer">
        <span className="person"><span className="avatar">{owner.avatar}</span>{owner.name}<br />{fmtTime(task.due)} 前</span>
        <span className="arrow-button">{task.status === 'open' ? '查看任务' : '订单详情'} <Icon name="arrow" size={15} /></span>
      </div>
    </article>
  )
}

// ===== 发布 =====
function LocationPicker({ lat, lng, onPick }: { lat: number; lng: number; onPick: (lat: number, lng: number) => void }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInst = useRef<L.Map | null>(null)
  const markerRef = useRef<L.CircleMarker | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInst.current) return
    const map = L.map(mapRef.current, { scrollWheelZoom: false }).setView([22.284, 114.1363], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map)
    map.on('click', (e) => onPick(e.latlng.lat, e.latlng.lng))
    mapInst.current = map
    return () => {
      map.remove()
      mapInst.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapInst.current
    if (!map) return
    if (markerRef.current) markerRef.current.remove()
    markerRef.current = L.circleMarker([lat, lng], { radius: 8, color: '#0b4f3a', fillColor: '#c9a227', fillOpacity: 1, weight: 2 }).addTo(map)
    map.setView([lat, lng], 16)
  }, [lat, lng])

  return <div ref={mapRef} className="map-box" />
}

function Publish({ state, currentUser, dispatch, onOpen, onView, setModal }: any) {
  const err = eligibility(currentUser, state.now)
  const [fromName, setFromName] = useState('')
  const [toName, setToName] = useState('')
  const [fromPos, setFromPos] = useState({ lat: 22.2847, lng: 114.1354 })
  const [toPos, setToPos] = useState({ lat: 22.2837, lng: 114.1376 })

  const pickLandmark = (which: 'from' | 'to', lm: { name: string; lat: number; lng: number }) => {
    if (which === 'from') {
      setFromName(lm.name)
      setFromPos({ lat: lm.lat, lng: lm.lng })
    } else {
      setToName(lm.name)
      setToPos({ lat: lm.lat, lng: lm.lng })
    }
  }

  return (
    <>
      {pageHead('POST A LITTLE HELP', '把小事，交给顺路的同学。', '在地图上选好地点，信息写清楚，互助更安心。')}
      {err && <div className="notice">{err}。<a onClick={() => onView('card')}>前往认证 →</a></div>}
      <form className="publish-form" onSubmit={(e) => {
        e.preventDefault()
        const d = new FormData(e.currentTarget)
        const n: any = dispatch('publish', '', {
          kind: d.get('kind'),
          title: d.get('title'),
          from: fromName || d.get('from'),
          to: toName || d.get('to'),
          fromLat: fromPos.lat,
          fromLng: fromPos.lng,
          toLat: toPos.lat,
          toLng: toPos.lng,
          fee: Math.round(Number(d.get('fee')) * 100),
          budget: Math.round(Number(d.get('budget')) * 100),
          value: Math.round(Number(d.get('value')) * 100),
          due: d.get('due') + ':00+08:00',
          note: d.get('note'),
          agreement: !!d.get('agreement'),
        })
        if (n?.id) onOpen(n.id)
      }}>
        <div className="form-layout">
          <div className="panel">
            <h3>这次想找什么帮助？</h3>
            <p className="muted">提交后将模拟支付并发布到大厅。请只填写虚构的演示信息。</p>
            <div className="form-grid">
              <label className="field full">任务标题<input name="title" required maxLength={60} placeholder="例如：帮取一个小包裹，送到图书馆" /></label>
              <label className="field">任务类型<select name="kind">{['快递代取', '餐食代买', '打印代取', '校内送物', '占座'].map((k) => <option key={k}>{k}</option>)}</select></label>
              <label className="field">截止时间<input name="due" type="datetime-local" defaultValue={state.now.slice(0, 10) + 'T18:00'} required /></label>

              <div className="field full">
                <span>从哪里取（点地标或点地图）</span>
                <input name="from" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="港铁香港大学站" required maxLength={60} />
                <LocationPicker lat={fromPos.lat} lng={fromPos.lng} onPick={(lat, lng) => setFromPos({ lat, lng })} />
                <div className="landmark-row">{LANDMARKS.map((lm) => <button key={lm.name} type="button" className="chip" onClick={() => pickLandmark('from', lm)}>{lm.name}</button>)}</div>
              </div>

              <div className="field full">
                <span>送到哪里（点地标或点地图）</span>
                <input name="to" value={toName} onChange={(e) => setToName(e.target.value)} placeholder="主图书馆" required maxLength={60} />
                <LocationPicker lat={toPos.lat} lng={toPos.lng} onPick={(lat, lng) => setToPos({ lat, lng })} />
                <div className="landmark-row">{LANDMARKS.map((lm) => <button key={lm.name} type="button" className="chip" onClick={() => pickLandmark('to', lm)}>{lm.name}</button>)}</div>
              </div>

              <label className="field">跑腿报酬（元）<input name="fee" type="number" step="0.01" min="1" max="1000" defaultValue="5" required /></label>
              <label className="field">物品申报价值（元）<input name="value" type="number" step="0.01" min="0" max="10000" defaultValue="30" required /></label>
              <label className="field full">代买商品预算（元，其他任务填 0）<input name="budget" type="number" step="0.01" min="0" max="10000" defaultValue="0" required /></label>
              <label className="field full">补充说明<textarea name="note" maxLength={400} placeholder="物品大小、是否上楼、商品替换要求等。" /></label>
              <label className="check field full"><input type="checkbox" name="agreement" /><span>如涉及大额物品（≥¥500），我已阅读并确认 <button type="button" onClick={() => setModal(agreementModal())}>风险与责任协议</button>。</span></label>
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
function Card({ state, currentUser, dispatch, onOpen, onView }: any) {
  const cp = creditProfile(currentUser)
  const err = eligibility(currentUser, state.now)
  const ledger = state.ledger.filter((l: any) => l.user === currentUser.id)
  const earned = ledger.filter((l: any) => l.type === '跑腿收入').reduce((a: number, l: any) => a + l.amount, 0)
  const returned = ledger.filter((l: any) => l.type === '垫付款返还').reduce((a: number, l: any) => a + l.amount, 0)
  return (
    <>
      {pageHead('MY STUDENT CARD', '我的学生卡', '一张卡，既是港大身份，也是信用名片。')}

      <div className="card-hero">
        <StudentCard user={currentUser} full />
        <div className="card-side">
          <div className={'notice ' + (!err ? 'green' : '')}>{!err ? '学生卡已认证 · 可以接单' : err}。学生卡过期不扣信用，已有订单和资金仍可处理。</div>
          <div className="panel">
            <h3>学生卡认证</h3>
            <p className="muted">港大学生卡通过管理员审核后，即可发布与接单。演示使用合成信息，不接收真实证件。</p>
            {currentUser.cert === 'pending' ? (
              <p className="note">已提交，等待管理员审核。可在右上角切换「校园管理员」审核。</p>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('submitCert', '', { card: !!d.get('card') }); }}>
                <label className="check"><input type="checkbox" name="card" required />确认学生卡信息：{currentUser.name} · {currentUser.studentId} · {currentUser.faculty}{currentUser.major ? ' · ' + currentUser.major : ''}</label>
                <div className="actions">
                  <Btn disabled={currentUser.cert === 'approved'} type="submit">{currentUser.cert === 'approved' ? '已认证' : '提交审核'}</Btn>
                  <Btn kind="secondary" onClick={() => onView('orders')}>处理已有订单</Btn>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="stats">
        {stat('累计跑腿收入', money(earned), 'wallet')}
        {stat('完成接单', cp.completed, 'check')}
        {stat('已返还垫付款', money(returned), 'wallet')}
      </div>

      <div className="panel">
        <h3>收到的评价 <span className="muted">作为送货员被同学评价</span></h3>
        {currentUser.reviews.length > 0 ? (
          <div className="deliverer-reviews">
            {currentUser.reviews.map((r: any, i: number) => (
              <div key={i} className="review">
                <b>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)} {r.fromName}</b>
                {r.tags?.length > 0 && <div className="review-tags">{r.tags.map((t: string) => <span key={t} className="review-tag">{t}</span>)}</div>}
                <p>{r.text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">还没有收到评价，完成几单后同学们会给你留言。</p>
        )}
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>信用画像</h3>
          <div className="summary-row"><span>完成接单</span><b>{cp.completed} 单</b></div>
          <div className="summary-row"><span>准时率</span><b>{cp.onTimeRate === null ? '记录不足' : cp.onTimeRate + '%（' + currentUser.onTime + '/' + currentUser.completed + '）'}</b></div>
          <div className="summary-row"><span>平均评分</span><b>{cp.avgRating === null ? '暂无评价' : cp.avgRating + ' 星（' + currentUser.ratingCount + ' 条）'}</b></div>
          <div className="summary-row"><span>信用阶段</span><b>{cp.levelLabel}</b></div>
          <p className="note">学生卡过期不扣分；申诉不直接认定违约。信用由客观履约事件构成，不做随意加减分。</p>
        </div>
        <div className="panel">
          <h3>账户流水 <span className="muted">仅当前演示身份</span></h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>订单</th><th>类型</th><th>金额</th></tr></thead>
              <tbody>
                {ledger.slice().reverse().map((l: any) => (
                  <tr key={l.task + l.at}><td><a onClick={() => onOpen(l.task)}>{l.task.toUpperCase()} ↗</a></td><td>{l.type}</td><td>+ ¥{money(l.amount)}</td></tr>
                ))}
                {ledger.length === 0 && <tr><td colSpan={3}>完成一笔订单后，这里会显示模拟结算与退款流水。</td></tr>}
              </tbody>
            </table>
          </div>
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
  const reports = state.reports
  const deliverers = state.users.filter((u: User) => u.id !== 'admin')
  const totalTasks = state.tasks.length
  const doneTasks = state.tasks.filter((t: Task) => t.status === 'done').length
  const totalEarned = state.ledger.filter((l: any) => l.type === '跑腿收入').reduce((a: number, l: any) => a + l.amount, 0)
  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const disputeRate = totalTasks ? Math.round((disputes.length / totalTasks) * 100) : 0
  return (
    <>
      {pageHead('CAMPUS SUPPORT', '每一份信任，都认真回应。', '审核与裁决均为演示操作，不会查验真实身份或移动真实资金。')}

      <div className="stats">
        {stat('平台订单', totalTasks, 'list')}
        {stat('完成率', completionRate + '%', 'check')}
        {stat('纠纷率', disputeRate + '%', 'chat')}
      </div>
      <div className="stats">
        {stat('注册学生', deliverers.length, 'user')}
        {stat('累计跑腿收入', money(totalEarned), 'wallet')}
        {stat('待审核认证', pending.length, 'shield')}
      </div>
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
      <div className="panel">
        <h3>举报信息 <span className="count">{reports.length}</span></h3>
        {reports.slice().reverse().map((r: any) => (
          <div key={r.id} className="summary-row">
            <div>
              <b>{r.targetName}</b> 被举报 · 举报人 {r.fromName}
              <p className="muted">{r.reason}</p>
            </div>
            {r.status === 'pending'
              ? <Btn onClick={() => dispatch('resolveReport', r.id)}>标记已处理</Btn>
              : <Badge tone="green">已处理</Badge>}
          </div>
        ))}
        {reports.length === 0 && <p className="muted">暂无举报信息。</p>}
      </div>
      <div className="panel">
        <h3>注册送货员 <span className="count">{deliverers.length}</span></h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>姓名</th><th>学号</th><th>学院</th><th>信用</th><th>认证</th></tr></thead>
            <tbody>
              {deliverers.map((u: User) => {
                const cp = creditProfile(u)
                return (
                  <tr key={u.id}>
                    <td><b>{u.name}</b></td>
                    <td>{u.studentId}</td>
                    <td>{u.faculty}</td>
                    <td>{cp.levelLabel}</td>
                    <td>{u.cert === 'approved' ? <Badge tone="green">已认证</Badge> : u.cert === 'pending' ? <Badge tone="amber">待审核</Badge> : <Badge tone="red">未认证</Badge>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// ===== 消息通知 =====
function Messages({ state, currentUser, markRead, markAllRead }: any) {
  const myNotifs = state.notifications.filter((n: any) => n.userId === currentUser.id).slice().reverse()
  return (
    <>
      {pageHead('NOTIFICATIONS', '消息通知', '接单、交付、结算、评价的动态，都在这里。')}
      <div className="panel">
        <div className="msg-head">
          <h3>全部通知</h3>
          <Btn kind="secondary" onClick={markAllRead}>全部已读</Btn>
        </div>
        {myNotifs.length === 0 ? (
          <p className="muted">还没有通知。接单或收到评价后，这里会提醒你。</p>
        ) : (
          <div className="msg-list">
            {myNotifs.map((n: any) => (
              <div key={n.id} className={'msg' + (n.read ? '' : ' unread')} onClick={() => markRead(n.id)}>
                <span className="msg-dot" />
                <p>{n.text}</p>
                <small>{fmtTime(n.date)}</small>
              </div>
            ))}
          </div>
        )}
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
    ? <Btn kind="secondary" onClick={() => setModal(confirmModal('取消这份未接单任务？', `¥${money(task.fee + task.budget)} 模拟预付款将全部退回。`, () => dispatch('cancel', task.id), setModal))}>取消任务并退款</Btn>
    : currentUser.id === 'admin' ? null : (err ? <div className="notice">{err} · <a onClick={onView ? () => { onClose(); onView('card'); } : undefined}>去认证</a></div> : <Btn onClick={() => setModal(acceptModal(task, dispatch, setModal))}>我来帮忙 · 接下任务</Btn>)
  if (task.status === 'accepted' && isRunner) actions = <Btn onClick={() => setModal(deliverModal(task, dispatch, setModal))}>提交交付凭证</Btn>
  if (task.status === 'delivered' && isOwner) actions = <Btn onClick={() => setModal(confirmModal('确认收到物品并结算？', `接单者跑腿收入 ¥${money(task.fee)} · 返还垫付款 ¥${money(task.actual)} · 退回预算差额 ¥${money(task.budget - task.actual)}`, () => dispatch('confirm', task.id), setModal))}>确认收货并结算</Btn>
  if (['accepted', 'delivered'].includes(task.status) && (isOwner || isRunner)) actions = <>{actions}<Btn kind="secondary" onClick={() => setModal(disputeModal(task, dispatch, setModal))}>遇到问题 · 发起申诉</Btn></>
  if (task.status === 'disputed' && currentUser.id === 'admin') actions = <Btn onClick={() => setModal(resolveModal(task, dispatch, setModal))}>处理纠纷</Btn>
  if (task.status === 'done' && (isOwner || isRunner) && !task.reviews[currentUser.id]) actions = <Btn kind="soft" onClick={() => setModal(reviewModal(task, dispatch, setModal))}>评价这次互助</Btn>

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <button className="sheet-close" onClick={onClose}>×</button>
        {pageHead('TASK / ' + task.id.toUpperCase(), task.title, `${task.kind} · ${owner.name}发布 · 截止 ${fmtTime(task.due)}`, <Badge tone={task.status === 'disputed' ? 'red' : ''}>{t(STATUS_LABEL[task.status as TaskStatus])}</Badge>)}

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
              {task.status === 'delivered' && isRunner && <div className="guide">已通知发布者确认收货。请在右上角切换为发布者身份，完成「确认收货并结算」。</div>}
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
            <div className="panel guarantee">
              <h3><Icon name="shield" size={16} /> 平台担保</h3>
              <div className="guarantee-list">
                <span>🔒 资金托管 · 确认收货后才结算</span>
                <span>🛡️ 物品损坏 / 遗失可申诉，平台裁决赔付</span>
                <span>⏱️ 超时未交付，自动提醒发布者</span>
              </div>
            </div>
            <div className="panel">
              <h3>本单同学</h3>
              <div className="sheet-people">
                <MiniCard user={owner} />
                {runner ? (
                  <>
                    <MiniCard user={runner} />
                    {currentUser.id !== runner.id && (
                      <div className="deliverer-actions">
                        <Btn kind="secondary" onClick={() => setModal(reviewDelivererModal(runner, dispatch, setModal))}>评价 TA</Btn>
                        <Btn kind="secondary" onClick={() => setModal(reportDelivererModal(runner, dispatch, setModal))}>举报</Btn>
                        <Btn kind="secondary" onClick={() => setModal(blockDelivererModal(runner, dispatch, currentUser, setModal))}>
                          {currentUser.blocked.includes(runner.id) ? '已拉黑' : '拉黑'}
                        </Btn>
                      </div>
                    )}
                    {runner.reviews.length > 0 && (
                      <div className="deliverer-reviews">
                        <h4>大家对 TA 的评价（{runner.reviews.length}）</h4>
                        {runner.reviews.map((r: any, i: number) => (
                          <div key={i} className="review">
                            <b>{'★'.repeat(r.stars)}{'☆'.repeat(5 - r.stars)} {r.fromName}</b>
                            {r.tags?.length > 0 && <div className="review-tags">{r.tags.map((t: string) => <span key={t} className="review-tag">{t}</span>)}</div>}
                            <p>{r.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : <p className="muted">等待同校同学接单</p>}
              </div>
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

function confirmModal(title: string, body: string, onConfirm: () => void, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>{title}</h2>
    <p>{body}</p>
    <div className="actions"><Btn onClick={() => { onConfirm(); setModal(null); }}>确认</Btn><Btn kind="secondary" onClick={() => setModal(null)}>再想想</Btn></div>
  </>
}

function acceptModal(task: Task, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>确认接下这份任务</h2>
    <p>{task.title}</p>
    <div className="summary-row"><span>跑腿报酬</span><b>¥{money(task.fee)}</b></div>
    {task.budget > 0 && <div className="notice">发布者已模拟预付 ¥{money(task.fee + task.budget)}，资金待结算。你需要先垫付商品款（预算 ¥{money(task.budget)}），收货确认后返还。</div>}
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('accept', task.id, { agreement: !!d.get('agreement') }); setModal(null); }}>
      {Math.max(task.value, task.budget) >= LARGE_LIMIT && <><div className="guide">大额物品协议：核对型号、价值和包装，保留取货及交付证据；纠纷暂停结算。</div><label className="check"><input type="checkbox" name="agreement" required />已阅读并确认大额物品风险与责任约定</label></>}
      <div className="actions"><Btn type="submit">确认接单</Btn></div>
    </form>
  </>
}

function deliverModal(task: Task, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>提交交付凭证</h2>
    <p>先送达，再提交凭证。照片作为证据，仍需发布者确认收货。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('deliver', task.id, { actual: Math.round(Number(d.get('actual') || 0) * 100), proof: true }); setModal(null); }}>
      {task.budget > 0 && <label className="field">实际商品款（元）<input name="actual" type="number" min="0" max={task.budget / 100} step="0.01" defaultValue={task.budget / 100} required /></label>}
      <div className="proof"><Icon name="box" size={50} /><p>雏形仅提供合成交付示例，不收集真实照片。</p></div>
      <div className="actions"><Btn type="submit">提交，等待确认收货</Btn></div>
    </form>
  </>
}

function disputeModal(task: Task, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>申请平台协调</h2>
    <p>提交后暂停结算。请描述交付、物品或金额问题。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('dispute', task.id, { reason: d.get('reason') }); setModal(null); }}>
      <label className="field">纠纷说明<textarea name="reason" required maxLength={500} placeholder="例如：收到的商品与约定型号不一致" /></label>
      <div className="actions"><Btn type="submit">提交申诉，暂停结算</Btn></div>
    </form>
  </>
}

function resolveModal(task: Task, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>平台纠纷处理</h2>
    <p>订单：{task.title}</p>
    <div className="guide">申诉：{task.dispute}<br />交付凭证：{task.proof ? '已附示例凭证' : '未提交'}<br />模拟预付款：¥{money(task.fee + task.budget)}</div>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch(String(d.get('result')), task.id, { reason: d.get('reason') }); setModal(null); }}>
      <label className="field">处理结果<select name="result"><option value="resolveRefund">全额退款给发布者</option><option value="resolvePay" disabled={!task.proof}>依凭证结算给接单者，退回预算差额</option></select></label>
      <label className="field">裁决依据<textarea name="reason" required maxLength={300} placeholder="记录双方沟通与凭证核验结果" /></label>
      <div className="actions"><Btn type="submit">确认模拟裁决</Btn></div>
    </form>
  </>
}

function reviewModal(task: Task, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>给这次互助一个回应</h2>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('review', task.id, { stars: Number(d.get('stars')), text: d.get('text') }); setModal(null); }}>
      <label className="field">服务评分<select name="stars"><option value="5">★★★★★ 很满意</option><option value="4">★★★★ 满意</option><option value="3">★★★ 一般</option><option value="2">★★ 不太满意</option><option value="1">★ 不满意</option></select></label>
      <label className="field">评价<textarea name="text" maxLength={200} placeholder="沟通及时、交付准时，都可以说一说" /></label>
      <p className="note">双方提交后公开，减少相互评价的压力。</p>
      <div className="actions"><Btn type="submit">提交评价</Btn></div>
    </form>
  </>
}

function reviewDelivererModal(target: User, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>评价 {target.name}</h2>
    <p>你的评价会出现在 TA 的学生卡信用档案里，帮助其他同学判断。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('reviewDeliverer', target.id, { stars: Number(d.get('stars')), text: d.get('text'), tags: d.getAll('tag') }); setModal(null); }}>
      <label className="field">服务评分<select name="stars"><option value="5">★★★★★ 很满意</option><option value="4">★★★★ 满意</option><option value="3">★★★ 一般</option><option value="2">★★ 不太满意</option><option value="1">★ 不满意</option></select></label>
      <div className="tag-picker">
        <span>快捷标签（可多选）</span>
        <div className="tag-opts">
          {REVIEW_TAGS.map((t) => (
            <label key={t} className="tag-opt"><input type="checkbox" name="tag" value={t} />{t}</label>
          ))}
        </div>
      </div>
      <label className="field">评价<textarea name="text" maxLength={200} placeholder="准时、沟通、物品完好，都可以说一说" /></label>
      <div className="actions"><Btn type="submit">提交评价</Btn></div>
    </form>
  </>
}

function reportDelivererModal(target: User, dispatch: any, setModal: any) {
  return <>
    <button className="modal-close">×</button>
    <h2>举报 {target.name}</h2>
    <p>请说明举报原因，校园管理员会核实处理。恶意举报也会被记录。</p>
    <form onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); dispatch('reportDeliverer', target.id, { reason: d.get('reason') }); setModal(null); }}>
      <label className="field">举报原因<textarea name="reason" required maxLength={300} placeholder="例如：交付物品破损、虚假接单、态度恶劣…" /></label>
      <div className="actions"><Btn kind="soft" type="submit">提交举报</Btn></div>
    </form>
  </>
}

function blockDelivererModal(target: User, dispatch: any, currentUser: User, setModal: any) {
  const already = currentUser.blocked.includes(target.id)
  return <>
    <button className="modal-close">×</button>
    <h2>{already ? '取消拉黑' : '拉黑'} {target.name}？</h2>
    <p>{already ? '取消拉黑后，你将重新看到 TA 发布的任务。' : '拉黑后，你将不再看到 TA 发布的任务，TA 也无法接你的单。'}</p>
    <div className="actions">
      <Btn kind="soft" onClick={() => { dispatch('blockDeliverer', target.id); setModal(null); }}>{already ? '取消拉黑' : '确认拉黑'}</Btn>
      <Btn kind="secondary" onClick={() => setModal(null)}>再想想</Btn>
    </div>
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
