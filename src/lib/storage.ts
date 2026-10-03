import type { Question, StoreData } from '../types'

/**
 * 진행 데이터 저장소 추상화. 현재는 localStorage 구현만 있으며,
 * 서버 DB로 옮길 때는 같은 인터페이스로 구현체만 교체하면 된다.
 */
export interface ProgressRepository {
  load(): StoreData
  save(data: StoreData): void
}

const KEY = 'pmp-prep:v1'

export function emptyStore(): StoreData {
  return { version: 1, cards: {}, attempts: [], customQuestions: [], settings: { dailyNew: 15 } }
}

export class LocalStorageRepository implements ProgressRepository {
  load(): StoreData {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return emptyStore()
      return { ...emptyStore(), ...(JSON.parse(raw) as StoreData) }
    } catch {
      return emptyStore()
    }
  }
  save(data: StoreData): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      // 저장 공간 부족·사생활 보호 모드 등: 세션 내 상태는 유지되므로 무시
    }
  }
}

export function parseBackup(text: string): StoreData {
  const data = JSON.parse(text) as StoreData
  if (data.version !== 1 || typeof data.cards !== 'object' || !Array.isArray(data.attempts)) {
    throw new Error('백업 파일 형식이 올바르지 않습니다.')
  }
  return { ...emptyStore(), ...data }
}

/** 사용자 문제 세트(JSON 배열) 검증 */
export function parseQuestions(text: string): Question[] {
  const arr = JSON.parse(text) as unknown
  if (!Array.isArray(arr)) throw new Error('문항 JSON은 배열이어야 합니다.')
  return arr.map((raw: Partial<Question>, i) => {
    const q = raw as Question
    const where = `${i + 1}번째 문항`
    if (!q.id || !q.stem || !Array.isArray(q.options) || q.options.length < 2) {
      throw new Error(`${where}: id, stem, options(2개 이상)가 필요합니다.`)
    }
    if (!Array.isArray(q.answer) || q.answer.length === 0 || q.answer.some((a) => a < 0 || a >= q.options.length)) {
      throw new Error(`${where}: answer는 options 범위 안의 인덱스 배열이어야 합니다.`)
    }
    return {
      ...q,
      domain: q.domain ?? 'process',
      edition: q.edition ?? 'both',
      approach: q.approach ?? 'hybrid',
      tags: q.tags ?? [],
      explanation: q.explanation ?? '',
      id: q.id.startsWith('u-') ? q.id : `u-${q.id}`,
    }
  })
}

/** claude.ai 아티팩트 안에서는 downloads capability로, 일반 브라우저에서는 a[download]로 저장 */
export async function download(filename: string, text: string) {
  const dl = (await window.claude?.use('downloads').catch(() => null)) as { save(r: { filename: string; data: string }): Promise<unknown> } | null | undefined
  if (dl) {
    await dl.save({ filename, data: text }).catch(() => undefined)
    return
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
