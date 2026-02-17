"""
Quick script to add credits to a user account
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def add_credits(email: str, credits_amount: int = 100):
    """Add credits to a user by email"""
    session = Session()
    try:
        # Find user by email
        result = session.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email}
        )
        user = result.fetchone()

        if not user:
            print(f"[ERROR] User with email '{email}' not found")
            return False

        user_id = user[0]
        print(f"[OK] Found user: {user_id}")

        # Check if credits record exists
        credits_result = session.execute(
            text("SELECT credits_left FROM credits WHERE user_id = :user_id"),
            {"user_id": user_id}
        )
        existing = credits_result.fetchone()

        if existing:
            # Update existing credits
            session.execute(
                text("UPDATE credits SET credits_left = credits_left + :amount WHERE user_id = :user_id"),
                {"amount": credits_amount, "user_id": user_id}
            )
            new_total = existing[0] + credits_amount
            print(f"[OK] Updated credits: {existing[0]} -> {new_total}")
        else:
            # Create new credits record
            session.execute(
                text("INSERT INTO credits (user_id, credits_left) VALUES (:user_id, :amount)"),
                {"user_id": user_id, "amount": credits_amount}
            )
            print(f"[OK] Created credits record with {credits_amount} credits")

        session.commit()
        print(f"[OK] Successfully added {credits_amount} credits to {email}")
        return True

    except Exception as e:
        session.rollback()
        print(f"[ERROR] {e}")
        return False
    finally:
        session.close()

if __name__ == "__main__":
    email = "test@clipking.dev"
    credits = 100

    if len(sys.argv) > 1:
        email = sys.argv[1]
    if len(sys.argv) > 2:
        credits = int(sys.argv[2])

    print(f"Adding {credits} credits to {email}...")
    add_credits(email, credits)
