// Applique le schéma sur la base Neon.
//   npm run migrate            (lit .env.local, puis l'environnement)

import { neon } from '@neondatabase/serverless'
import { SCHEMA } from '../api/_lib/schema.js'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL absente. `vercel env pull .env.local` d’abord.')
  process.exit(1)
}

const sql = neon(url)
for (const instruction of SCHEMA) {
  // `sql` n'accepte que la forme balisée ; les instructions fixes passent par
  // sql.query, qui est la porte prévue pour du SQL sans valeur à injecter.
  await sql.query(instruction)
  console.log(`  ✓ ${instruction.split('\n')[0].trim()}`)
}

const [{ tables }] = await sql`
  select count(*)::int as tables from information_schema.tables
  where table_schema = 'public' and table_name in ('joueurs', 'resultats')
`
console.log(`\n  ${tables}/2 tables en place`)
