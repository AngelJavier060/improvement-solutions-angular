import psycopg2
import bcrypt
from datetime import datetime

CEDULA = "0603965187"
EMP_ID = 1
BUSINESS_ID = 1
EMAIL = "javierangelmsn@gmail.com"
NAME = "Angel Guerrero"

conn = psycopg2.connect(
    host="localhost",
    port=5434,
    dbname="db_improvement_solutions",
    user="postgres",
    password="Alexandra1",
)
conn.autocommit = False
cur = conn.cursor()

cur.execute("SELECT id FROM users WHERE username = %s", (CEDULA,))
if cur.fetchone():
    print("Ya existe usuario con esa cédula")
    conn.close()
    raise SystemExit(0)

pwd_hash = bcrypt.hashpw(CEDULA.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
now = datetime.now()

cur.execute(
    """
    INSERT INTO users (username, password, email, name, is_active, created_at, updated_at)
    VALUES (%s, %s, %s, %s, TRUE, %s, %s)
    RETURNING id
    """,
    (CEDULA, pwd_hash, EMAIL, NAME, now, now),
)
user_id = cur.fetchone()[0]
print("user_id", user_id)

cur.execute("SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE'")
role_id = cur.fetchone()[0]
cur.execute(
    "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
    (user_id, role_id),
)

# user_business join (table name from entity)
cur.execute(
    """
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema='public' AND table_name='user_business'
    )
    """
)
if cur.fetchone()[0]:
    cur.execute(
        "INSERT INTO user_business (user_id, business_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
        (user_id, BUSINESS_ID),
    )

cur.execute(
    "UPDATE business_employees SET user_id = %s WHERE id = %s",
    (user_id, EMP_ID),
)

conn.commit()
print(f"OK cuenta creada: username={CEDULA} password={CEDULA} user_id={user_id}")
conn.close()
