import os
import sqlite3
from flask import Flask, render_template, request, session, redirect, url_for

from database import get_conn, init_db, DB_PATH

app = Flask(__name__)
app.secret_key = "demo-secret-key-not-for-production"

CATEGORIES = ["all", "apparel", "outerwear", "accessories", "bags", "home", "footwear"]


@app.before_request
def ensure_db():
    if not os.path.exists(DB_PATH):
        init_db()
    if "mode" not in session:
        session["mode"] = "vulnerable"


def current_mode():
    return session.get("mode", "vulnerable")


@app.route("/set-mode", methods=["POST"])
def set_mode():
    mode = request.form.get("mode", "vulnerable")
    session["mode"] = "secure" if mode == "secure" else "vulnerable"
    session.pop("query_log", None)
    return redirect(request.referrer or url_for("index"))


@app.route("/")
def index():
    category = request.args.get("category", "all")
    search = request.args.get("q", "")
    conn = get_conn()
    query_log = None
    error = None
    products = []

    try:
        if current_mode() == "vulnerable":
            # --- INTENTIONALLY VULNERABLE ---
            # User input is concatenated directly into the SQL string.
            if search:
                sql = (
                    "SELECT id, name, category, price, swatch, description "
                    "FROM products WHERE name LIKE '%" + search + "%'"
                )
            elif category and category != "all":
                sql = (
                    "SELECT id, name, category, price, swatch, description "
                    "FROM products WHERE category = '" + category + "'"
                )
            else:
                sql = "SELECT id, name, category, price, swatch, description FROM products"
            query_log = sql
            rows = conn.execute(sql).fetchall()
        else:
            # --- SECURE VERSION ---
            # User input is always passed as a bound parameter, never
            # concatenated into the query string.
            if search:
                sql = (
                    "SELECT id, name, category, price, swatch, description "
                    "FROM products WHERE name LIKE ?"
                )
                params = (f"%{search}%",)
            elif category and category != "all":
                sql = (
                    "SELECT id, name, category, price, swatch, description "
                    "FROM products WHERE category = ?"
                )
                params = (category,)
            else:
                sql = "SELECT id, name, category, price, swatch, description FROM products"
                params = ()
            query_log = sql + ("  -- params: " + str(params) if params else "")
            rows = conn.execute(sql, params).fetchall()

        products = [dict(r) for r in rows]
    except sqlite3.Error as e:
        error = str(e)
    finally:
        conn.close()

    session["query_log"] = query_log
    return render_template(
        "index.html",
        products=products,
        categories=CATEGORIES,
        active_category=category,
        search=search,
        query_log=query_log,
        error=error,
        mode=current_mode(),
    )


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    query_log = None
    user = None

    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        conn = get_conn()
        try:
            if current_mode() == "vulnerable":
                sql = (
                    "SELECT * FROM users WHERE username = '" + username +
                    "' AND password = '" + password + "'"
                )
                query_log = sql
                row = conn.execute(sql).fetchone()
            else:
                sql = "SELECT * FROM users WHERE username = ? AND password = ?"
                query_log = sql + f"  -- params: ('{username}', '***')"
                row = conn.execute(sql, (username, password)).fetchone()

            if row:
                user = dict(row)
                session["user"] = user["username"]
                session["role"] = user["role"]
            else:
                error = "Invalid username or password."
        except sqlite3.Error as e:
            error = str(e)
        finally:
            conn.close()

    session["query_log"] = query_log
    if user:
        return redirect(url_for("account"))

    return render_template("login.html", error=error, query_log=query_log, mode=current_mode())


@app.route("/account")
def account():
    if "user" not in session:
        return redirect(url_for("login"))
    return render_template("account.html", username=session["user"], role=session.get("role"))


@app.route("/logout")
def logout():
    session.pop("user", None)
    session.pop("role", None)
    return redirect(url_for("index"))


@app.route("/reset")
def reset():
    """Wipe session + rebuild the seed database, for restarting the exercise."""
    init_db()
    session.clear()
    return redirect(url_for("index"))


if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
