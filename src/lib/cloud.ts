import type { Attempt, CardState, Confidence, SessionMode, StoreData } from '../types'

/**
 * claude.ai 아티팩트로 열렸을 때 사용자별 비공개 저장소(db capability)와 동기화한다.
 * 로컬(localStorage)이 1차 저장소이고, 클라우드는 기기 간 동기화용이다.
 * 일반 브라우저나 로컬 개발 서버에서는 claude 런타임이 없으므로 조용히 비활성화된다.
 *
 * 문서 구조 (본인만 읽기/쓰기 가능한 data/users/<id>/ 하위):
 *   progress: { cards, settings, customQuestions, updatedAt }
 *   history:  { a: CompactAttempt[] }  (최근 MAX_HISTORY개만 보관, 256KiB 문서 한도 대비)
 */

interface DocSnap {
  exists: boolean
  data(): Record<string, unknown> | undefined
}
interface DocRef {
  get(): Promise<DocSnap>
  set(data: Record<string, unknown>): Promise<void>
  onSnapshot(next: (s: DocSnap) => void, error?: (e: { code: string }) => void): () => void
}
interface DB {
  doc(path: string): DocRef
}
interface UserNs {
  id(): Promise<string | null>
}
declare global {
  interface Window {
    claude?: { use(name: string): Promise<unknown> }
  }
}

export const MAX_HISTORY = 3000

export type CompactAttempt = [string, number, 0 | 1, number, string, string, string]
const CONF: Confidence[] = ['low', 'mid', 'high']
const MODES: SessionMode[] = ['review', 'practice', 'wrong', 'mock']

export const pack = (a: Attempt): CompactAttempt => [
  a.qid,
  a.at,
  a.correct ? 1 : 0,
  a.ms,
  a.selected.join(','),
  a.confidence[0],
  a.mode[0],
]
export const unpack = (c: CompactAttempt): Attempt => ({
  qid: c[0],
  at: c[1],
  correct: c[2] === 1,
  ms: c[3],
  selected: c[4] ? c[4].split(',').map(Number) : [],
  confidence: CONF.find((x) => x[0] === c[5]) ?? 'mid',
  mode: MODES.find((x) => x[0] === c[6]) ?? 'practice',
})

/** 두 기기의 진행 데이터를 병합: 카드는 마지막 풀이 시점 기준, 풀이 기록은 합집합 */
export function mergeStores(local: StoreData, remote: Partial<StoreData> & { updatedAt?: number }, localUpdatedAt: number): StoreData {
  const cards: Record<string, CardState> = { ...local.cards }
  for (const [id, rc] of Object.entries(remote.cards ?? {})) {
    if (!cards[id] || rc.lastAt > cards[id].lastAt) cards[id] = rc
  }
  const seen = new Set(local.attempts.map((a) => `${a.qid}@${a.at}`))
  const attempts = [...local.attempts, ...(remote.attempts ?? []).filter((a) => !seen.has(`${a.qid}@${a.at}`))]
    .sort((a, b) => a.at - b.at)
    .slice(-MAX_HISTORY)
  const remoteNewer = (remote.updatedAt ?? 0) > localUpdatedAt
  return {
    ...local,
    cards,
    attempts,
    settings: remoteNewer && remote.settings ? remote.settings : local.settings,
    customQuestions: remoteNewer && remote.customQuestions ? remote.customQuestions : local.customQuestions,
  }
}

export type SyncStatus = 'local' | 'connecting' | 'synced' | 'saving' | 'error'

export interface CloudSync {
  push(data: StoreData, updatedAt: number): void
  stop(): void
}

/**
 * 클라우드 동기화를 시작한다. 원격 변경이 오면 onRemote로 병합할 데이터를 넘긴다.
 * 런타임이 없으면 null.
 */
export async function startCloudSync(
  onRemote: (remote: Partial<StoreData> & { updatedAt?: number }) => void,
  onStatus: (s: SyncStatus) => void,
): Promise<CloudSync | null> {
  if (!window.claude) return null
  onStatus('connecting')
  const [db, user] = (await Promise.all([window.claude.use('db'), window.claude.use('user')])) as [DB | null, UserNs | null]
  const uid = user ? await user.id() : null
  if (!db || !uid) {
    onStatus('local')
    return null
  }
  const progressRef = db.doc(`data/users/${uid}/progress`)
  const historyRef = db.doc(`data/users/${uid}/history`)

  let lastProgress = ''
  let lastHistory = ''
  let remoteProgress: Record<string, unknown> | undefined
  let remoteHistory: CompactAttempt[] | undefined
  const emit = () =>
    onRemote({
      ...(remoteProgress as Partial<StoreData> & { updatedAt?: number }),
      attempts: remoteHistory?.map(unpack),
    })

  const unsubs = [
    progressRef.onSnapshot(
      (s) => {
        if (!s.exists) return
        remoteProgress = s.data()
        const { cards, settings, customQuestions } = remoteProgress ?? {}
        lastProgress = JSON.stringify({ cards, settings, customQuestions })
        emit()
      },
      () => onStatus('error'),
    ),
    historyRef.onSnapshot(
      (s) => {
        if (!s.exists) return
        remoteHistory = (s.data()?.a as CompactAttempt[]) ?? []
        lastHistory = JSON.stringify({ a: remoteHistory })
        emit()
      },
      () => onStatus('error'),
    ),
  ]
  onStatus('synced')

  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { data: StoreData; updatedAt: number } | undefined
  let writing = false

  const flush = async () => {
    if (writing || !pending) return
    const { data, updatedAt } = pending
    pending = undefined
    writing = true
    try {
      const p = { cards: data.cards, settings: data.settings, customQuestions: data.customQuestions }
      const pKey = JSON.stringify(p)
      const h = { a: data.attempts.slice(-MAX_HISTORY).map(pack) }
      const hKey = JSON.stringify(h)
      // 내용이 그대로면 쓰지 않는다(원격 반영 직후 되쓰기 루프 방지)
      if (pKey !== lastProgress) {
        onStatus('saving')
        await progressRef.set({ ...p, updatedAt })
        lastProgress = pKey
      }
      if (hKey !== lastHistory) {
        onStatus('saving')
        await historyRef.set(h)
        lastHistory = hKey
      }
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
      timer = setTimeout(() => void flush(), 1500)
    },
    stop() {
      clearTimeout(timer)
      unsubs.forEach((u) => u())
    },
  }
}
