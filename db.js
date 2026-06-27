import pg from 'pg';
import 'dotenv/config';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL?.trim(),
});

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
