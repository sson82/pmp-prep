// PMP Prep 서버 (Render 배포용)
// - dist/ 정적 파일(앱) 제공
// - 비밀번호 로그인(서명 쿠키) 뒤에서 비공개 문항(/api/questions)과 학습 기록(/api/progress) 제공
// 환경 변수: DATABASE_URL, APP_PASSWORD, SESSION_SECRET, PORT
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import pg from 'pg'

const { DATABASE_URL, APP_PASSWORD, SESSION_SECRET } = process.env
if (!DATABASE_URL || !APP_PASSWORD || !SESSION_SECRET) {
  console.error('DATABASE_URL, APP_PASSWORD, SESSION_SECRET 환경 변수가 필요합니다.')
  process.exit(1)
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  // Render 외부 접속 URL은 SSL 필수, 내부 URL(같은 리전 서비스 간)은 SSL 없음
  ssl: /render\.com/.test(DATABASE_URL) ? { rejectUnauthorized: false } : undefined,
})

await pool.query(`
  create table if not exists pmp_questions (
    id text primary key,
    data jsonb not null,
    source text,
    updated_at timestamptz not null default now()
  );
  create table if not exists pmp_progress (
    id text primary key,
    data jsonb not null,
    version bigint not null default 1,
    updated_at timestamptz not null default now()
  );
`)

// ── 인증: exp.hmac 형태의 서명 쿠키 (1년) ──
const COOKIE = 'pmp_session'
const YEAR = 365 * 24 * 3600 * 1000
const sign = (v) => crypto.createHmac('sha256', SESSION_SECRET).update(v).digest('base64url')
const makeToken = () => {
  const exp = String(Date.now() + YEAR)
  return `${exp}.${sign(exp)}`
}
const validToken = (t) => {
  const [exp, mac] = String(t ?? '').split('.')
  if (!exp || !mac || Number(exp) < Date.now()) return false
  const a = Buffer.from(mac)
  const b = Buffer.from(sign(exp))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
const readCookie = (req) =>
  Object.fromEntries((req.headers.cookie ?? '').split(';').map((c) => c.trim().split('=').map(decodeURIComponent)))[COOKIE]
const samePassword = (input) => {
  const a = crypto.createHash('sha256').update(String(input ?? '')).digest()
  const b = crypto.createHash('sha256').update(APP_PASSWORD).digest()
  return crypto.timingSafeEqual(a, b)
}

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '5mb' }))

app.post('/api/login', async (req, res) => {
  if (!samePassword(req.body?.password)) {
    await new Promise((r) => setTimeout(r, 800)) // 무차별 대입 완화
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' })
  }
  res.cookie(COOKIE, makeToken(), { httpOnly: true, secure: req.secure || req.headers['x-forwarded-proto'] === 'https', sameSite: 'lax', maxAge: YEAR })
  res.json({ ok: true })
})

app.post('/api/logout', (_req, res) => {
  res.clearCookie(COOKIE)
  res.json({ ok: true })
})

app.use('/api', (req, res, next) => (validToken(readCookie(req)) ? next() : res.status(401).json({ error: 'login required' })))

app.get('/api/me', (_req, res) => res.json({ ok: true }))

app.get('/api/questions', async (_req, res) => {
  const { rows } = await pool.query('select data from pmp_questions order by id')
  res.set('Cache-Control', 'no-store').json(rows.map((r) => r.data))
})

// 문항 일괄 추가·수정 (앱의 '문제 세트 가져오기' 또는 변환 파이프라인). 같은 id는 덮어쓴다
app.post('/api/questions', async (req, res) => {
  const qs = Array.isArray(req.body) ? req.body : []
  const bad = qs.filter(
    (q) => !q?.id || !q.stem || !Array.isArray(q.options) || !Array.isArray(q.answer) || q.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.options.length),
  )
  if (!qs.length || bad.length) return res.status(400).json({ error: `잘못된 문항 ${bad.length}개`, ids: bad.slice(0, 10).map((q) => q?.id) })
  const client = await pool.connect()
  try {
    await client.query('begin')
    for (const q of qs) {
      await client.query(
        `insert into pmp_questions (id, data, source) values ($1, $2, $3)
         on conflict (id) do update set data = $2, source = $3, updated_at = now()`,
        [q.id, q, q.source ?? 'import'],
      )
    }
    await client.query('commit')
  } catch (e) {
    await client.query('rollback')
    throw e
  } finally {
    client.release()
  }
  res.json({ upserted: qs.length })
})

app.get('/api/progress', async (_req, res) => {
  const { rows } = await pool.query("select data, version from pmp_progress where id = 'me'")
  // bigint는 pg 드라이버가 문자열로 돌려주므로 숫자로 변환
  res.set('Cache-Control', 'no-store').json(rows[0] ? { data: rows[0].data, version: Number(rows[0].version) } : { data: null, version: 0 })
})

// 낙관적 동시성 제어: 클라이언트가 읽은 version과 다르면 409 + 최신본 반환 → 클라이언트가 병합 후 재시도
app.put('/api/progress', async (req, res) => {
  const { data, version } = req.body ?? {}
  if (!data || typeof version !== 'number') return res.status(400).json({ error: 'data, version 필요' })
  const { rows } = await pool.query(
    `insert into pmp_progress (id, data, version) values ('me', $1, 1)
     on conflict (id) do update set data = $1, version = pmp_progress.version + 1, updated_at = now()
       where pmp_progress.version = $2
     returning version`,
    [data, version],
  )
  if (rows.length) return res.json({ version: Number(rows[0].version) })
  const cur = await pool.query("select data, version from pmp_progress where id = 'me'")
  res.status(409).json({ data: cur.rows[0].data, version: Number(cur.rows[0].version) })
})

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
app.use(express.static(dist, { index: false }))
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))

const port = Number(process.env.PORT) || 3000
app.listen(port, () => console.log(`PMP Prep server on :${port}`))
