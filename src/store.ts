import { useCallback, useEffect, useState } from 'react'
import type { Task, TaskStatus, TaskType, User } from './types'
import { INITIAL_TASKS, ME } from './data'

const STORAGE_KEY = 'campuspal_tasks_v1'

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignore */
  }
  return INITIAL_TASKS
}

// 状态文案 + 颜色
export const STATUS_TEXT: Record<TaskStatus, string> = {
  open: '待接单',
  inProgress: '进行中',
  pendingConfirm: '待验收',
  completed: '已完成',
  cancelled: '已取消',
}

export const TYPE_ICON: Record<TaskType, string> = {
  快递: '📦',
  代买: '🛍️',
  占座: '🪑',
  带饭: '🍱',
  打印: '🖨️',
  其他: '📌',
}

export interface NewTaskInput {
  type: TaskType
  title: string
  description: string
  price: number
  location: string
  deliverTo: string
  deadline: string
  urgent: boolean
}

export function useAppStore() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks)
  const [me, setMe] = useState<User>(ME)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2200)
  }, [])

  // 发布任务
  const publishTask = useCallback(
    (input: NewTaskInput) => {
      const task: Task = {
        id: 't' + Date.now(),
        ...input,
        status: 'open',
        publisher: me,
        createdAt: Date.now(),
        rewardCredit: 10,
        reviews: [],
      }
      setTasks((prev) => [task, ...prev])
      setMe((prev) => ({ ...prev, publishedCount: prev.publishedCount + 1 }))
      showToast('✅ 任务发布成功，等待同学接单')
    },
    [me, showToast],
  )

  // 接单
  const acceptTask = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'inProgress', runner: me } : t)),
      )
      showToast('🤝 接单成功，请及时完成跑腿')
    },
    [me, showToast],
  )

  // 跑腿完成 → 待验收
  const finishTask = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'pendingConfirm' } : t)),
      )
      showToast('🏁 已标记完成，等待发布者验收')
    },
    [showToast],
  )

  // 发布者验收 → 完成 + 信用分增加
  const confirmTask = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, status: 'completed', completedAt: Date.now() }
            : t,
        ),
      )
      setMe((prev) => ({
        ...prev,
        creditScore: prev.creditScore + 10,
        completedCount: prev.completedCount + 1,
      }))
      showToast('🎉 验收完成，信用分 +10')
    },
    [showToast],
  )

  // 取消任务（仅发布者可取消未接单的任务）
  const cancelTask = useCallback(
    (taskId: string) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' } : t)),
      )
      showToast('任务已取消')
    },
    [showToast],
  )

  // 评价（完成后发布者对跑腿者评分）
  const reviewTask = useCallback(
    (taskId: string, rating: number, content: string) => {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                reviews: [
                  ...t.reviews,
                  {
                    id: 'r' + Date.now(),
                    fromName: t.publisher.name,
                    fromAvatar: t.publisher.avatar,
                    rating,
                    content,
                    date: new Date().toLocaleDateString('zh-CN'),
                  },
                ],
              }
            : t,
        ),
      )
      setMe((prev) =>
        rating === 5
          ? { ...prev, creditScore: prev.creditScore + 5 }
          : prev,
      )
      showToast('⭐ 评价已提交')
    },
    [showToast],
  )

  // 模拟学号实名认证
  const verify = useCallback(() => {
    setMe((prev) => ({ ...prev, verified: true, creditScore: prev.creditScore + 100 }))
    showToast('🎓 实名认证成功，信用分 +100')
  }, [showToast])

  return {
    tasks,
    me,
    toast,
    publishTask,
    acceptTask,
    finishTask,
    confirmTask,
    cancelTask,
    reviewTask,
    verify,
  }
}
