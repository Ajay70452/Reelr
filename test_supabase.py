import urllib.parse
from sqlalchemy import create_engine, text

# URL from the .env directly
base_url = "postgresql://postgres.fpsbmimzxqxjugpjmtlb:SlimReaper%24007@{host}:6543/postgres"

regions = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2", 
    "eu-central-1", "eu-west-1", "eu-west-2", "eu-west-3", "eu-north-1",
    "ap-southeast-1", "ap-northeast-1", "ap-northeast-2", "ap-southeast-2", 
    "sa-east-1", "ca-central-1", "ap-south-1"
]

for aws_id in [0, 1]:
    for region in regions:
        host = f"aws-{aws_id}-{region}.pooler.supabase.com"
        db_url = base_url.format(host=host)
        engine = create_engine(db_url, connect_args={'connect_timeout': 3})
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print(f"SUCCESS host: {host}")
            
            with open('.env', 'r') as f:
                content = f.read()
            import re
            content = re.sub(r'DATABASE_URL=.*', f'DATABASE_URL={db_url}', content)
            with open('.env', 'w') as f:
                f.write(content)
            print("Updated .env with the correct URL!")
            import sys
            sys.exit(0)
        except Exception as e:
            err = str(e)
            if "password authentication failed" in err:
                print(f"Host {host}: Auth failed (wrong password!)")
            # else silently ignore timeouts
