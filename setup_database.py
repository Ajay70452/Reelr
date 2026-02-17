"""
Database setup script for ClipKing
Runs SQL migrations and seeds data

Usage:
    python setup_database.py
"""

import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()

def get_database_url():
    """Get database URL from environment"""
    return os.getenv("DATABASE_URL")

def parse_database_url(url):
    """Parse PostgreSQL connection string"""
    # Handle postgresql:// or postgres:// schemes
    if url.startswith("postgresql://") or url.startswith("postgres://"):
        from urllib.parse import urlparse
        result = urlparse(url)
        return {
            'dbname': result.path[1:],
            'user': result.username,
            'password': result.password,
            'host': result.hostname,
            'port': result.port or 5432
        }
    return None

def run_sql_file(conn, filepath):
    """Execute SQL file"""
    print(f"\n📄 Running {filepath}...")
    with open(filepath, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    with conn.cursor() as cur:
        cur.execute(sql_content)
    conn.commit()
    print(f"✅ {filepath} executed successfully!")

def setup_database():
    """Main setup function"""
    print("🚀 ClipKing Database Setup")
    print("=" * 50)
    
    # Get database URL
    db_url = get_database_url()
    if not db_url:
        print("❌ DATABASE_URL not found in environment variables")
        print("Please create a .env file with:")
        print("DATABASE_URL=postgresql://user:password@host:port/dbname")
        return False
    
    # Parse connection details
    conn_params = parse_database_url(db_url)
    if not conn_params:
        print("❌ Invalid DATABASE_URL format")
        return False
    
    print(f"\n📊 Connecting to database: {conn_params['dbname']}")
    print(f"   Host: {conn_params['host']}")
    print(f"   Port: {conn_params['port']}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**conn_params)
        print("✅ Connected successfully!")
        
        # Run migrations
        migration_files = [
            'migrations/001_initial_schema.sql',
            'migrations/002_seed_data.sql',
            'migrations/003_test_user.sql',
            'migrations/004_ai_video_tables.sql',
            'migrations/005_preset_prompt_columns.sql',
            'migrations/006_add_ai_generation_presets.sql',
            'migrations/007_preset_thumbnails.sql',
            'migrations/008_script_to_video_tables.sql',
            'migrations/009_add_duration_column.sql',
            'migrations/010_trending_video_tables.sql',
        ]
        
        for migration_file in migration_files:
            if os.path.exists(migration_file):
                run_sql_file(conn, migration_file)
            else:
                print(f"⚠️  Warning: {migration_file} not found")
        
        conn.close()
        print("\n" + "=" * 50)
        print("✅ Database setup completed successfully!")
        print("\nNext steps:")
        print("1. Verify tables: psql -d clipking -c '\\dt'")
        print("2. Run the FastAPI app: uvicorn app.main:app --reload")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Check DATABASE_URL in .env file")
        print("2. Ensure PostgreSQL is running")
        print("3. Verify database credentials")
        return False

if __name__ == "__main__":
    setup_database()
