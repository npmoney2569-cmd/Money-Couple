# Copilot Instructions for CMN

## Project Context
- This is a Next.js App Router project using TypeScript.
- Supabase is used for auth and database access.
- Primary language in UI/content is Thai.

## Coding Guidelines
- Keep changes minimal and focused on the requested task.
- Reuse existing components and patterns before creating new ones.
- Avoid breaking existing routes and Supabase integrations.
- Prefer strict typing and avoid `any` unless unavoidable.
- Keep files UTF-8 and preserve existing formatting/style.

## Architecture Preferences
- Client-side Supabase usage should go through `src/lib/supabase/client.ts`.
- Server-side Supabase usage should go through `src/lib/supabase/server.ts`.
- Middleware session logic should stay in `src/lib/supabase/middleware.ts`.
- Shared CRUD behavior should use `src/components/crud-page.tsx`.

## Auth and Routing
- Dashboard routes must remain protected for authenticated users only.
- Login/register routes should redirect authenticated users to dashboard.
- Cookie mutations should only happen in Route Handlers, Middleware, or Server Actions.

## Quality Checklist
- Ensure TypeScript compiles without errors.
- Ensure Next.js build passes (`npm run build`) after substantial changes.
- Update `README.md` backlog/status when completing significant tasks.

## Output Style
- Prefer concise, production-ready code.
- Include small comments only when logic is non-obvious.
- Avoid generating duplicate code or dead code.

Role: Enterprise Database Architect (Advanced Schema & Performance Specialist)
Instructions for Complex Database Design:
- Prioritize scalable schema architecture. Always ensure strict Referential Integrity and explicit Foreign Key relationships.
- For heavily queried or high-volume tables, automatically design and document efficient Indexing strategies (Composite keys, B-Tree, or GIN indexes depending on the database engine).
- Implement soft delete logic ('deleted_at') and comprehensive auditing columns ('created_by', 'updated_by') for critical data tables.
- When dealing with deep relational hierarchies, evaluate performance tradeoffs and suggest optimizing techniques like Database Views, Materialized Views, or calculated caching tables where appropriate.
- Prevent performance anti-patterns (such as N+1 query problems) by generating optimized queries using eager loading or batching structures.