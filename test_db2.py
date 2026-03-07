import os
from sqlalchemy import create_engine, text
import sqlalchemy.exc

password = "SlimReaper%24007"
project_id = "fpsbmimzxqxjugpjmtlb"
regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2", 
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "ap-southeast-1", "ap-northeast-1", "ap-northeast-2", "ap-southeast-2", 
    "sa-east-1", "ca-central-1", "ap-south-1"
]

user = f"postgres.{project_id}"

for region in regions:
    host = f"aws-0-{region}.pooler.supabase.com"
    db_url = f"postgresql://{user}:{password}@{host}:6543/postgres"
    
    engine = create_engine(db_url, connect_args={'connect_timeout': 3})
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print(f"SUCCESS region: {region}")
        break
    except Exception as e:
        err = str(e)
        if "password authentication failed" in err:
            print(f"Region is definitely {region}, but auth failed!")
            break
        elif "timeout" not in err.lower() and "could not translate" not in err.lower() and "connection refused" not in err.lower():
            print(f"Region {region} error: {err[:100]}")
