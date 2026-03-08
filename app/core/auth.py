"""
Authentication utilities for JWT and Supabase
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
import jwt
from datetime import datetime, timedelta, timezone
import uuid

from app.core.config import settings
from app.db import get_db
from app.db.models import User, Credit

security = HTTPBearer()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def verify_supabase_token(token: str) -> dict:
    """
    Decode and verify Supabase JWT token.
    Uses SUPABASE_JWT_SECRET for signature verification in production.
    """
    try:
        if settings.SUPABASE_JWT_SECRET:
            # Production: verify signature with Supabase JWT secret
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        else:
            # Development only: decode without verification
            import logging
            logging.getLogger(__name__).warning(
                "SUPABASE_JWT_SECRET not set — JWT signature verification DISABLED. "
                "Set SUPABASE_JWT_SECRET before deploying to production!"
            )
            payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        import logging
        try:
            unverified_header = jwt.get_unverified_header(token)
            alg = unverified_header.get("alg")
        except Exception:
            alg = "unknown"
            
        logging.getLogger(__name__).error(f"JWT Validation error: {str(e)} (Token alg: {alg})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}. (Token alg was {alg})"
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Unexpected JWT error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication error: {str(e)}"
        )


from fastapi import Request

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from Supabase JWT token.
    Creates user if they don't exist (first-time login).
    """
    import logging
    logger = logging.getLogger(__name__)
    logger.error(f"INCOMING HEADERS: {dict(request.headers)}")
    
    # 1. Try custom header (immune to Vercel/ALB proxy overwrites)
    token = request.headers.get("supabase-token") or request.headers.get("x-supabase-auth")
    
    # 2. Fallback to standard Authorization header
    if not token and credentials:
        token = credentials.credentials
        logger.error("supabase-token was MISSING in headers, falling back to Authorization header")
        
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token"
        )
        
    logger.error(f"Extracted Token (first 20 chars): {token[:20]}...")
    payload = verify_supabase_token(token)

    # Supabase token has 'sub' as the user ID
    supabase_user_id = payload.get("sub")
    email = payload.get("email")

    if supabase_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload - no user ID"
        )

    # Try to find user by Supabase ID
    try:
        user_uuid = uuid.UUID(supabase_user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format"
        )

    user = db.query(User).filter(User.id == user_uuid).first()

    # If user doesn't exist, create them (first-time login)
    if user is None and email:
        user = User(
            id=user_uuid,
            email=email,
            auth_provider='supabase',
            plan='free'
        )
        db.add(user)
        db.flush()

        # Create initial credits for new user
        credit = Credit(user_id=user_uuid, credits_left=10)
        db.add(credit)
        db.commit()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found and could not be created"
        )

    return user


def get_optional_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Optional authentication - returns None if not authenticated"""
    try:
        token = request.headers.get("supabase-token") or request.headers.get("x-supabase-auth")
        if not token and credentials:
            token = credentials.credentials
            
        if not token:
            return None
            
        return get_current_user(request=request, credentials=credentials, db=db)
    except HTTPException:
        return None
