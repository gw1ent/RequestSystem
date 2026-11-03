import sqlite3
from pathlib import Path
import os

# Настройки
DB_FILE = "RequestSystem.db"
SQL_FILES = ["schema.sql", "seed.sql", "queries.sql"]

if os.path.exists(DB_FILE):
    os.remove(DB_FILE)
    print("Старая база данных удалена. Создаем новую...")

conn = sqlite3.connect(DB_FILE)
conn.execute("PRAGMA foreign_keys = ON;")
cursor = conn.cursor()


def run_sql_file(filename):
    print(f"\n{'=' * 50}")
    print(f"ЗАПУСК ФАЙЛА: {filename}")
    print(f"{'=' * 50}")

    path = Path(filename)
    if not path.exists():
        print(f"!!! Файл {filename} не найден в папке !!!")
        return

    sql = path.read_text(encoding="utf-8")
    statements = [s.strip() for s in sql.split(";") if s.strip()]

    for stmt in statements:
        clean = "\n".join(l for l in stmt.splitlines() if not l.strip().startswith("--")).strip()
        if not clean:
            continue

        try:
            cursor.execute(stmt)

            if clean.upper().lstrip().startswith("SELECT"):
                rows = cursor.fetchall()
                if cursor.description:
                    cols = [d[0] for d in cursor.description]
                    print("\n--- РЕЗУЛЬТАТ SELECT ---")
                    print(" | ".join(cols))
                    print("-" * 60)
                    for row in rows:
                        print(" | ".join("" if v is None else str(v) for v in row))
            else:
                action = clean.split()[0].upper()
                print(f"[{action} OK] Выполнено")

        except sqlite3.Error as e:
            print(f"\n[ОШИБКА БД] В запросе: {clean[:50]}...\nПричина: {e}")


for file in SQL_FILES:
    run_sql_file(file)

conn.commit()
conn.close()
print(f"\n{'=' * 50}")
print("ВСЁ ГОТОВО! База данных RequestSystem.db создана и заполнена.")