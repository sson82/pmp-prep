// private/questions/*.json 의 문항을 DB(pmp_questions)에 올린다. 문항 파일은 git에 올라가지 않는다.
// 사용: node scripts/seed.mjs            (private/.env 의 DATABASE_URL 사용, Render는 External URL)
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'

const env = Object.fromEntries(
  (fs.existsSync('private/.env') ? fs.readFileSync('private/.env', 'utf8') : '').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const url = process.env.DATABASE_URL ?? env.DATABASE_URL
const pool = new pg.Pool({ connectionString: url, ssl: /render\.com/.test(url) ? { rejectUnauthorized: false } : undefined })

await pool.query(`create table if not exists pmp_questions (id text primary key, data jsonb not null, source text, updated_at timestamptz not null default now())`)
const dir = 'private/questions'
let n = 0
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const qs = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
  for (const q of qs) {
    // 형식 보정·검증: answer는 인덱스 배열, 보기 범위 안
    if (!Array.isArray(q.answer)) q.answer = [q.answer]
    if (!q.id || !q.stem || !Array.isArray(q.options) || q.answer.some((a) => !Number.isInteger(a) || a < 0 || a >= q.options.length)) {
      throw new Error(`${f}: 잘못된 문항 ${q.id}`)
    }
    await pool.query(
      `insert into pmp_questions (id, data, source) values ($1, $2, $3)
       on conflict (id) do update set data = $2, source = $3, updated_at = now()`,
      [q.id, q, f],
    )
    n++
  }
  console.log(`${f}: ${qs.length}문항`)
}
console.log(`총 ${n}문항 업로드 완료`)
await pool.end()
