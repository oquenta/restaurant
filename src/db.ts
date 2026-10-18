// Capa de datos: PostgreSQL real si existe DATABASE_URL; si no, pg-mem en memoria (modo demo).
import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

export let isDemoDb = true;

let pool: Pool | null = null;
let initPromise: Promise<void> | null = null;

function makeRealPool(): Pool {
  return new Pool({ connectionString: process.env.DATABASE_URL });
}

function makeMemPool(): Pool {
  throw new Error("pg-mem se inicializa dentro de init()");
}

async function init(): Promise<void> {
  if (process.env.DATABASE_URL) {
    isDemoDb = false;
    pool = makeRealPool();
  } else {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    const pgLib = mem.adapters.createPg().Pool as unknown as typeof Pool;
    pool = new pgLib() as Pool;
  }
  const ddl = fs.readFileSync(path.join(process.cwd(), "scripts", "schema.sql"), "utf8");
  for (const stmt of ddl.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    try {
      await pool.query(stmt);
    } catch {
      // tolerante: pg-mem puede no soportar sentencias secundarias (p. ej. CREATE INDEX)
    }
  }
  try {
    const r = await pool.query("SELECT COUNT(*)::int AS n FROM users");
    const n = (r.rows[0] as any).n as number;
    if (n === 0) await seed(pool);
  } catch {
    // tolerante: si falla la cuenta de usuarios (p. ej. tabla no existe), asumimos que necesitamos semilla
    await seed(pool);
  }

async function __seed(p: Pool) {
  const cats: Array<[string, string, number]> = [
    ["À la brassa", "plato", 1],
    ["Fondas clásicas", "plato", 2],
    ["Frescas del quelite", "plato", 3],
    ["Aguas y refrescos", "bebida", 4],
    ["Con alcohol", "bebida", 5],
    ["Dulce final", "postre", 6],
  ];
  const catIds: Record<string, number> = {};
  for (const [name, kind, sort] of cats) {
    const r = await p.query("INSERT INTO categories(name,kind,sort) VALUES($1,$2,$3) RETURNING id", [name, kind, sort]);
    catIds[name] = Number((r.rows[0] as any).id);
  }
  const prods: Array<[string, string, string, number, number]> = [
    ["À la brassa", "Pollo a la brasa", "Medio pollo dorado al carbón, papas crocantes y ají de casa", 45.9, 18],
    ["À la brassa", "Costilla BBQ", "Ahumada 12 h con salsa de chicha morada", 52, 10],
    ["Fondas clásicas", "Lomo saltado", "Res al wok, cebolla, tomate y papas fritas", 38.5, 22],
    ["Fondas clásicas", "Ají de gallina", "Crema de gallina, maní tostado, arroz blanco", 32, 15],
    ["Frescas del quelite", "Ceviche clásico", "Lenguado en leche de tigre, cebolla y camote", 42, 12],
    ["Frescas del quelite", "Causa limeña", "Papa prensada, ají amarillo, pollo y palta", 24, 9],
    ["Frescas del quelite", "Chupe de camarones", "Camarones, fideos, leche y ají cayote", 39, 4],
    ["Aguas y refrescos", "Chicha morada jarra", "1 litro casera, limón y canela", 14, 40],
    ["Aguas y refrescos", "Limonada frutada", "Hierbabuena, maracuyá y hielo seco", 12.5, 35],
    ["Aguas y refrescos", "Refresco de la casa", "Gaseosa 500 ml bien helada", 5, 60],
    ["Con alcohol", "Cerveza artesanal", "IPA local 330 ml", 18, 24],
    ["Con alcohol", "Chilcano de maracuyá", "Pisco, jengibre y maracuyá", 22, 16],
    ["Dulce final", "Flan de vainilla", "Receta de la abuela con caramelo casero", 12, 14],
    ["Dulce final", "Mousse de lúcuma", "Lúcuma fresca y crema batida", 14.5, 8],
    ["Dulce final", "Tres leches", "Esponjoso con canela y algarrobina", 13, 6],
  ];
  for (const [cat, name, desc, price, stock] of prods) {
    await p.query(
      "INSERT INTO products(category_id,name,description,price,stock) VALUES($1,$2,$3,$4,$5)",
      [catIds[cat], name, desc, price, stock]
    );
  }
  const adminHash = bcrypt.hashSync("admin123", 10);
  const cajeroHash = bcrypt.hashSync("cajero123", 10);
  await p.query(
    "INSERT INTO users(role,first_name,last_name,username,password_hash) VALUES('admin','Ana','Directora','admin',$1),('cajero','Carlos','Cajero','cajero1',$2)",
    [adminHash, cajeroHash]
  );
}

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  if (!initPromise) initPromise = init();
  try {
    await initPromise;
  } catch (e) {
    initPromise = null;
    throw e;
  }
  const res = await pool!.query(text, params as any[]);
  return res.rows as unknown as T[];
}

export async function withTx<T>(fn: (c: any) => Promise<T>): Promise<T> {
  if (!initPromise) initPromise = init();
  await initPromise;
  const client = (await pool!.connect()) as any;
  try {
    await client.query("BEGIN");
    const r = await fn(client);
    await client.query("COMMIT");
    return r as T;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export { makeMemPool as _unusedMakeMemPool };
export { toNum } from "./util";
