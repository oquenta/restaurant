// Crea el esquema y usuarios demo en un PostgreSQL REAL (lee DATABASE_URL).
// npm run setup-db
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Define DATABASE_URL (.env) y vuelve a ejecutar.");
  process.exit(1);
}

async function main() {
  const schema = fs.readFileSync(path.join(process.cwd(), "scripts/schema.sql"), "utf8");
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query(schema);

  const admin = bcrypt.hashSync(process.env.ADMIN_PASSWORD || "admin123", 10);
  const cajero = bcrypt.hashSync("cajero123", 10);
  await c.query(
    `INSERT INTO users (role, first_name, last_name, username, password_hash)
     VALUES ($1,$2,$3,$4,$5), ($6,$7,$8,$9,$10)
     ON CONFLICT (username) DO NOTHING`,
    ["admin", "Ana", "Directora", "admin", admin, "cajero", "Carlos", "Cajero", "cajero1", cajero]
  );

  await c.query(
    // categorías demo si aún no hay ninguna
    `INSERT INTO categories (name, kind, sort)
     SELECT * FROM (VALUES
       ('À la brassa','plato',1), ('Fondas clásicas','plato',2),
       ('Frescas del quelite','plato',3),
       ('Aguas y refrescos','bebida',4), ('Con alcohol','bebida',5),
       ('Dulce final','postre',6)
     ) AS v(name,kind,sort)
     WHERE NOT EXISTS (SELECT 1 FROM categories)`
  );
  await c.query(
    `INSERT INTO products (category_id, name, description, price, stock)
     SELECT c.id, v.name, v.description, v.price, v.stock
     FROM (VALUES
       ('À la brassa','Pollo a la brasa', 'Medio pollo dorado al carbón con papas y ají', 45.90, 18, 'plato'),
       ('À la brassa','Costilla BBQ', 'Costilla ahumada 12 h con salsa de chicha', 52.00, 10, 'plato'),
       ('Fondas clásicas','Lomo saltado', 'Res al wok con cebolla, tomate y papas fritas', 38.50, 22, 'plato'),
       ('Fondas clásicas','Ají de gallina', 'Crema de gallina con maní y arroz blanco', 32.00, 15, 'plato'),
       ('Fresh del quelite','Ceviche clásico', 'Lenguado en leche de tigre, cebolla y camote', 42.00, 12, 'plato'),
       ('Frescas del quelite','Causa limeña', 'Papa prensada con ají, pollo y palta', 24.00, 9, 'plato'),
       ('Aguas y refrescos','Chicha morada jarra', '1 L casera con limón y canela', 14.00, 40, 'bebida'),
       ('Aguas y refrescos','Limonada frutada', 'Hierbabuena, maracuyá y hielo seco', 12.50, 35, 'bebida'),
       ('Aguas y refrescos','Refresco de la casa', 'Gaseosa 500 ml bien helada', 5.00, 60, 'bebida'),
       ('Con alcohol','Cerveza artesanal', 'IPA local 330 ml', 18.00, 24, 'bebida'),
       ('Con alcohol','Chilcano de maracuyá', 'Pisco, jengibre y maracuyá', 22.00, 16, 'bebida'),
       ('Dulce final','Flan de vainilla', 'Receta de la abuela con caramelo casero', 12.00, 14, 'postre'),
       ('Dulce final','Mousse de lúcuma', 'Lúcuma fresca y crema batida', 14.50, 8, 'postre'),
       ('Dulce final','Tres leches', 'Esponjoso con canela y algarrobina', 13.00, 6, 'postre')
     ) AS v(cat,name,description,price,stock,kind)
     JOIN categories c ON c.name = v.cat
     WHERE NOT EXISTS (SELECT 1 FROM products)`
  );
  await c.end();
  console.log("Esquema y semilla listos. Admin: admin/admin123 · Cajero: cajero1/cajero123");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
