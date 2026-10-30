import { useMemo, useState, type CSSProperties } from 'react'
import type { Task, TaskType } from './types'
import { CREDIT_RULES, LEVEL_COLOR, getCreditLevel } from './types'
import { STATUS_TEXT, TYPE_ICON, useAppStore, type NewTaskInput } from './store'

type Tab = 'hall' | 'publish' | 'tasks' | 'credit' | 'me'

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'hall', label: '任务大厅', icon: '🏠' },
  { key: 'publish', label: '发布', icon: '➕' },
  { key: 'tasks', label: '我的任务', icon: '📋' },
  { key: 'credit', label: '信用', icon: '🛡️' },
  { key: 'me', label: '我的', icon: '👤' },
]

const TYPE_FILTERS: (TaskType | '全部')[] = ['全部', '快递', '代买', '占座', '带饭', '打印', '其他']

export default function App() {
  const store = useAppStore()
  const [tab, setTab] = useState<Tab>('hall')
  const [detailId, setDetailId] = useState<string | null>(null)

  const detailTask = useMemo(
    () => store.tasks.find((t) => t.id === detailId) ?? null,
    [store.tasks, detailId],
  )

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-brand">
          <span className="logo">🏃</span>
          <div>
            <h1>校园帮</h1>
            <p>CampusPal · 可信赖的校园跑腿互助</p>
          </div>
        </div>
        <div className="credit-pill" onClick={() => setTab('credit')}>
          <span className="credit-pill-icon">🛡️</span>
          <span>{store.me.creditScore}</span>
        </div>
      </header>

      <main className="content">
        {tab === 'hall' && <Hall store={store} onOpen={setDetailId} />}
        {tab === 'publish' && <Publish store={store} onDone={() => setTab('hall')} />}
        {tab === 'tasks' && <MyTasks store={store} onOpen={setDetailId} />}
        {tab === 'credit' && <Credit store={store} />}
        {tab === 'me' && <Me store={store} />}
      </main>

      <nav className="tabbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={'tab' + (tab === t.key ? ' active' : '')}
            onClick={() => setTab(t.key)}
          >
            <span className="tab-icon">{t.icon}</span>
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      {detailTask && (
        <TaskDetail task={detailTask} store={store} onClose={() => setDetailId(null)} />
      )}

      {store.toast && <div className="toast">{store.toast}</div>}
    </div>
  )
}

