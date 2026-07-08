# Northfield Goods — UNION-based SQL Injection Sandbox

A small, self-contained e-commerce demo built to **show** UNION-based SQL
injection, not just describe it. The product search and login forms run in
one of two modes, switchable live from the top nav bar:

- **Vulnerable mode** — inputs are concatenated directly into SQL strings.
- **Secure mode** — the exact same features, rewritten with parameterized
  queries.

A "query console" at the bottom of every page shows the **raw SQL that was
just executed**, so the connection between what you typed and what the
database ran is never hidden.

This is a teaching/portfolio artifact. It is not hardened, not meant to be
deployed publicly, and stores no real user data.

---

## Stack

- Python 3 + Flask
- SQLite (file-based, reset on demand)
- No frontend framework — vanilla HTML/CSS/JS, Jinja2 templates

## Running it

```bash
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 app.py
```

Then open `http://localhost:5000`. The database seeds itself automatically
on first run. Visit `/reset` at any time to wipe and reseed it.

---

## The vulnerability

### 1. Product search (`/`)

Vulnerable query:

```sql
SELECT id, name, category, price, swatch, description
FROM products WHERE name LIKE '%<input>%'
```

Try these in the search box while in **vulnerable** mode:

| Payload | What it does |
|---|---|
| `' OR '1'='1' --` | Returns every product, ignoring the filter |
| `' ORDER BY 6-- ` | Confirms the query has 6 columns (raise the number until it errors) |
| `' UNION SELECT id, username, password, email, role, 1 FROM users-- ` | Dumps the `users` table into the product grid |
| `' UNION SELECT id, title, body, author, classification, 1 FROM internal_memos-- ` | Dumps a restricted internal memo table — the "flag" for this exercise |

### 2. Login (`/login`)

Vulnerable query:

```sql
SELECT * FROM users WHERE username = '<input>' AND password = '<input>'
```

Try username `admin' --` with any password, or `' OR '1'='1' --` in either
field, to bypass authentication entirely.

### 3. Flip the switch

Click **secure** in the top bar and repeat the same payloads. The query
console shows the query is now sent with bound parameters (`?` placeholders),
so the input is treated as data, never as part of the SQL statement — the
payloads return zero results or fail to log in, exactly as they should.

---

## Why it works (and how it's fixed)

**Vulnerable pattern:**

```python
sql = "SELECT * FROM products WHERE name LIKE '%" + search + "%'"
conn.execute(sql)
```

The database can't tell the difference between the query's own syntax and
attacker-supplied data, because both arrive as one string.

**Fix — parameterized queries:**

```python
sql = "SELECT * FROM products WHERE name LIKE ?"
conn.execute(sql, (f"%{search}%",))
```

The driver sends the query structure and the data separately. The database
only ever treats `?` as a value slot, so `' OR '1'='1` is compared literally
against the `name` column instead of being parsed as SQL.

This maps to **OWASP Top 10 – A03:2021 Injection**. The same fix applies
regardless of language or database: use parameterized queries / prepared
statements, or an ORM that does this for you, and never build SQL by string
concatenation from user input.

---

## Project structure

```
vulnmart/
├── app.py                 # Flask routes, vulnerable + secure query builders
├── database.py             # SQLite schema + seed data
├── requirements.txt
├── templates/
│   ├── base.html            # layout, mode toggle, query console
│   ├── index.html            # catalog + search
│   ├── login.html            # login form
│   └── account.html          # post-login / post-bypass landing page
└── static/
    ├── css/style.css
    └── js/main.js
```

## Disclaimer

For education and portfolio demonstration only. Do not deploy this
publicly, and do not point automated scanners or real attack tooling at it
outside a machine you control.
