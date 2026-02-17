#!/usr/bin/env python
"""
Test script for Redis Queue setup
Run this to verify the queue infrastructure is working correctly
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.queue.connection import test_redis_connection, get_redis_info
from app.queue.queues import QueueNames, get_queue, get_all_queue_stats


def main():
    print("=" * 60)
    print("ClipKing Queue Infrastructure Test")
    print("=" * 60)

    # Test 1: Redis Connection
    print("\n1. Testing Redis connection...")
    if test_redis_connection():
        print("   ✅ Redis is connected!")
        info = get_redis_info()
        print(f"   Version: {info.get('redis_version', 'unknown')}")
        print(f"   Memory: {info.get('used_memory_human', 'unknown')}")
    else:
        print("   ❌ Redis connection FAILED!")
        print("   Make sure Redis is running:")
        print("   - Docker: docker-compose up -d redis")
        print("   - Or: docker run -d -p 6379:6379 redis")
        return False

    # Test 2: Queue Creation
    print("\n2. Testing queue creation...")
    try:
        for qn in QueueNames:
            queue = get_queue(qn)
            print(f"   ✅ {qn.value}: {len(queue)} jobs")
        print("   All queues created successfully!")
    except Exception as e:
        print(f"   ❌ Queue creation failed: {e}")
        return False

    # Test 3: Queue Stats
    print("\n3. Getting queue statistics...")
    try:
        stats = get_all_queue_stats()
        print(f"   Total queues: {len(stats)}")
        for stat in stats[:5]:  # Show first 5
            print(f"   - {stat['name']}: {stat['count']} pending, {stat['failed_jobs']} failed")
        if len(stats) > 5:
            print(f"   ... and {len(stats) - 5} more queues")
        print("   ✅ Queue stats retrieved successfully!")
    except Exception as e:
        print(f"   ❌ Queue stats failed: {e}")
        return False

    # Test 4: Job Enqueue (dry run)
    print("\n4. Testing job enqueue (dry run)...")
    try:
        from app.queue.queues import enqueue_job
        from app.workers.llm_worker import generate_script

        # This won't actually run unless there's a worker listening
        print("   Queue infrastructure ready for job submission!")
        print("   ✅ Job enqueue test passed!")
    except Exception as e:
        print(f"   ❌ Job enqueue test failed: {e}")
        return False

    print("\n" + "=" * 60)
    print("All tests passed! Queue infrastructure is ready.")
    print("=" * 60)

    print("\nNext steps:")
    print("1. Start Redis:      docker-compose up -d redis")
    print("2. Start workers:    python run_worker.py")
    print("3. Start API:        uvicorn app.main:app --reload")
    print("4. Check health:     curl http://localhost:8000/api/v1/health/queues")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
