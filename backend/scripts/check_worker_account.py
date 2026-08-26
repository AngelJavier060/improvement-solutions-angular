import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5434,
    dbname="db_improvement_solutions",
    user="postgres",
    password="Alexandra1",
)
cur = conn.cursor()

cedula = "0603965187"
print("--- users with username/email like cedula ---")
cur.execute(
    "SELECT id, username, email, is_active FROM users WHERE username = %s OR email = %s OR username LIKE %s",
    (cedula, cedula, f"%{cedula}%"),
)
print(cur.fetchall())

print("--- business_employees with this cedula ---")
cur.execute(
    """
    SELECT be.id, be.cedula, be.nombres, be.apellidos, be.email, be.user_id, be.business_id, be.active
    FROM business_employees be
    WHERE be.cedula = %s OR be.cedula LIKE %s
    """,
    (cedula, f"%{cedula}%"),
)
rows = cur.fetchall()
print(rows)

print("--- ROLE_EMPLOYEE exists? ---")
cur.execute("SELECT id, name FROM roles WHERE name = 'ROLE_EMPLOYEE'")
print(cur.fetchall())

conn.close()
