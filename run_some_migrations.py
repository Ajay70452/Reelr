import os
from sqlalchemy import create_engine
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)

migrations = [
    'migrations/004_ai_video_tables.sql',
    'migrations/005_preset_prompt_columns.sql',
    'migrations/006_add_ai_generation_presets.sql',
    'migrations/007_preset_thumbnails.sql',
    'migrations/008_script_to_video_tables.sql',
    'migrations/009_add_duration_column.sql',
    'migrations/010_trending_video_tables.sql',
]

with engine.begin() as conn:
    for migration in migrations:
        try:
            with open(migration, "r") as f:
                sql = f.read()
            # Split the statements carefully, but psycopg2 allows running multiple statements!
            # Using sqlalchemy text:
            from sqlalchemy import text
            conn.execute(text(sql))
            print(f"Executed {migration}")
        except Exception as e:
            print(f"Failed {migration}: {e}")
