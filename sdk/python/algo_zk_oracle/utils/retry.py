"""
Retry utilities for Apollon - ZK Oracle Oracle SDK
"""

import asyncio
import time
from typing import Callable, TypeVar, Optional, Any
from functools import wraps

from ..exceptions.errors import is_retryable_error

T = TypeVar('T')


class RetryConfig:
    """Configuration for retry behavior"""
    
    def __init__(
        self,
        max_attempts: int = 3,
        delay: float = 1.0,
        backoff_factor: float = 2.0,
        max_delay: float = 10.0,
        jitter: bool = True,
    ):
        self.max_attempts = max_attempts
        self.delay = delay
        self.backoff_factor = backoff_factor
        self.max_delay = max_delay
        self.jitter = jitter


def retry_sync(config: Optional[RetryConfig] = None):
    """Decorator for synchronous retry logic"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            last_error = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return func(*args, **kwargs)
                except Exception as error:
                    last_error = error
                    
                    if attempt == config.max_attempts or not is_retryable_error(error):
                        raise error
                    
                    delay = calculate_delay(attempt, config)
                    time.sleep(delay)
            
            raise last_error
        
        return wrapper
    return decorator


def retry_async(config: Optional[RetryConfig] = None):
    """Decorator for asynchronous retry logic"""
    if config is None:
        config = RetryConfig()
    
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            
            for attempt in range(1, config.max_attempts + 1):
                try:
                    return await func(*args, **kwargs)
                except Exception as error:
                    last_error = error
                    
                    if attempt == config.max_attempts or not is_retryable_error(error):
                        raise error
                    
                    delay = calculate_delay(attempt, config)
                    await asyncio.sleep(delay)
            
            raise last_error
        
        return wrapper
    return decorator


async def retry_async_func(
    func: Callable[..., Any],
    config: Optional[RetryConfig] = None,
    *args,
    **kwargs
):
    """Async function retry utility"""
    if config is None:
        config = RetryConfig()
    
    last_error = None
    
    for attempt in range(1, config.max_attempts + 1):
        try:
            return await func(*args, **kwargs)
        except Exception as error:
            last_error = error
            
            if attempt == config.max_attempts or not is_retryable_error(error):
                raise error
            
            delay = calculate_delay(attempt, config)
            await asyncio.sleep(delay)
    
    raise last_error


def retry_sync_func(
    func: Callable[..., T],
    config: Optional[RetryConfig] = None,
    *args,
    **kwargs
) -> T:
    """Sync function retry utility"""
    if config is None:
        config = RetryConfig()
    
    last_error = None
    
    for attempt in range(1, config.max_attempts + 1):
        try:
            return func(*args, **kwargs)
        except Exception as error:
            last_error = error
            
            if attempt == config.max_attempts or not is_retryable_error(error):
                raise error
            
            delay = calculate_delay(attempt, config)
            time.sleep(delay)
    
    raise last_error


def calculate_delay(attempt: int, config: RetryConfig) -> float:
    """Calculate delay for retry attempt with exponential backoff"""
    import random
    
    delay = config.delay * (config.backoff_factor ** (attempt - 1))
    delay = min(delay, config.max_delay)
    
    if config.jitter:
        # Add random jitter to avoid thundering herd
        delay *= (0.5 + random.random() * 0.5)
    
    return delay


def exponential_backoff(attempt: int, base_delay: float = 1.0) -> float:
    """Simple exponential backoff calculation"""
    return min(base_delay * (2 ** attempt), 30.0)