import type { Question, StoreData } from '../types'
import { MAX_HISTORY, pack, unpack, type CloudSync, type CompactAttempt, type SyncStatus } from './cloud'

/**
 * 자체 서버(Render) 모드. 앱이 PMP Prep 서버에서 열렸을 때만 동작한다.
 * GitHub Pages·claude.ai 에서는 /api 가 없으므로 'none'.
 */
export type ServerMode = 'none' | 'login' | 'ready'

export async function detectServer(): Promise<ServerMode> {
  try {
    const res = await fetch('/api/me', { credentials: 'same-origin' })
    if (res.status === 401) return 'login'
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return 'ready'
  } catch {
    // 네트워크 오류: 서버 없음으로 간주
  }
  return 'none'
}

export async function login(password: string): Promise<void> {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? '로그인 실패')
}

export async function logout(): Promise<void> {
  await fetch('/api/logout', { method: 'POST' })
}

/** 서버 DB에 저장된 비공개 문항(학원 자료 등) */
export async function fetchServerQuestions(): Promise<Question[]> {
  const res = await fetch('/api/questions')
  return res.ok ? ((await res.json()) as Question[]) : []
}

type Remote = Partial<StoreData> & { updatedAt?: number }
interface ProgressBody {
  cards?: StoreData['cards']
  settings?: StoreData['settings']
  customQuestions?: Question[]
  updatedAt?: number
  a?: CompactAttempt[]
}

const toRemote = (b: ProgressBody | null): Remote => (b ? { ...b, attempts: b.a?.map(unpack) } : {})

export function startServerSync(onRemote: (r: Remote) => void, onStatus: (s: SyncStatus) => void): CloudSync {
  let version = 0
  let lastSent = ''
  let stopped = false
  let first = true

  const pull = async () => {
    try {
      const res = await fetch('/api/progress', { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as { data: ProgressBody | null; version: number }
      if (stopped) return
      // 첫 동기화는 서버가 비어 있어도 병합을 일으켜 이 기기 기록을 올리게 한다
      if (first || body.version !== version) {
        first = false
        version = body.version
        onRemote(toRemote(body.data))
      }
      onStatus('synced')
    } catch {
      if (!stopped) onStatus('error')
    }
  }

  onStatus('connecting')
  void pull()
  // 다른 기기에서 공부하고 돌아왔을 때 최신 기록 반영
  const onVisible = () => document.visibilityState === 'visible' && void pull()
  document.addEventListener('visibilitychange', onVisible)

  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { data: StoreData; updatedAt: number } | undefined
  let writing = false

  const flush = async () => {
    if (writing || !pending || stopped) return
    const { data, updatedAt } = pending
    pending = undefined
    const body: ProgressBody = {
      cards: data.cards,
      settings: data.settings,
      customQuestions: data.customQuestions,
      updatedAt,
      a: data.attempts.slice(-MAX_HISTORY).map(pack),
    }
    const text = JSON.stringify(body)
    if (text === lastSent) return
    writing = true
    onStatus('saving')
    try {
      const res = await fetch('/api/progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: body, version }),
      })
      if (res.status === 409) {
        // 다른 기기가 먼저 저장함: 최신본을 병합하면 useStore가 병합 결과를 다시 push한다
        const cur = (await res.json()) as { data: ProgressBody; version: number }
        version = cur.version
        onRemote(toRemote(cur.data))
      } else if (res.ok) {
        version = ((await res.json()) as { version: number }).version
        lastSent = text
        onStatus('synced')
      } else throw new Error(String(res.status))
    } catch {
      onStatus('error')
    } finally {
      writing = false
      if (pending) void flush()
    }
  }

  return {
    push(data, updatedAt) {
      pending = { data, updatedAt }
      clearTimeout(timer)
      timer = setTimeout(() => void flush(), 1500)
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    },
  }
}
