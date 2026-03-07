"""
User endpoints - Credits, profile, etc.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import User, Credit
from app.core.auth import get_current_user
from app.schemas import CreditsResponse, UserResponse

router = APIRouter(prefix="/user", tags=["User"])


@router.get("/me", response_model=UserResponse)
def get_current_user_info(user: User = Depends(get_current_user)):
    """Get current user profile"""
    return user


@router.get("/credits", response_model=CreditsResponse)
def get_user_credits(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's current credit balance"""
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    
    if not credit:
        # Create credits entry if doesn't exist
        credit = Credit(user_id=user.id, credits_left=10)  # Free tier: 10 credits
        db.add(credit)
        db.commit()
    
    return {
        "credits": credit.credits_left,
        "plan": user.plan
    }


# NOTE: /credits/consume and /credits/refund endpoints have been removed.
# Credit operations are now handled internally by the video generation pipeline
# (see video.py and ai_video.py) to prevent users from self-refunding credits.
