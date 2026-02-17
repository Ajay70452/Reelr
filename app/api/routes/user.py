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


@router.post("/credits/consume")
def consume_credits(
    amount: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Consume credits for a job"""
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    
    if not credit or credit.credits_left < amount:
        raise HTTPException(status_code=402, detail="Insufficient credits")
    
    credit.credits_left -= amount
    db.commit()
    
    return {
        "success": True,
        "remaining": credit.credits_left
    }


@router.post("/credits/refund")
def refund_credits(
    amount: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Refund credits (used when job fails)"""
    credit = db.query(Credit).filter(Credit.user_id == user.id).first()
    
    if credit:
        credit.credits_left += amount
        db.commit()
    
    return {
        "success": True,
        "remaining": credit.credits_left
    }
