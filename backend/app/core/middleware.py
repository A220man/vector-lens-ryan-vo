from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import json
from app.core.config import get_settings

settings = get_settings()


class SessionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, secret_key: str):
        super().__init__(app)
        self.secret_key = secret_key.encode()

    async def dispatch(self, request: Request, call_next):
        session_data = {}
        session_cookie = request.cookies.get("vl_session")

        if session_cookie:
            try:
                session_data = json.loads(session_cookie)
            except Exception:
                session_data = {}

        request.state.session = session_data
        request.session = session_data

        response = await call_next(request)
        return response