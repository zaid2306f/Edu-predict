import time
from collections import defaultdict, deque
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 120):
        super().__init__(app); self.requests_per_minute=requests_per_minute; self.requests=defaultdict(deque)
    async def dispatch(self, request: Request, call_next):
        ip=request.client.host if request.client else 'unknown'; now=time.time(); q=self.requests[ip]
        while q and now-q[0]>60: q.popleft()
        if len(q)>=self.requests_per_minute: return JSONResponse({'detail':'Rate limit exceeded'},status_code=429)
        q.append(now); return await call_next(request)