// ===== 任务大厅 =====
function Hall({
  store,
  onOpen,
}: {
  store: ReturnType<typeof useAppStore>
  onOpen: (id: string) => void
}) {
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>('全部')
  const [sort, setSort] = useState<'最新' | '价格' | '紧急'>('最新')

  const list = useMemo(() => {
    let arr = store.tasks.filter((t) => t.status === 'open')
    if (filter !== '全部') arr = arr.filter((t) => t.type === filter)
    if (sort === '价格') arr = [...arr].sort((a, b) => b.price - a.price)
    else if (sort === '紧急') arr = [...arr].sort((a, b) => Number(b.urgent) - Number(a.urgent))
    else arr = [...arr].sort((a, b) => b.createdAt - a.createdAt)
    return arr
  }, [store.tasks, filter, sort])

  return (
    <div className="page">
      <div className="filter-row">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            className={'chip' + (filter === f ? ' active' : '')}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="sort-row">
        <span>共 {list.length} 个可接任务</span>
        <div className="sort-btns">
          {(['最新', '价格', '紧急'] as const).map((s) => (
            <button
              key={s}
              className={'sort' + (sort === s ? ' active' : '')}
              onClick={() => setSort(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState text="暂无任务，去发布一个吧～" />
      ) : (
        <div className="task-list">
          {list.map((t) => (
            <TaskCard key={t.id} task={t} onClick={() => onOpen(t.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const level = getCreditLevel(task.publisher.creditScore)
  return (
    <div className="task-card" onClick={onClick}>
      <div className="task-card-top">
        <span className="task-type">
          {TYPE_ICON[task.type]} {task.type}
        </span>
        {task.urgent && <span className="badge-urgent">⚡ 紧急</span>}
      </div>
      <h3 className="task-title">{task.title}</h3>
      <p className="task-desc">{task.description}</p>
      <div className="task-meta">
        <span>📍 {task.location}</span>
        <span>⏰ {task.deadline}</span>
      </div>
      <div className="task-card-bottom">
        <div className="publisher">
          <span className="publisher-avatar">{task.publisher.avatar}</span>
          <div>
            <span className="publisher-name">
              {task.publisher.name}
              {task.publisher.verified && <i className="verified">✓</i>}
            </span>
            <span className="publisher-credit" style={{ color: LEVEL_COLOR[level] }}>
              {level} · {task.publisher.creditScore} 分
            </span>
          </div>
        </div>
        <div className="task-price">¥{task.price}</div>
      </div>
    </div>
  )
}

// ===== 发布任务 =====
function Publish({
  store,
  onDone,
}: {
  store: ReturnType<typeof useAppStore>
  onDone: () => void
}) {
  const [form, setForm] = useState<NewTaskInput>({
    type: '快递',
    title: '',
    description: '',
    price: 5,
    location: '',
    deliverTo: '',
    deadline: '',
    urgent: false,
  })

  const set = <K extends keyof NewTaskInput>(k: K, v: NewTaskInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const canSubmit = form.title.trim() && form.location.trim() && form.deadline.trim()

  return (
    <div className="page">
      <h2 className="page-title">发布跑腿任务</h2>
      <p className="page-sub">填写需求，让靠谱的同学帮你跑腿</p>

      <div className="form">
        <label className="field">
          <span>任务类型</span>
          <div className="type-picker">
            {(['快递', '代买', '占座', '带饭', '打印', '其他'] as TaskType[]).map((t) => (
              <button
                key={t}
                className={'type-opt' + (form.type === t ? ' active' : '')}
                onClick={() => set('type', t)}
              >
                {TYPE_ICON[t]} {t}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>任务标题</span>
          <input
            placeholder="例如：代取一个快递"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
        </label>

        <label className="field">
          <span>任务描述</span>
          <textarea
            placeholder="补充细节：物品大小、时间要求、注意事项…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
          />
        </label>

        <label className="field">
          <span>跑腿费（元）</span>
          <input
            type="number"
            min={1}
            value={form.price}
            onChange={(e) => set('price', Number(e.target.value))}
          />
        </label>

        <label className="field">
          <span>办事地点</span>
          <input
            placeholder="例如：顺丰快递驿站"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
          />
        </label>

        <label className="field">
          <span>送达地点</span>
          <input
            placeholder="例如：3 号宿舍楼下"
            value={form.deliverTo}
            onChange={(e) => set('deliverTo', e.target.value)}
          />
        </label>

        <label className="field">
          <span>截止时间</span>
          <input
            placeholder="例如：今天 18:00 前"
            value={form.deadline}
            onChange={(e) => set('deadline', e.target.value)}
          />
        </label>

        <label className="field-inline">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) => set('urgent', e.target.checked)}
          />
          <span>标记为紧急任务</span>
        </label>

        <button
          className="btn-primary"
          disabled={!canSubmit}
          onClick={() => {
            store.publishTask(form)
            onDone()
          }}
        >
          发布任务
        </button>
      </div>
    </div>
  )
}

// ===== 我的任务 =====
function MyTasks({
  store,
  onOpen,
}: {
  store: ReturnType<typeof useAppStore>
  onOpen: (id: string) => void
}) {
  const published = store.tasks.filter((t) => t.publisher.id === 'me')
  const running = store.tasks.filter((t) => t.runner?.id === 'me')

  return (
    <div className="page">
      <h2 className="page-title">我的任务</h2>

      <section className="section">
        <h3 className="section-title">我发布的</h3>
        {published.length === 0 ? (
          <EmptyState text="还没有发布过任务" />
        ) : (
          published.map((t) => (
            <MiniTask key={t.id} task={t} onClick={() => onOpen(t.id)} />
          ))
        )}
      </section>

      <section className="section">
        <h3 className="section-title">我接的单</h3>
        {running.length === 0 ? (
          <EmptyState text="还没有接过任务，去大厅看看吧" />
        ) : (
          running.map((t) => (
            <MiniTask key={t.id} task={t} onClick={() => onOpen(t.id)} />
          ))
        )}
      </section>
    </div>
  )
}

function MiniTask({ task, onClick }: { task: Task; onClick: () => void }) {
  return (
    <div className="mini-task" onClick={onClick}>
      <span className="task-type">{TYPE_ICON[task.type]}</span>
      <div className="mini-task-body">
        <span className="mini-task-title">{task.title}</span>
        <span className="mini-task-sub">
          ¥{task.price} · {task.deadline}
        </span>
      </div>
      <span className={'status status-' + task.status}>{STATUS_TEXT[task.status]}</span>
    </div>
  )
}

// ===== 信用体系 =====
function Credit({ store }: { store: ReturnType<typeof useAppStore> }) {
  const me = store.me
  const level = getCreditLevel(me.creditScore)
  const pct = Math.min(100, me.creditScore / 10)

  return (
    <div className="page">
      <h2 className="page-title">信用体系</h2>

      <div className="credit-card">
        <div className="credit-score-row">
          <div>
            <span className="credit-level" style={{ color: LEVEL_COLOR[level] }}>
              {level}跑腿侠
            </span>
            <div className="credit-score">{me.creditScore}</div>
            <span className="credit-score-label">信用分</span>
          </div>
          <div className="credit-ring" style={{ '--pct': pct + '%' } as CSSProperties}>
            <div className="credit-ring-inner">
              <span>{level}</span>
            </div>
          </div>
        </div>
        <div className="credit-stats">
          <div>
            <b>{me.completedCount}</b>
            <span>完成单数</span>
          </div>
          <div>
            <b>{me.completionRate}%</b>
            <span>完成率</span>
          </div>
          <div>
            <b>{me.avgRating}</b>
            <span>平均评分</span>
          </div>
        </div>
      </div>

      <section className="section">
        <h3 className="section-title">信用分如何积累</h3>
        <div className="rule-list">
          {CREDIT_RULES.map((r) => (
            <div key={r.action} className="rule">
              <span className="rule-icon">{r.icon}</span>
              <span className="rule-action">{r.action}</span>
              <span className={'rule-delta' + (r.delta.startsWith('-') ? ' neg' : '')}>
                {r.delta}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h3 className="section-title">为什么可信？</h3>
        <div className="trust-list">
          <div className="trust">
            <span>🎓</span>
            <div>
              <b>学号实名认证</b>
              <p>所有用户需完成本校学号实名，杜绝校外人员</p>
            </div>
          </div>
          <div className="trust">
            <span>🔒</span>
            <div>
              <b>双向担保机制</b>
              <p>跑腿费由平台托管，完成验收后结算</p>
            </div>
          </div>
          <div className="trust">
            <span>⭐</span>
            <div>
              <b>双向评价</b>
              <p>发布者与跑腿者互评，信用可追溯</p>
            </div>
          </div>
          <div className="trust">
            <span>🚫</span>
            <div>
              <b>违约惩罚</b>
              <p>接单违约扣 50 信用分，多次封禁</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

// ===== 个人中心 =====
function Me({ store }: { store: ReturnType<typeof useAppStore> }) {
  const me = store.me
  const level = getCreditLevel(me.creditScore)
  return (
    <div className="page">
      <div className="profile-card">
        <div className="profile-avatar">{me.avatar}</div>
        <div className="profile-info">
          <h2>
            {me.name}
            {me.verified && <i className="verified big">✓</i>}
          </h2>
          <p>
            {me.school} · {me.major}
          </p>
          <span className="profile-level" style={{ color: LEVEL_COLOR[level] }}>
            {level}跑腿侠 · {me.creditScore} 信用分
          </span>
        </div>
      </div>

      {!me.verified && (
        <div className="verify-banner" onClick={store.verify}>
          <span>🎓 完成学号实名认证，信用分 +100，解锁更多任务</span>
          <button className="btn-small">去认证</button>
        </div>
      )}

      <div className="stat-grid">
        <div className="stat">
          <b>{me.publishedCount}</b>
          <span>发布</span>
        </div>
        <div className="stat">
          <b>{me.completedCount}</b>
          <span>完成</span>
        </div>
        <div className="stat">
          <b>{me.completionRate}%</b>
          <span>完成率</span>
        </div>
        <div className="stat">
          <b>{me.avgRating}</b>
          <span>评分</span>
        </div>
      </div>

      <section className="section">
        <h3 className="section-title">产品说明</h3>
        <div className="about-card">
          <p>
            <b>校园帮 CampusPal</b> 是面向高校的跑腿互助平台，解决「代取快递、代买物品、代占座」等日常需求。
          </p>
          <p>
            核心机制：<b>实名认证 + 信用分 + 双向评价</b>，让陌生人之间也能放心互助。
          </p>
        </div>
      </section>
    </div>
  )
}

// ===== 任务详情（底部弹层） =====
function TaskDetail({
  task,
  store,
  onClose,
}: {
  task: Task
  store: ReturnType<typeof useAppStore>
  onClose: () => void
}) {
  const [rating, setRating] = useState(5)
  const [reviewText, setReviewText] = useState('')
  const isPublisher = task.publisher.id === 'me'
  const isRunner = task.runner?.id === 'me'
  const level = getCreditLevel(task.publisher.creditScore)

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <span className="task-type big">
            {TYPE_ICON[task.type]} {task.type}
          </span>
          <span className={'status status-' + task.status}>{STATUS_TEXT[task.status]}</span>
        </div>
        <h2 className="sheet-title">{task.title}</h2>
        <p className="sheet-desc">{task.description}</p>

        <div className="sheet-price">¥{task.price}</div>

        <div className="sheet-info">
          <div className="info-row">
            <span>📍 办事</span>
            <b>{task.location}</b>
          </div>
          <div className="info-row">
            <span>📬 送达</span>
            <b>{task.deliverTo}</b>
          </div>
          <div className="info-row">
            <span>⏰ 截止</span>
            <b>{task.deadline}</b>
          </div>
          <div className="info-row">
            <span>🎁 完成奖励</span>
            <b>+{task.rewardCredit} 信用分</b>
          </div>
        </div>

        <div className="sheet-publisher">
          <span className="publisher-avatar big">{task.publisher.avatar}</span>
          <div>
            <div>
              {task.publisher.name}
              {task.publisher.verified && <i className="verified">✓</i>}
            </div>
            <span className="publisher-credit" style={{ color: LEVEL_COLOR[level] }}>
              {level} · {task.publisher.creditScore} 分 · 完成 {task.publisher.completedCount} 单
            </span>
          </div>
        </div>

        {task.runner && (
          <div className="runner-row">
            <span>🏃 接单者</span>
            <b>
              {task.runner.avatar} {task.runner.name}
              {task.runner.verified && <i className="verified">✓</i>}
            </b>
          </div>
        )}

        {/* 评价展示 */}
        {task.reviews.length > 0 && (
          <div className="reviews">
            <h4>评价</h4>
            {task.reviews.map((r) => (
              <div key={r.id} className="review">
                <span>{r.fromAvatar}</span>
                <div>
                  <b>
                    {'★'.repeat(r.rating)}
                    {'☆'.repeat(5 - r.rating)} {r.fromName}
                  </b>
                  <p>{r.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作区 */}
        <div className="sheet-actions">
          {task.status === 'open' && !isPublisher && (
            <button className="btn-primary" onClick={() => store.acceptTask(task.id)}>
              接单跑腿
            </button>
          )}
          {task.status === 'open' && isPublisher && (
            <button className="btn-ghost" onClick={() => store.cancelTask(task.id)}>
              取消任务
            </button>
          )}
          {task.status === 'inProgress' && isRunner && (
            <button className="btn-primary" onClick={() => store.finishTask(task.id)}>
              标记完成，等待验收
            </button>
          )}
          {task.status === 'pendingConfirm' && isPublisher && (
            <>
              <div className="review-box">
                <div className="star-row">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={'star' + (n <= rating ? ' on' : '')}
                      onClick={() => setRating(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <input
                  placeholder="给跑腿同学一句评价（选填）"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                />
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  store.reviewTask(task.id, rating, reviewText || '很棒，值得信赖！')
                  store.confirmTask(task.id)
                }}
              >
                验收并完成
              </button>
            </>
          )}
          {task.status === 'completed' && <div className="done-tip">✅ 任务已完成，感谢互助！</div>}
        </div>
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty">{text}</div>
}
