import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_HOST || "127.0.0.1",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    multipleStatements: true,
  });
  const schema = readFileSync(join(root, "db", "schema.sql"), "utf8");
  await conn.query(schema);
  const dataSql = readFileSync(join(root, "db", "seed.sql"), "utf8");
  await conn.query(dataSql);
  const adminHash = await bcrypt.hash("admin123", 10);
  const demoHash = await bcrypt.hash("demo123", 10);
  await conn.query(
    `INSERT IGNORE INTO users (id, email, password_hash, full_name, role) VALUES
     (1, 'admin@twirldemo.local', ?, 'Admin User', 'admin'),
     (2, 'demo@twirldemo.local', ?, 'Demo Customer', 'customer')`,
    [adminHash, demoHash]
  );
  await conn.end();
  console.log("Seed completed. Logins: admin@twirldemo.local / admin123, demo@twirldemo.local / demo123");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
