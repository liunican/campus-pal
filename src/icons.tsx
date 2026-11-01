// ===== 自绘 SVG 图标（stroke 风格，随文字色）=====

const PATHS: Record<string, string> = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  plus: 'M12 5v14M5 12h14',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  shield: 'M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
  wallet: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM16 12h.01M3 7l0 10',
  box: 'M3 8l9-5 9 5v9l-9 5-9-5zM3 8l9 5 9-5M12 13v9M7.5 5.5l9 5',
  coffee: 'M4 8h12v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM16 9h2.5a2.5 2.5 0 0 1 0 5H16M7 2v2M12 2v2',
  book: 'M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 0-3 3zM4 4v16M4 4a3 3 0 0 1 3-3h9',
  plane: 'M3 11l18-7-7 18-4-8-8-3zM11 14l7-7',
  seat: 'M6 12V6a2 2 0 0 1 4 0v6M10 12V6a2 2 0 0 1 4 0v6M6 12h8v6H6zM5 18h10v3',
  search: 'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0z',
  clock: 'M12 8v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z',
  pin: 'M12 22s8-8 8-13a8 8 0 1 0-16 0c0 5 8 13 8 13zM15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12l4 4L20 5',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM4 22v-3a8 8 0 0 1 16 0v3',
  grad: 'M2 9l10-6 10 6-10 6zM6 12v6c4 3 8 3 12 0v-6M22 9v9',
  star: 'M12 3l2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.8L6.6 20l1-6L3.3 9.4l6-.9z',
  chat: 'M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v6M12 16h.01',
}

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] || PATHS.box} />
    </svg>
  )
}

export const KIND_ICON: Record<string, string> = {
  快递代取: 'box',
  餐食代买: 'coffee',
  打印代取: 'book',
  校内送物: 'plane',
  占座: 'seat',
}

// ===== 香港大学校徽（简化盾形徽章）=====
export function Crest({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.18)} viewBox="0 0 100 118" fill="none" aria-hidden="true">
      {/* 盾形 */}
      <path
        d="M50 4 L92 14 V58 C92 84 74 98 50 112 C26 98 8 84 8 58 V14 Z"
        fill="#0b4f3a"
        stroke="#c9a227"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* 顶部皇冠（简化） */}
      <path d="M38 16 h24 l-2 6 h-20 Z" fill="#c9a227" />
      <circle cx="50" cy="15" r="2.5" fill="#c9a227" />
      {/* 打开的书 */}
      <path
        d="M50 36 C41 30 29 28 19 31 V60 C29 57 41 59 50 65 C59 59 71 57 81 60 V31 C71 28 59 30 50 36 Z"
        fill="#c9a227"
      />
      <line x1="50" y1="36" x2="50" y2="65" stroke="#0b4f3a" strokeWidth="2" />
      {/* 底部丝带 + 校训 */}
      <path d="M28 82 H72 V92 H28 Z" fill="#c9a227" />
      <text x="50" y="89.5" textAnchor="middle" fill="#0b4f3a" fontSize="7.5" fontWeight="700" fontFamily="serif">
        明德格物
      </text>
    </svg>
  )
}

// ===== 港大本部大楼剪影（半透明背景装饰）=====
export function BuildingArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 240" className={className} fill="currentColor" aria-hidden="true">
      {/* 中央钟楼（Campanile） */}
      <path d="M186 36 H214 V204 H186 Z" />
      <path d="M186 36 L200 8 L214 36 Z" />
      <path d="M192 24 h16 v8 h-16 Z" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* 钟楼窗户 */}
      <rect x="192" y="56" width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="192" y="96" width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
      {/* 左侧翼楼 */}
      <rect x="76" y="108" width="110" height="96" />
      <path d="M86 108 v-12 h90 v12" />
      {[124, 152].map((y) => (
        <g key={y}>
          <rect x="90" y={y} width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="150" y={y} width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
        </g>
      ))}
      {/* 右侧翼楼 */}
      <rect x="214" y="108" width="110" height="96" />
      <path d="M224 108 v-12 h90 v12" />
      {[124, 152].map((y) => (
        <g key={y}>
          <rect x="228" y={y} width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
          <rect x="288" y={y} width="16" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
        </g>
      ))}
      {/* 地基 */}
      <rect x="56" y="204" width="288" height="12" />
      <rect x="46" y="216" width="308" height="10" />
    </svg>
  )
}
