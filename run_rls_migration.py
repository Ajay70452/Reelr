import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def run_rls_migration():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is missing.")
        return
    
    print("Connecting to database...")
    try:
        conn = psycopg2.connect(db_url)
        print("Connected to database")
        
        filepath = 'migrations/012_enable_rls.sql'
        print(f"\nRunning {filepath}...")
        
        with open(filepath, 'r', encoding='utf-8') as f:
            sql_content = f.read()

        with conn.cursor() as cur:
            cur.execute(sql_content)
        conn.commit()
        
        print(f"Executed {filepath} successfully! RLS policies have been enabled.")
        conn.close()
    except Exception as e:
        print(f"\nError running migration: {e}")

if __name__ == "__main__":
    run_rls_migration()
