import { useCallback, useEffect, useState } from 'react'
import type { AppState } from './domain'
import { act, seed } from './domain'

const STORAGE_KEY = 'campuspal_demo_v3'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.version === 1) return parsed
    }
  } catch {
    /* ignore */
  }
  return seed()
}

const TOAST_MSG: Record<string, string> = {
  publish: '任务已发布，模拟预付款已进入待结算',
  accept: '接单成功！可在订单中提交交付',
  deliver: '交付凭证已提交，请切换发布者确认收货',
  confirm: '收货已确认，模拟结算完成',
  dispute: '申诉已提交，资金暂停结算',
  cancel: '取消成功，模拟预付款已退回',
  submitCert: '学生卡已提交审核，请切换管理员审核',
  approveCert: '审核通过，认证已更新',
  resolvePay: '平台裁决完成，款项已模拟结算',
  resolveRefund: '平台裁决完成，模拟退款已到账',
  review: '评价已记录，双方提交后公开',
  reviewDeliverer: '评论已提交',
  reportDeliverer: '举报已提交，管理员会尽快处理',
  blockDeliverer: '已拉黑该送货员',
  resolveReport: '举报已处理',
}

export function useAppStore() {
  const [state, setState] = useState<AppState>(load)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* ignore */
    }
  }, [state])

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2800)
  }, [])

  const dispatch = useCallback(
    (command: string, id: string, data: Record<string, any> = {}) => {
      const next = structuredClone(state)
      try {
        const result = act(next, command, id, data)
        setState(next)
        showToast(TOAST_MSG[command] || '操作完成')
        return result
      } catch (e) {
        showToast((e as Error).message)
        return false
      }
    },
    [state, showToast],
  )

  const setUser = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, user: id }))
    },
    [],
  )

  const setNow = useCallback((date: string) => {
    setState((prev) => ({ ...prev, now: date + 'T14:00:00+08:00' }))
  }, [])

  const reset = useCallback(() => {
    setState(seed())
  }, [])

  const currentUser = state.users.find((u) => u.id === state.user)!

  return { state, currentUser, toast, dispatch, setUser, setNow, reset }
}
