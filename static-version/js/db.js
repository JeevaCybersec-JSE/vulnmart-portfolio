// db.js — boots a real SQLite database in the browser via sql.js (WASM)
// and seeds it with the same schema/data as the Python version, so the
// SQL injection demonstrated here runs against a genuine SQL engine,
// not a simulation.

const SQLJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/";

let dbInstance = null;

async function loadDatabase() {
  const initSqlJs = window.initSqlJs;
  const SQL = await initSqlJs({ locateFile: (file) => SQLJS_CDN + file });
  const db = new SQL.Database();
  seed(db);
  return db;
}

function seed(db) {
  db.run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      swatch TEXT NOT NULL,
      description TEXT NOT NULL
    );
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL
    );
    CREATE TABLE internal_memos (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      author TEXT NOT NULL,
      classification TEXT NOT NULL
    );
  `);

  const products = [
    ["Fog Canvas Tote", "bags", 48.0, "#B7C4C2", "Undyed canvas tote with a waxed-cotton base."],
    ["Ridge Wool Beanie", "accessories", 22.0, "#8A7A66", "Rib-knit beanie in a heavyweight merino blend."],
    ["Northfield Field Jacket", "outerwear", 168.0, "#4C5B5A", "Water-resistant shell with a brushed flannel lining."],
    ["Slate Ceramic Mug", "home", 18.0, "#6E7B7A", "Hand-thrown stoneware mug, dishwasher safe."],
    ["Harbor Linen Shirt", "apparel", 74.0, "#C9BFA8", "Garment-dyed linen, relaxed fit through the body."],
    ["Cedar Desk Lamp", "home", 96.0, "#7A5C3E", "Solid cedar base with a brass-finished swivel arm."],
    ["Moss Trail Backpack", "bags", 112.0, "#5B6B4E", "20L daypack with a padded laptop sleeve."],
    ["Quarry Denim Apron", "home", 38.0, "#3E4A52", "Heavyweight cotton apron with a brass buckle strap."],
    ["Ash Wool Scarf", "accessories", 34.0, "#A8A29A", "Lambswool scarf, woven in a small mill run."],
    ["Basin Rain Boots", "footwear", 88.0, "#2F3B3A", "Natural rubber boots with a fleece-lined collar."],
    ["Timber Card Wallet", "accessories", 26.0, "#8C6F4E", "Vegetable-tanned leather, holds up to six cards."],
    ["Pine Throw Blanket", "home", 64.0, "#556352", "Brushed wool-blend throw, woven herringbone pattern."],
  ];
  const insertProduct = db.prepare(
    "INSERT INTO products (name, category, price, swatch, description) VALUES (?, ?, ?, ?, ?)"
  );
  products.forEach((p) => insertProduct.run(p));
  insertProduct.free();

  const users = [
    ["admin", "N0rthf!eld_R00t_2024", "admin@northfieldgoods.example", "administrator"],
    ["mjenkins", "summer2019", "m.jenkins@northfieldgoods.example", "staff"],
    ["s.oyelaran", "trustno1", "s.oyelaran@northfieldgoods.example", "staff"],
    ["guest", "guest", "guest@northfieldgoods.example", "customer"],
  ];
  const insertUser = db.prepare(
    "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)"
  );
  users.forEach((u) => insertUser.run(u));
  insertUser.free();

  const memos = [
    ["Q3 vendor renewal", "Renewal terms attached, nothing unusual this cycle.", "s.oyelaran", "internal"],
    ["Root access review", "FLAG{union_select_your_way_to_admin}", "admin", "restricted"],
  ];
  const insertMemo = db.prepare(
    "INSERT INTO internal_memos (title, body, author, classification) VALUES (?, ?, ?, ?)"
  );
  memos.forEach((m) => insertMemo.run(m));
  insertMemo.free();
}

async function getDb() {
  if (!dbInstance) {
    dbInstance = await loadDatabase();
  }
  return dbInstance;
}

async function resetDb() {
  dbInstance = await loadDatabase();
  return dbInstance;
}

// Runs a raw SQL string built by concatenation (vulnerable path) or with
// bound parameters (secure path) and returns { columns, rows } or throws.
function execQuery(db, sql, params) {
  const result = params ? db.exec(sql, params) : db.exec(sql);
  if (result.length === 0) return { columns: [], rows: [] };
  const { columns, values } = result[0];
  const rows = values.map((row) => {
    const obj = {};
    columns.forEach((col, i) => (obj[col] = row[i]));
    return obj;
  });
  return { columns, rows };
}
