import os
from sqlalchemy import create_engine, text

passwords = [
    "SlimReaper@007",
    "SlimReaper@07",
    "Slimreaper@007",
    "Slimreaper@07"
]

project_id = "fpsbmimzxqxjugpjmtlb"
regions = [
    "us-east-1", "us-west-1", "eu-central-1", "eu-west-1", "eu-west-2",
    "ap-southeast-1", "ap-northeast-1", "ap-southeast-2", "sa-east-1", "ca-central-1", "ap-south-1"
]

for pwd in passwords:
    pwd_encoded = pwd.replace('@', '%40')
    user = f"postgres.{project_id}"
    
    for region in regions:
        host = f"aws-0-{region}.pooler.supabase.com"
        db_url = f"postgresql://{user}:{pwd_encoded}@{host}:6543/postgres"
        
        engine = create_engine(db_url, connect_args={'connect_timeout': 3})
        print(f"Testing password: {pwd} in region: {region}")
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"SUCCESS with password: {pwd} and region: {region}")
            
            # Save to .env
            with open('.env', 'a') as f:
                f.write(f"\n# Tested DATABASE_URL\nDATABASE_URL_TESTED={db_url}\n")
            print("Saved to .env")
            exit(0)
        except Exception as e:
            pass
