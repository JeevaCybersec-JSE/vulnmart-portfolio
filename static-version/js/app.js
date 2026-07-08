// app.js — UI wiring for the static build. All SQL execution happens in
// db.js against a real in-memory SQLite database; this file only builds
// the query strings (vulnerable vs. secure) and renders results.

const state = {
  mode: "vulnerable", // "vulnerable" | "secure"
  view: "shop", // "shop" | "login" | "account"
  db: null,
  user: null, // { username, role }
};

const el = (sel) => document.querySelector(sel);
const elAll = (sel) => Array.from(document.querySelectorAll(sel));

function setConsole(sql, error) {
  const line = el("#console-line");
  const errLine = el("#console-error");
  if (sql) {
    line.textContent = "sqlite> " + sql;
    line.classList.remove("console__line--muted");
  } else {
    line.textContent = "sqlite> waiting for a search or login attempt…";
    line.classList.add("console__line--muted");
  }
  if (error) {
    errLine.textContent = error;
    errLine.style.display = "block";
  } else {
    errLine.style.display = "none";
    errLine.textContent = "";
  }
  el("#console-mode").textContent = state.mode;
}

function switchView(view) {
  state.view = view;
  elAll(".view").forEach((v) => v.classList.toggle("is-active", v.dataset.view === view));
  elAll(".nav-link").forEach((n) => n.classList.toggle("is-current", n.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function setMode(mode) {
  state.mode = mode;
  elAll(".mode-pill").forEach((b) => b.classList.toggle("is-active", b.dataset.mode === mode));
  el("body").className = "mode-" + mode;
  setConsole(null);
}

function renderProducts(rows) {
  const grid = el("#product-grid");
  const empty = el("#empty-state");
  grid.innerHTML = "";
  if (!rows.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  rows.forEach((p) => {
    const card = document.createElement("article");
    card.className = "card";
    const priceDisplay =
      typeof p.price === "number" ? `$${p.price.toFixed(2)}` : String(p.price);
    const swatch = typeof p.swatch === "string" && p.swatch.startsWith("#") ? p.swatch : "#999";
    card.innerHTML = `
      <div class="card__swatch" style="background:${escapeHtml(swatch)}"></div>
      <div class="card__body">
        <p class="card__category">${escapeHtml(String(p.category))}</p>
        <h3 class="card__name">${escapeHtml(String(p.name))}</h3>
        <p class="card__desc">${escapeHtml(String(p.description))}</p>
        <p class="card__price">${escapeHtml(priceDisplay)}</p>
      </div>`;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function runSearch() {
  const search = el("#search-input").value;
  const category = state.activeCategory || "all";
  let sql, params, result, errorMsg;

  try {
    if (state.mode === "vulnerable") {
      if (search) {
        sql =
          "SELECT id, name, category, price, swatch, description FROM products WHERE name LIKE '%" +
          search +
          "%'";
      } else if (category !== "all") {
        sql =
          "SELECT id, name, category, price, swatch, description FROM products WHERE category = '" +
          category +
          "'";
      } else {
        sql = "SELECT id, name, category, price, swatch, description FROM products";
      }
      result = execQuery(state.db, sql);
    } else {
      if (search) {
        sql = "SELECT id, name, category, price, swatch, description FROM products WHERE name LIKE ?";
        params = [`%${search}%`];
      } else if (category !== "all") {
        sql = "SELECT id, name, category, price, swatch, description FROM products WHERE category = ?";
        params = [category];
      } else {
        sql = "SELECT id, name, category, price, swatch, description FROM products";
        params = [];
      }
      result = execQuery(state.db, sql, params);
      sql = sql + (params.length ? "  -- params: " + JSON.stringify(params) : "");
    }
    renderProducts(result.rows);
    setConsole(sql, null);
  } catch (e) {
    renderProducts([]);
    setConsole(sql, e.message);
  }
}

function renderCategoryChips() {
  const categories = ["all", "apparel", "outerwear", "accessories", "bags", "home", "footwear"];
  const row = el("#chip-row");
  row.innerHTML = "";
  categories.forEach((c) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip" + (c === (state.activeCategory || "all") ? " is-active" : "");
    chip.textContent = c;
    chip.addEventListener("click", () => {
      state.activeCategory = c;
      el("#search-input").value = "";
      renderCategoryChips();
      runSearch();
    });
    row.appendChild(chip);
  });
}

function attemptLogin(username, password) {
  let sql, params, result, errorMsg;
  el("#login-error").style.display = "none";

  try {
    if (state.mode === "vulnerable") {
      sql =
        "SELECT * FROM users WHERE username = '" + username + "' AND password = '" + password + "'";
      result = execQuery(state.db, sql);
    } else {
      sql = "SELECT * FROM users WHERE username = ? AND password = ?";
      result = execQuery(state.db, sql, [username, password]);
      setConsole(sql + `  -- params: ["${username}", "***"]`, null);
    }
    if (state.mode === "vulnerable") setConsole(sql, null);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      state.user = { username: user.username, role: user.role };
      renderAccount();
      switchView("account");
    } else {
      el("#login-error").textContent = "Invalid username or password.";
      el("#login-error").style.display = "block";
    }
  } catch (e) {
    setConsole(sql, e.message);
    el("#login-error").textContent = "Query failed: " + e.message;
    el("#login-error").style.display = "block";
  }
}

function renderAccount() {
  if (!state.user) return;
  el("#account-username").textContent = state.user.username;
  el("#account-role").textContent = "role: " + state.user.role;
  const adminNote = el("#admin-note");
  adminNote.style.display = state.user.role === "administrator" ? "block" : "none";
}

async function resetAll() {
  el("#app-root").classList.add("is-loading");
  state.db = await resetDb();
  state.user = null;
  state.activeCategory = "all";
  el("#search-input").value = "";
  renderCategoryChips();
  runSearch();
  switchView("shop");
  el("#app-root").classList.remove("is-loading");
}

async function boot() {
  state.db = await getDb();
  state.activeCategory = "all";
  renderCategoryChips();
  runSearch();

  el("#search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    runSearch();
  });

  elAll(".mode-pill").forEach((btn) => {
    btn.addEventListener("click", () => setMode(btn.dataset.mode));
  });

  elAll(".nav-link").forEach((btn) => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });

  el("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const username = el("#login-username").value;
    const password = el("#login-password").value;
    attemptLogin(username, password);
  });

  el("#logout-btn").addEventListener("click", () => {
    state.user = null;
    switchView("shop");
  });

  el("#reset-btn").addEventListener("click", resetAll);

  el("#loading-banner").style.display = "none";
  el("#app-root").style.display = "block";
}

boot();
