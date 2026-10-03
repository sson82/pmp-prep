import type { StoreData } from '../types'
import { MAX_HISTORY, pack, unpack, type CloudSync, type CompactAttempt, type SyncStatus } from './cloud'

/**
 * GitHub Gist 동기화 (GitHub Pages 등 claude.ai 밖에서 열었을 때).
 * 사용자가 기기마다 gist 권한 토큰을 한 번 입력하면, 본인 계정의 비공개 Gist 파일 하나에
 * 진행 데이터를 저장해 PC·모바일이 같은 기록을 쓴다. 토큰은 해당 기기 브라우저에만 저장된다.
 */

const CONFIG_KEY = 'pmp-prep:gist'
const FILE = 'pmp-progress.json'
const DESCRIPTION = 'pmp-prep-sync (PMP Exam Prep 학습 기록)'
const API = 'https://api.github.com'

export interface GistConfig {
  token: string
  gistId?: string
}

export function loadGistConfig(): GistConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    return raw ? (JSON.parse(raw) as GistConfig) : null
  } catch {
    return null
  }
}

export function saveGistConfig(c: GistConfig | null) {
  try {
    if (c) localStorage.setItem(CONFIG_KEY, JSON.stringify(c))
    else localStorage.removeItem(CONFIG_KEY)
  } catch {
    // ignore
  }
}

type Remote = Partial<StoreData> & { updatedAt?: number }
interface GistFile {
  content?: string
  truncated?: boolean
  raw_url?: string
}

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', ...init?.headers },
  })
  if (!res.ok) throw new Error(res.status === 401 ? '토큰이 올바르지 않거나 만료되었습니다.' : `GitHub API 오류 (${res.status})`)
  return res.json() as Promise<Record<string, unknown>>
}

/** 토큰 확인 후 기존 동기화 Gist를 찾거나 새로 만든다 */
export async function connectGist(token: string): Promise<GistConfig> {
  const list = (await gh(token, '/gists?per_page=100')) as unknown as { id: string; description: string | null; files: Record<string, unknown> }[]
  const found = list.find((g) => g.files[FILE])
  if (found) return { token, gistId: found.id }
  const created = await gh(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({ description: DESCRIPTION, public: false, files: { [FILE]: { content: '{}' } } }),
  })
  return { token, gistId: created.id as string }
}

async function pull(c: Required<GistConfig>): Promise<{ text: string; remote: Remote }> {
  const g = await gh(c.token, `/gists/${c.gistId}`)
  const f = (g.files as Record<string, GistFile>)[FILE]
  let text = f?.content ?? '{}'
  if (f?.truncated && f.raw_url) text = await (await fetch(f.raw_url)).text()
  const body = JSON.parse(text || '{}') as Remote & { a?: CompactAttempt[] }
  return { text, remote: { ...body, attempts: body.a?.map(unpack) } }
}

export function startGistSync(config: GistConfig, onRemote: (r: Remote) => void, onStatus: (s: SyncStatus) => void): CloudSync | null {
  if (!config.token || !config.gistId) return null
  const c = config as Required<GistConfig>
  let lastText = ''
  let stopped = false

  const refresh = async () => {
    try {
      const { text, remote } = await pull(c)
      if (stopped) return
      if (text !== lastText) {
        lastText = text
        onRemote(remote)
      }
      onStatus('synced')
    } catch {
      if (!stopped) onStatus('error')
    }
  }

  onStatus('connecting')
  void refresh()
  const onVisible = () => document.visibilityState === 'visible' && void refresh()
  document.addEventListener('visibilitychange', onVisible)

  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { data: StoreData; updatedAt: number } | undefined
  let writing = false

  const flush = async () => {
    if (writing || !pending || stopped) return
    const { data, updatedAt } = pending
    pending = undefined
    writing = true
    try {
      // 다른 기기가 먼저 쓴 내용이 있으면 덮어쓰지 않고 병합부터 한다(병합 결과가 다시 push된다)
      const latest = await pull(c)
      if (latest.text !== lastText) {
        lastText = latest.text
        onRemote(latest.remote)
        return
      }
      const text = JSON.stringify({
        cards: data.cards,
        settings: data.settings,
        customQuestions: data.customQuestions,
        updatedAt,
        a: data.attempts.slice(-MAX_HISTORY).map(pack),
      })
      if (text === lastText) return
      onStatus('saving')
      await gh(c.token, `/gists/${c.gistId}`, { method: 'PATCH', body: JSON.stringify({ files: { [FILE]: { content: text } } }) })
      lastText = text
      onStatus('synced')
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
      timer = setTimeout(() => void flush(), 3000)
    },
    stop() {
      stopped = true
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    },
  }
}
