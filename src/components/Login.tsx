import { useState } from 'react'
import { login } from '../lib/server'

export function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await login(pw)
      onDone()
    } catch (x) {
      setErr((x as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="app login">
      <form className="card form" onSubmit={(e) => void submit(e)}>
        <h2>
          PMP <span className="accent">Prep</span>
        </h2>
        <p className="muted">한 번 로그인하면 이 기기에서는 1년 동안 유지됩니다.</p>
        <input type="password" autoFocus autoComplete="current-password" placeholder="비밀번호" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn primary" disabled={!pw || busy}>
          {busy ? '확인 중…' : '로그인'}
        </button>
        {err && <p className="warn">{err}</p>}
      </form>
    </main>
  )
}
