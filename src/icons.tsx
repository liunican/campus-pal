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
