"""
Redis Connection Manager
Handles Redis connection pooling and health checks
"""

import redis
from redis import Redis, ConnectionPool
from typing import Optional
from app.core.config import settings


# Connection pool for Redis
_connection_pool: Optional[ConnectionPool] = None


def get_connection_pool() -> ConnectionPool:
    """Get or create Redis connection pool"""
    global _connection_pool

    if _connection_pool is None:
        kwargs = {
            "max_connections": 20,
            "decode_responses": False,
        }
        if settings.REDIS_URL.startswith("rediss://"):
            kwargs["ssl_cert_reqs"] = "none"

        _connection_pool = ConnectionPool.from_url(
            settings.REDIS_URL,
            **kwargs
        )

    return _connection_pool


def get_redis_connection() -> Redis:
    """Get a Redis connection from the pool"""
    pool = get_connection_pool()
    return Redis(connection_pool=pool)


def test_redis_connection() -> bool:
    """Test if Redis is reachable"""
    try:
        conn = get_redis_connection()
        conn.ping()
        return True
    except Exception as e:
        print(f"\n[CRITICAL] Redis Connection Failed: {e}\n")
        import traceback
        traceback.print_exc()
        return False


def get_redis_info() -> dict:
    """Get Redis server info"""
    try:
        conn = get_redis_connection()
        info = conn.info()
        return {
            "connected": True,
            "redis_version": info.get("redis_version", "unknown"),
            "used_memory_human": info.get("used_memory_human", "unknown"),
            "connected_clients": info.get("connected_clients", 0),
            "uptime_in_seconds": info.get("uptime_in_seconds", 0),
        }
    except Exception as e:
        return {
            "connected": False,
            "error": str(e),
        }


# Lazy-loaded connection instance
redis_conn: Redis = None


def init_redis() -> Redis:
    """Initialize the global Redis connection"""
    global redis_conn
    redis_conn = get_redis_connection()
    return redis_conn
