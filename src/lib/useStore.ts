import { useCallback, useEffect, useRef, useState } from 'react'
import type { Attempt, Question, StoreData } from '../types'
import { mergeStores, startCloudSync, type CloudSync, type SyncStatus } from './cloud'
import { loadGistConfig, startGistSync } from './gist'
import { grade, newCard, schedule } from './srs'
import { LocalStorageRepository } from './storage'

const repo = new LocalStorageRepository()
const UPDATED_KEY = 'pmp-prep:updatedAt'

const readUpdatedAt = () => {
  try {
    return Number(localStorage.getItem(UPDATED_KEY)) || 0
  } catch {
    return 0
  }
}

export function useStore() {
  const [data, setData] = useState<StoreData>(() => repo.load())
  const [sync, setSync] = useState<SyncStatus>('local')
  const [backend, setBackend] = useState<'claude' | 'gist' | null>(null)
  /** Gist 연결 설정이 바뀌면 증가시켜 동기화를 다시 시작 */
  const [epoch, setEpoch] = useState(0)
  const updatedAt = useRef(readUpdatedAt())
  const cloud = useRef<CloudSync | null>(null)
  // 원격 병합으로 생긴 변경인지 사용자 행동으로 생긴 변경인지 구분
  const dirty = useRef(false)

  useEffect(() => {
    let alive = true
    let handle: CloudSync | null = null
    const onRemote = (remote: Partial<StoreData> & { updatedAt?: number }) => {
      if (!alive) return
      // setData 갱신 함수는 나중에 실행되므로 비교 기준 시각을 지금 고정해 둔다
      const localAt = updatedAt.current
      setData((local) => mergeStores(local, remote, localAt))
      if ((remote.updatedAt ?? 0) > localAt) updatedAt.current = remote.updatedAt!
      dirty.current = true
    }
    const onStatus = (s: SyncStatus) => alive && setSync(s)
    // claude.ai 아티팩트 안이면 claude 저장소, 아니면 설정된 GitHub Gist
    void startCloudSync(onRemote, onStatus).then((c) => {
      if (!c) {
        const gist = loadGistConfig()
        c = gist ? startGistSync(gist, onRemote, onStatus) : null
        if (alive) setBackend(c ? 'gist' : null)
      } else if (alive) setBackend('claude')
      if (!c && alive) setSync('local')
      handle = c
      if (!alive) c?.stop()
      else cloud.current = c
    })
    return () => {
      alive = false
      handle?.stop()
      cloud.current = null
    }
  }, [epoch])

  useEffect(() => {
    repo.save(data)
    try {
      localStorage.setItem(UPDATED_KEY, String(updatedAt.current))
    } catch {
      // ignore
    }
    if (dirty.current) {
      dirty.current = false
      cloud.current?.push(data, updatedAt.current)
    }
  }, [data])

  const commit = useCallback((fn: (d: StoreData) => StoreData) => {
    updatedAt.current = Date.now()
    dirty.current = true
    setData(fn)
  }, [])

  const record = useCallback(
    (q: Question, a: Omit<Attempt, 'qid' | 'at'>) => {
      const now = Date.now()
      commit((d) => {
        const card = d.cards[q.id] ?? newCard(q.id, now)
        return {
          ...d,
          cards: { ...d.cards, [q.id]: schedule(card, grade(a.correct, a.ms, a.confidence), now) },
          attempts: [...d.attempts, { ...a, qid: q.id, at: now }].slice(-3000),
        }
      })
    },
    [commit],
  )

  const resync = useCallback(() => setEpoch((e) => e + 1), [])

  return { data, sync, backend, resync, commit, record }
}
