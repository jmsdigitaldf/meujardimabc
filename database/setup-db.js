import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import 'dotenv/config';

const { Client } = pg;

async function setupDatabase() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error("Erro: A variável de ambiente DATABASE_URL não foi definida no arquivo .env");
    process.exit(1);
  }

  console.log("Conectando ao banco de dados...");
  const client = new Client({
    connectionString,
    // Ativa SSL para conexões seguras como Supabase (evita erros de certificado autoassinado)
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log("Conexão estabelecida com sucesso!");

    // Ler arquivos SQL
    const schemaPath = path.resolve('./database/001_schema.sql');
    const seedPath = path.resolve('./database/002_seed.sql');

    console.log("Lendo arquivo de schema (001_schema.sql)...");
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log("Lendo arquivo de seed (002_seed.sql)...");
    const seedSql = fs.readFileSync(seedPath, 'utf8');

    console.log("Executando schema no banco de dados...");
    // O schema usa transações (begin/commit), então podemos executar o bloco completo
    await client.query(schemaSql);
    console.log("Schema criado com sucesso!");

    console.log("Executando seed de dados no banco de dados...");
    await client.query(seedSql);
    console.log("Seed de dados inserido com sucesso!");

    console.log("\nParabéns! Banco de dados configurado e pronto para uso.");
  } catch (err) {
    console.error("\nErro durante a configuração do banco de dados:");
    console.error(err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
