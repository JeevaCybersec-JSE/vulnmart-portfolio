import sqlite3
import os

if os.environ.get("VERCEL"):
    DB_PATH = "/tmp/store.db"
else:
    DB_PATH = os.path.join(os.path.dirname(__file__), "store.db")


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE products (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            swatch TEXT NOT NULL,
            description TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL,
            email TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)

    products = [
        ("Fog Canvas Tote", "bags", 48.00, "#B7C4C2", "Undyed canvas tote with a waxed-cotton base."),
        ("Ridge Wool Beanie", "accessories", 22.00, "#8A7A66", "Rib-knit beanie in a heavyweight merino blend."),
        ("Northfield Field Jacket", "outerwear", 168.00, "#4C5B5A", "Water-resistant shell with a brushed flannel lining."),
        ("Slate Ceramic Mug", "home", 18.00, "#6E7B7A", "Hand-thrown stoneware mug, dishwasher safe."),
        ("Harbor Linen Shirt", "apparel", 74.00, "#C9BFA8", "Garment-dyed linen, relaxed fit through the body."),
        ("Cedar Desk Lamp", "home", 96.00, "#7A5C3E", "Solid cedar base with a brass-finished swivel arm."),
        ("Moss Trail Backpack", "bags", 112.00, "#5B6B4E", "20L daypack with a padded laptop sleeve."),
        ("Quarry Denim Apron", "home", 38.00, "#3E4A52", "Heavyweight cotton apron with a brass buckle strap."),
        ("Ash Wool Scarf", "accessories", 34.00, "#A8A29A", "Lambswool scarf, woven in a small mill run."),
        ("Basin Rain Boots", "footwear", 88.00, "#2F3B3A", "Natural rubber boots with a fleece-lined collar."),
        ("Timber Card Wallet", "accessories", 26.00, "#8C6F4E", "Vegetable-tanned leather, holds up to six cards."),
        ("Pine Throw Blanket", "home", 64.00, "#556352", "Brushed wool-blend throw, woven herringbone pattern."),
    ]
    cur.executemany(
        "INSERT INTO products (name, category, price, swatch, description) VALUES (?, ?, ?, ?, ?)",
        products,
    )

    # Deliberately weak/plaintext-looking credentials to make the exercise legible.
    # This is a teaching sandbox — never store real passwords like this.
    users = [
        ("admin", "N0rthf!eld_R00t_2024", "admin@northfieldgoods.example", "administrator"),
        ("mjenkins", "summer2019", "m.jenkins@northfieldgoods.example", "staff"),
        ("s.oyelaran", "trustno1", "s.oyelaran@northfieldgoods.example", "staff"),
        ("guest", "guest", "guest@northfieldgoods.example", "customer"),
    ]
    cur.executemany(
        "INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)",
        users,
    )

    cur.execute("""
        CREATE TABLE internal_memos (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            author TEXT NOT NULL,
            classification TEXT NOT NULL
        )
    """)
    cur.execute(
        "INSERT INTO internal_memos (title, body, author, classification) VALUES (?, ?, ?, ?)",
        (
            "Q3 vendor renewal",
            "Renewal terms attached, nothing unusual this cycle.",
            "s.oyelaran",
            "internal",
        ),
    )
    cur.execute(
        "INSERT INTO internal_memos (title, body, author, classification) VALUES (?, ?, ?, ?)",
        (
            "Root access review",
            "FLAG{union_select_your_way_to_admin}",
            "admin",
            "restricted",
        ),
    )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print(f"Seeded database at {DB_PATH}")
