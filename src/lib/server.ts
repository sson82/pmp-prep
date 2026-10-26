import type { Question, StoreData } from '../types'
import { MAX_HISTORY, pack, unpack, type CloudSync, type CompactAttempt, type SyncStatus } from './cloud'

/**
 * 자체 서버(Render) 모드. 앱이 PMP Prep 서버에서 열렸을 때만 동작한다.
 * GitHub Pages·claude.ai 에서는 /api 가 없으므로 'none'.
 */
export type ServerMode = 'none' | 'login' | 'ready'

/**
 * API 서버 주소. GitHub Pages 빌드는 VITE_API_BASE(Render 주소)를 넣고, 같은 서버에서 열리면 ''.
 * 인증은 로그인 때 받은 토큰을 이 기기에 저장해 Authorization 헤더로 보낸다(쿠키는 다른 도메인이라 Safari 등에서 막힘).
 */
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''
const TOKEN_KEY = 'pmp-prep:token'
const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}
function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  const t = getToken()
  if (t) headers.set('Authorization', `Bearer ${t}`)
  return fetch(API_BASE + path, { ...init, headers, credentials: API_BASE ? 'omit' : 'same-origin' })
}

export async function detectServer(): Promise<ServerMode> {
  try {
    // 무료 서버는 잠들어 있으면 깨어나는 데 30초쯤 걸린다
    const res = await api('/api/me', { signal: AbortSignal.timeout(60_000) })
    if (res.status === 401) return 'login'
    if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) return 'ready'
  } catch {
    // 네트워크 오류: 서버 없음으로 간주
  }
  return 'none'
}

export async function login(password: string): Promise<void> {
  const res = await api('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string; token?: string }
  if (!res.ok) throw new Error(body.error ?? '로그인 실패')
  try {
    if (body.token) localStorage.setItem(TOKEN_KEY, body.token)
  } catch {
    // 저장 불가 시 쿠키(같은 서버일 때)로만 동작
  }
}

export async function logout(): Promise<void> {
  await api('/api/logout', { method: 'POST' }).catch(() => undefined)
  // 로그아웃한 기기에는 비공개 문항을 남기지 않는다
  try {
    localStorage.removeItem('pmp-prep:server-questions')
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

const Q_CACHE = 'pmp-prep:server-questions'

/** 이 기기에 저장해 둔 서버 문항 (다음 접속 때 즉시 표시용) */
export function cachedServerQuestions(): Question[] {
  try {
    return JSON.parse(localStorage.getItem(Q_CACHE) ?? '[]') as Question[]
  } catch {
    return []
  }
}

/** 서버 DB에 저장된 비공개 문항(학원 자료 등). 받으면 기기 캐시도 갱신 */
export async function fetchServerQuestions(): Promise<Question[]> {
  const res = await api('/api/questions')
  if (!res.ok) return cachedServerQuestions()
  const qs = (await res.json()) as Question[]
  try {
    localStorage.setItem(Q_CACHE, JSON.stringify(qs))
  } catch {
    // 저장 공간 부족 시 캐시 없이 동작
  }
  return qs
}

/** 문항을 서버 DB에 추가 (같은 id는 갱신) */
export async function uploadQuestions(qs: Question[]): Promise<number> {
  const res = await api('/api/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(qs) })
  const body = (await res.json()) as { upserted?: number; error?: string }
  if (!res.ok) throw new Error(body.error ?? `업로드 실패 (${res.status})`)
  return body.upserted ?? 0
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
      const res = await api('/api/progress', { cache: 'no-store' })
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
      const res = await api('/api/progress', {
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
