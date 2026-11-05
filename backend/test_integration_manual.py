import asyncio
from httpx import AsyncClient, ASGITransport
from app.main import create_app
from app.core.database import get_db
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from app.models.base import Base

async def test():
    # Create test engine
    engine = create_async_engine('sqlite+aiosqlite:///:memory:', connect_args={'check_same_thread': False}, poolclass=StaticPool)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async def override_get_db():
        async with async_session() as session:
            yield session
    
    app = create_app()
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url='http://test') as client:
        # Test health endpoint
        resp = await client.get('/health')
        print(f'Health: {resp.status_code} - {resp.json()}')
        
        # Test ready endpoint
        resp = await client.get('/ready')
        print(f'Ready: {resp.status_code} - {resp.json()}')
        
        # Test auth/me (demo mode)
        resp = await client.get('/auth/me')
        print(f'Auth/me: {resp.status_code} - {resp.json()}')
        
        # Test login redirect
        resp = await client.get('/auth/login', follow_redirects=False)
        print(f'Login: {resp.status_code} - Location: {resp.headers.get("location")}')
        
        # Test logout
        resp = await client.post('/auth/logout')
        print(f'Logout: {resp.status_code} - {resp.json()}')
        
        # Test CORS OPTIONS on health
        resp = await client.options('/health', headers={'Origin': 'http://localhost:5173'})
        print(f'CORS OPTIONS: {resp.status_code} - ACAO: {resp.headers.get("access-control-allow-origin")}')
    
    await engine.dispose()

asyncio.run(test())
