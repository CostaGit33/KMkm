import mysql from 'mysql2/promise';

const fallback = 'mysql://caderneta:caderneta@127.0.0.1:3306/caderneta';
const dsn = new URL(process.env.DATABASE_URL || fallback);
const sslRaw = dsn.searchParams.get('ssl');
let ssl;
try {
  ssl = sslRaw ? JSON.parse(sslRaw) : undefined;
} catch {
  ssl = { rejectUnauthorized: true };
}

const options = {
  host: dsn.hostname,
  port: Number(dsn.port || 3306),
  user: decodeURIComponent(dsn.username),
  password: decodeURIComponent(dsn.password),
  database: dsn.pathname.slice(1),
  waitForConnections: true,
  connectionLimit: 10,
  connectTimeout: 10000,
  timezone: 'Z',
};
if (ssl) options.ssl = ssl;

export const pool = mysql.createPool(options);
// Datas sempre em UTC, qualquer que seja o fuso do servidor ou do banco (sessões, janelas de evento e "hoje").
pool.on('connection', (c) => c.query("SET time_zone = '+00:00'"));

export const q = async (sql, params = []) => {
  const [rows] = await pool.query(sql, params);
  return rows;
};
