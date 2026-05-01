const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const password = encodeURIComponent('Sjk031021.@.')
const projectRef = 'bezzoulxlfjsnzmgongw'

// Try multiple connection approaches
const connStrings = [
  `postgresql://postgres:${password}@${projectRef}.supabase.co:6543/postgres`,
  `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  `postgresql://postgres:${password}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`,
]

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'migration.sql'), 'utf8')

  for (const cs of connStrings) {
    console.log('Trying:', cs.replace(/\/\/.*@/, '//***@'))
    const pool = new Pool({ connectionString: cs, ssl: { rejectUnauthorized: false } })
    try {
      await pool.query('SELECT 1')
      console.log('  Connected! Running migration...')
      await pool.query(sql)
      console.log('  Migration completed successfully!')
      await pool.end()
      process.exit(0)
    } catch (err) {
      console.log('  Failed:', err.message.split('\n')[0])
      await pool.end().catch(() => {})
    }
  }

  console.error('\nAll connection attempts failed.')
  process.exit(1)
}

migrate()
