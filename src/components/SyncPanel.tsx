import { useState } from 'react'
import type { SyncStatus } from '../lib/cloud'
import { connectGist, loadGistConfig, saveGistConfig } from '../lib/gist'
import { logout } from '../lib/server'

const TOKEN_URL = 'https://github.com/settings/tokens/new?scopes=gist&description=PMP%20Prep%20sync'

export function SyncPanel({ backend, sync, onChange }: { backend: 'server' | 'claude' | 'gist' | null; sync: SyncStatus; onChange: () => void }) {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (backend === 'claude' || backend === 'server') {
    return (
      <section className="card">
        <h2>기기 동기화</h2>
        <p className="muted">{backend === 'server' ? '서버 DB에 자동 저장 중입니다. 같은 주소로 접속한 모든 기기가 같은 기록을 씁니다.' : 'claude.ai 계정 저장소로 자동 동기화 중입니다.'}</p>
        {backend === 'server' && (
          <button className="btn" onClick={() => void logout().then(() => location.reload())}>
            이 기기 로그아웃
          </button>
        )}
      </section>
    )
  }

  const connected = backend === 'gist' && loadGistConfig()
  const connect = async () => {
    setBusy(true)
    setMsg('')
    try {
      saveGistConfig(await connectGist(token.trim()))
      setToken('')
      onChange()
    } catch (e) {
      setMsg(`⚠ ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card form">
      <h2>기기 동기화 (GitHub Gist)</h2>
      {connected ? (
        <>
          <p>
            비공개 Gist에 동기화 중 · <span className={sync === 'error' ? 'warn' : 'ok-text'}>{sync === 'error' ? '오류' : sync === 'saving' ? '저장 중' : '연결됨'}</span>
          </p>
          <p className="muted">다른 기기에서도 같은 토큰으로 한 번 연결하면 기록이 합쳐집니다.</p>
          <button
            className="btn"
            onClick={() => {
              saveGistConfig(null)
              onChange()
            }}
          >
            이 기기 연결 해제
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            PC·폰에서 같은 학습 기록을 쓰려면 기기마다 한 번씩 연결하세요. 기록은 본인 GitHub 계정의 비공개 Gist에 저장되고, 토큰은 이 기기 브라우저에만 남습니다.
          </p>
          <ol className="steps">
            <li>
              <a href={TOKEN_URL} target="_blank" rel="noreferrer">
                GitHub 토큰 만들기
              </a>
              : <b>gist</b> 권한만 체크 → Generate token
            </li>
            <li>만든 토큰을 아래에 붙여 넣고 연결</li>
          </ol>
          <div className="row">
            <input type="password" placeholder="ghp_…" value={token} onChange={(e) => setToken(e.target.value)} style={{ flex: 1, minWidth: 0 }} autoComplete="off" />
            <button className="btn primary" disabled={!token.trim() || busy} onClick={() => void connect()}>
              {busy ? '연결 중…' : '연결'}
            </button>
          </div>
        </>
      )}
      {msg && <p className="warn">{msg}</p>}
    </section>
  )
}
