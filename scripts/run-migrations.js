#!/usr/bin/env node
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

async function run() {
  const dbUrlArgIndex = process.argv.indexOf('--db-url');
  const dbUrl = dbUrlArgIndex !== -1 ? process.argv[dbUrlArgIndex + 1] : process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('Provide --db-url or set SUPABASE_DB_URL/DATABASE_URL');
    process.exit(1);
  }

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    console.log('\n== Running', file);
    try {
      await client.query(sql);
      console.log('> OK');
    } catch (err) {
      console.error('> ERROR', err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('\nMigrations complete');
}

run();
