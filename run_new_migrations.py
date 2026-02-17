"""
Run only the new migrations (009 and 010)
"""
import psycopg2
import os
from dotenv import load_dotenv
from urllib.parse import urlparse

load_dotenv()

def parse_database_url(url):
    """Parse PostgreSQL connection string"""
    result = urlparse(url)
    return {
        'dbname': result.path[1:],
        'user': result.username,
        'password': result.password,
        'host': result.hostname,
        'port': result.port or 5432
    }

def run_sql_file(conn, filepath):
    """Execute SQL file"""
    print(f"\n📄 Running {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    with conn.cursor() as cur:
        cur.execute(sql_content)
    conn.commit()
    print(f"✅ {filepath} executed successfully!")

# Get database connection
db_url = os.getenv("DATABASE_URL")
conn_params = parse_database_url(db_url)

print("🚀 Running New Migrations")
print("=" * 50)

try:
    conn = psycopg2.connect(**conn_params)
    print("✅ Connected to database")

    # Run only the new migrations
    new_migrations = [
        'migrations/009_add_duration_column.sql',
        'migrations/010_trending_video_tables.sql',
    ]

    for migration_file in new_migrations:
        if os.path.exists(migration_file):
            run_sql_file(conn, migration_file)
        else:
            print(f"⚠️  Warning: {migration_file} not found")

    conn.close()
    print("\n" + "=" * 50)
    print("✅ New migrations completed!")

except Exception as e:
    print(f"\n❌ Error: {e}")
