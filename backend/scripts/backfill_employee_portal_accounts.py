"""Backfill: crea/vincula cuentas portal (cédula/cédula) para empleados sin user_id."""
import psycopg2
import bcrypt
from datetime import datetime

conn = psycopg2.connect(
    host="localhost",
    port=5434,
    dbname="db_improvement_solutions",
    user="postgres",
    password="Alexandra1",
)
conn.autocommit = False
cur = conn.cursor()

cur.execute("SELECT id FROM roles WHERE name = 'ROLE_EMPLOYEE'")
role_row = cur.fetchone()
if not role_row:
    raise SystemExit("ROLE_EMPLOYEE no existe")
role_id = role_row[0]

cur.execute(
    """
    SELECT be.id, be.cedula, be.nombres, be.apellidos, be.email, be.phone, be.business_id, be.user_id
    FROM business_employees be
    WHERE be.cedula IS NOT NULL AND TRIM(be.cedula) <> ''
    ORDER BY be.id
    """
)
rows = cur.fetchall()
created = 0
linked = 0
now = datetime.now()

for be_id, cedula, nombres, apellidos, email, phone, business_id, user_id in rows:
    cedula = (cedula or "").strip()
    if not cedula:
        continue

    cur.execute("SELECT id FROM users WHERE username = %s", (cedula,))
    u = cur.fetchone()
    if u:
        uid = u[0]
    else:
        # buscar otro BE con misma cedula y user
        cur.execute(
            "SELECT user_id FROM business_employees WHERE cedula = %s AND user_id IS NOT NULL LIMIT 1",
            (cedula,),
        )
        other = cur.fetchone()
        if other and other[0]:
            uid = other[0]
        else:
            mail = (email or "").strip() or f"{cedula}@trabajador.local"
            cur.execute("SELECT id FROM users WHERE email = %s", (mail,))
            if cur.fetchone():
                mail = f"{cedula}@trabajador.local"
            name = f"{(nombres or '').strip()} {(apellidos or '').strip()}".strip() or cedula
            pwd = bcrypt.hashpw(cedula.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")
            cur.execute(
                """
                INSERT INTO users (username, password, email, name, phone, is_active, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, TRUE, %s, %s) RETURNING id
                """,
                (cedula, pwd, mail, name, phone, now, now),
            )
            uid = cur.fetchone()[0]
            cur.execute(
                "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                (uid, role_id),
            )
            created += 1

    if user_id != uid:
        cur.execute("UPDATE business_employees SET user_id = %s WHERE id = %s", (uid, be_id))
        linked += 1

    if business_id:
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
                (uid, business_id),
            )

conn.commit()
print(f"OK created={created} linked/updated={linked} total_rows={len(rows)}")
conn.close()
