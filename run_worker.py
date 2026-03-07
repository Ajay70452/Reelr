#!/usr/bin/env python
"""
ClipKing Worker Runner
Starts RQ workers for the video generation pipeline

Usage:
    # Run all workers (default)
    python run_worker.py

    # Run specific worker types
    python run_worker.py --queues llm scene

    # Run GPU workers only
    python run_worker.py --gpu

    # Run with high priority
    python run_worker.py --priority

    # Run with custom worker name
    python run_worker.py --name worker-1
"""

import argparse
import sys
import os
from typing import List

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rq import Worker, Queue
from redis import Redis

from app.queue.connection import get_redis_connection, test_redis_connection
from app.queue.queues import QueueNames


# Queue groups for different worker types
QUEUE_GROUPS = {
    "cpu": [
        QueueNames.LLM,
        QueueNames.SCENE,
        QueueNames.AUDIO,
        QueueNames.CAPTION,
        QueueNames.FINALIZE,
        QueueNames.CLEANUP,
        QueueNames.WEBHOOK,
    ],
    "cpu_heavy": [
        QueueNames.RENDER,
        QueueNames.VISUAL_STOCK,
    ],
    "gpu": [
        QueueNames.VISUAL,
        QueueNames.VISUAL_KLING,
        QueueNames.VISUAL_MOTION,
    ],
    "priority": [
        QueueNames.HIGH_PRIORITY,
    ],
    "all": list(QueueNames),
}


def get_queues_by_names(queue_names: List[str]) -> List[Queue]:
    """Get Queue objects from queue name strings"""
    conn = get_redis_connection()
    queues = []

    for name in queue_names:
        # Check if it's a group name
        if name.lower() in QUEUE_GROUPS:
            for qn in QUEUE_GROUPS[name.lower()]:
                queues.append(Queue(qn.value, connection=conn))
        else:
            # Try to find matching queue
            for qn in QueueNames:
                if qn.value == name or qn.name.lower() == name.lower():
                    queues.append(Queue(qn.value, connection=conn))
                    break

    return queues


def start_worker(
    queue_names: List[str],
    worker_name: str = None,
    burst: bool = False,
    with_scheduler: bool = False,
):
    """Start an RQ worker"""

    # Test Redis connection first
    if not test_redis_connection():
        print("ERROR: Cannot connect to Redis. Make sure Redis is running.")
        print("  Local: docker run -d -p 6379:6379 redis")
        sys.exit(1)

    conn = get_redis_connection()
    queues = get_queues_by_names(queue_names)

    if not queues:
        print(f"ERROR: No valid queues found for: {queue_names}")
        sys.exit(1)

    queue_names_str = ", ".join(q.name for q in queues)
    print(f"Starting worker for queues: {queue_names_str}")

    worker = Worker(
        queues,
        connection=conn,
        name=worker_name,
    )

    print(f"Worker '{worker.name}' started. Listening on {len(queues)} queues...")
    print("Press Ctrl+C to exit.\n")

    try:
        worker.work(
            burst=burst,
            with_scheduler=with_scheduler,
        )
    except KeyboardInterrupt:
        print("\nWorker stopped.")


def main():
    parser = argparse.ArgumentParser(
        description="ClipKing Worker Runner",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Queue Groups:
  cpu       - LLM, Scene, Audio, Caption, Finalize workers
  cpu_heavy - Render, Stock fallback workers
  gpu       - Visual, Kling, Motion workers
  priority  - High priority queue
  all       - All queues

Examples:
  python run_worker.py                    # Run CPU workers
  python run_worker.py --gpu              # Run GPU workers
  python run_worker.py --queues llm scene # Run specific queues
  python run_worker.py --all              # Run all workers
        """
    )

    parser.add_argument(
        "--queues", "-q",
        nargs="+",
        default=["cpu"],
        help="Queue names or groups to listen on (default: cpu)"
    )
    parser.add_argument(
        "--gpu",
        action="store_true",
        help="Run GPU workers (visual generation)"
    )
    parser.add_argument(
        "--priority",
        action="store_true",
        help="Include high priority queue"
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Run workers for all queues"
    )
    parser.add_argument(
        "--name", "-n",
        type=str,
        default=None,
        help="Custom worker name"
    )
    parser.add_argument(
        "--burst", "-b",
        action="store_true",
        help="Run in burst mode (exit when queue is empty)"
    )
    parser.add_argument(
        "--with-scheduler",
        action="store_true",
        help="Run with RQ scheduler"
    )

    args = parser.parse_args()

    # Determine queues to run
    queues = []

    if args.all:
        queues = ["all"]
    elif args.gpu:
        queues = ["gpu"]
        if args.priority:
            queues.append("priority")
    else:
        queues = args.queues
        if args.priority:
            queues.append("priority")

    start_worker(
        queue_names=queues,
        worker_name=args.name,
        burst=args.burst,
        with_scheduler=args.with_scheduler,
    )


if __name__ == "__main__":
    main()
