import sys
import asyncio
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("runner")

if sys.platform == 'win32':
    # This must be done before any asyncio loop is created
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        logger.info("Set WindowsProactorEventLoopPolicy for Playwright compatibility")
    except Exception as e:
        logger.error(f"Failed to set event loop policy: {e}")

import uvicorn

if __name__ == "__main__":
    logger.info("Starting uvicorn server (reload disabled, loop='asyncio')...")
    # Playwright requires the Proactor loop on Windows.
    # We disable reload to keep single process.
    # We force loop='asyncio' to ensure it uses the policy we set above.
    uvicorn.run("server:app", host="127.0.0.1", port=8002, reload=False, loop="asyncio")
