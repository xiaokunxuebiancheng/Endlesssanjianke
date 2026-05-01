const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const password = encodeURIComponent('Sjk031021.@.')
const projectRef = 'bezzoulxlfjsnzmgongw'

// Try all possible Supabase pg connection strings
const attempts = [
  { name: 'pooler-ipv4', cs: `postgresql://postgres:${password}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`, family: 4 },
  { name: 'pooler-6543', cs: `postgresql://postgres:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres` },
  { name: 'pooler-session', cs: `postgresql://postgres:${password}@${projectRef}.supabase.co:5432/postgres` },
  { name: 'pooler-transaction', cs: `postgresql://postgres:${password}@${projectRef}.supabase.co:6543/postgres` },
  { name: 'direct', cs: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres` },
]

async function tryConnect(name, cs, options = {}) {
  const pool = new Pool({
    connectionString: cs,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    ...options
  })
  try {
    const client = await pool.connect()
    const r = await client.query('SELECT current_database(), version()')
    console.log(`  SUCCESS: ${name} -> ${r.rows[0].current_database}`)
    client.release()
    return pool
  } catch (err) {
    await pool.end().catch(() => {})
    console.log(`  FAIL: ${name} -> ${err.code || err.message.split('\n')[0]}`)
    return null
  }
}

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8')
  console.log('Trying Supabase PostgreSQL connections...\n')

  let pool = null
  for (const a of attempts) {
    const extra = a.family ? { family: a.family } : {}
    pool = await tryConnect(a.name, a.cs, extra)
    if (pool) break
  }

  if (!pool) {
    console.error('\nAll pg connections failed. Falling back to SQL file output...')
    console.log('\n========================================')
    console.log('Please run this SQL in the Supabase SQL Editor:')
    console.log('1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql/new')
    console.log('2. Paste the contents of: supabase/migration.sql')
    console.log('3. Click Run')
    console.log('========================================')
    process.exit(1)
  }

  console.log('\nRunning migration...')
  try {
    await pool.query(sql)
    console.log('Migration completed successfully!')
  } catch (err) {
    console.error('Migration error:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrate()
