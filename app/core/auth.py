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


import logging

logger = logging.getLogger(__name__)

# Cache the JWKS client so we don't create a new one per request
_jwks_client = None


def _get_jwks_client():
    """Get or create a cached PyJWKClient for Supabase JWKS verification."""
    global _jwks_client
    if _jwks_client is None and settings.SUPABASE_URL:
        from jwt import PyJWKClient
        jwks_url = f"{settings.SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        logger.info(f"Initializing JWKS client with URL: {jwks_url}")
        _jwks_client = PyJWKClient(jwks_url, cache_keys=True)
    return _jwks_client


def verify_supabase_token(token: str) -> dict:
    """
    Decode and verify Supabase JWT token.
    Supports both HS256 (legacy) and ES256 (new Supabase default) algorithms.
    """
    try:
        # First, peek at the token header to determine the algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", "HS256")
        logger.info(f"Token algorithm: {alg}")

        if alg == "ES256":
            # New Supabase tokens use ES256 — verify with JWKS public key
            jwks_client = _get_jwks_client()
            if jwks_client:
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["ES256"],
                    audience="authenticated",
                )
            else:
                # No SUPABASE_URL set, can't verify ES256 — decode without verification
                logger.warning("No SUPABASE_URL set, cannot verify ES256 token signature")
                payload = jwt.decode(token, options={"verify_signature": False})

        elif alg == "HS256" and settings.SUPABASE_JWT_SECRET:
            # Legacy HS256 tokens — verify with JWT secret
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )

        else:
            # Development fallback: decode without verification
            logger.warning(
                f"JWT verification disabled for alg={alg}. "
                "Set SUPABASE_JWT_SECRET or SUPABASE_URL before deploying to production!"
            )
            payload = jwt.decode(token, options={"verify_signature": False})

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT Validation error: {str(e)} (alg: {alg})")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected JWT error: {str(e)}")
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
