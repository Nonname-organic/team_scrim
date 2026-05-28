// Export production Supabase data as SQL for local import
import pg from 'pg'
import { writeFileSync } from 'fs'

const { Client } = pg

const TABLES = [
  'teams',
  'players',
  'matches',
  'rounds',
  'events',
  'player_stats',
  'team_stats',
  'ai_reports',
  'feedbacks',
  'feedback_comments',
  'payment_orders',
  'user_teams',
]

const client = new Client({
  connectionString: 'postgresql://postgres:5Xn.7G63Qh6VM$2@db.fcuybaimhfeaokatsxwc.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
})

function escapeVal(val, dataType) {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
  if (typeof val === 'number') return String(val)
  if (val instanceof Date) return `'${val.toISOString()}'`
  // jsonb / json columns
  if (dataType === 'jsonb' || dataType === 'json') {
    return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
  }
  // text[] arrays (non-jsonb)
  if (Array.isArray(val)) {
    return `ARRAY[${val.map(v => `'${String(v).replace(/'/g, "''")}'`).join(',')}]::text[]`
  }
  return `'${String(val).replace(/'/g, "''")}'`
}

async function main() {
  await client.connect()
  console.error('Connected to production Supabase')

  // Fetch generated columns to exclude
  const genRes = await client.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND is_generated = 'ALWAYS'
  `)
  const generatedCols = new Set(genRes.rows.map(r => `${r.table_name}.${r.column_name}`))

  // Fetch column data types for jsonb handling
  const typeRes = await client.query(`
    SELECT table_name, column_name, data_type, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
  `)
  const colTypes = {}
  for (const r of typeRes.rows) {
    colTypes[`${r.table_name}.${r.column_name}`] = r.data_type === 'USER-DEFINED' ? r.udt_name : r.data_type
  }

  let out = `-- Production data export ${new Date().toISOString()}\n`
  out += `SET session_replication_role = 'replica';\n\n`
  out += `TRUNCATE payment_orders, feedback_comments, feedbacks, ai_reports, team_stats, player_stats, events, rounds, matches, players, user_teams, teams CASCADE;\n\n`

  for (const table of TABLES) {
    const res = await client.query(`SELECT * FROM public.${table}`)
    if (res.rows.length === 0) {
      console.error(`  ${table}: 0 rows (skipped)`)
      continue
    }
    // Exclude generated columns
    const allCols = res.fields.map(f => f.name)
    const cols = allCols.filter(c => !generatedCols.has(`${table}.${c}`))

    out += `-- ${table} (${res.rows.length} rows)\n`
    for (const row of res.rows) {
      const vals = cols.map(c => escapeVal(row[c], colTypes[`${table}.${c}`]))
      out += `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT DO NOTHING;\n`
    }
    out += '\n'
    console.error(`  ${table}: ${res.rows.length} rows`)
  }

  out += `SET session_replication_role = 'origin';\n`

  writeFileSync('scripts/prod_export.sql', out)
  console.error('Written to scripts/prod_export.sql')
  await client.end()
}

main().catch(e => { console.error(e); process.exit(1) })
