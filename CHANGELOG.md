# Changelog

## 1.3.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.2.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.1.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

## 1.0.0 — work-in-progress checkpoint

Partial code published for continued development. Known issues: STATUS.md.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project structure and configuration
- FastAPI backend skeleton with health endpoints
- React + TypeScript + Vite frontend skeleton
- OIDC Keycloak authentication flow (login, callback, logout)
- Docker Compose with backend, frontend, Keycloak, PostgreSQL
- GitHub Actions CI workflow
### Fixed
- User model: removed duplicate explicit Index definitions in __table_args__ (unique=True on columns already creates unique indexes)
- SessionMiddleware: use request.state.session instead of request.session (Starlette Request.session is read-only)
- Auth login endpoint: store OAuth state in request.state.session
- Auth callback endpoint: read OAuth state from request.state.session
- Backend config: secret_key default value now meets min_length=32 validation (was 31 chars)

## [1.0.0] - 2026-10-14

### Added
- Initial release: core skeleton with authentication and infrastructure