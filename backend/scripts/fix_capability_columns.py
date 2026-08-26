import psycopg2

conn = psycopg2.connect(
    host="localhost",
    port=5434,
    dbname="db_improvement_solutions",
    user="postgres",
    password="Alexandra1",
)
conn.autocommit = True
cur = conn.cursor()
for col in ("can_overtime", "can_vacations", "can_time_off"):
    cur.execute(
        f"ALTER TABLE user_operational_capabilities "
        f"ADD COLUMN IF NOT EXISTS {col} BOOLEAN NOT NULL DEFAULT FALSE"
    )
    print(f"ensured column {col}")
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name='user_operational_capabilities' ORDER BY 1"
)
print("columns:", [r[0] for r in cur.fetchall()])
conn.close()
print("OK")
