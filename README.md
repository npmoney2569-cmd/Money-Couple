# CMN — ระบบบัญชีรายรับ-รายจ่าย

ระบบบัญชีรายรับ-รายจ่าย สำหรับบุคคลและคู่รัก (v2)

## สถานะโปรเจกต์

� **In Development** — ระบบพื้นฐานพร้อมแล้ว มี auth และ dashboard เชื่อมข้อมูลจริงจาก Supabase

## เอกสาร

| ไฟล์ | เนื้อหา |
|------|---------|
| [01-overview](./docs/01-overview.md) | ภาพรวมระบบ + โครงสร้างเมนู |
| [02-core-modules](./docs/02-core-modules.md) | โมดูลหลัก (Dashboard, รายรับ/จ่าย, บัญชี, โอนเงิน, ปฏิทิน) |
| [03-extended-modules](./docs/03-extended-modules.md) | โมดูลเสริม (หนี้, สินทรัพย์, บิล, รายงาน) |
| [04-couple-mode](./docs/04-couple-mode.md) | โหมดคู่รัก |
| [05-line-bot](./docs/05-line-bot.md) | LINE Bot Integration |
| [06-platform-pwa](./docs/06-platform-pwa.md) | Platform & PWA |
| [07-auth-security](./docs/07-auth-security.md) | Auth & Security |
| [08-database-schema](./docs/08-database-schema.md) | Database Schema (field + type) |
| [09-mvp-roadmap](./docs/09-mvp-roadmap.md) | MVP Roadmap + Sprint plan |
| [10-tech-stack](./docs/10-tech-stack.md) | Tech Stack + โครงสร้างโปรเจกต์ |

## Tech Stack (สรุป)

- **Frontend:** Next.js 15 + TypeScript + Tailwind + shadcn/ui
- **Backend:** Next.js API Routes + Supabase
- **Database:** PostgreSQL (Supabase)
- **Auth:** Supabase Auth (Email, Google)
- **Hosting:** Vercel

## ขั้นตอนถัดไป

1. ทดสอบระบบ auth และ dashboard บน `http://localhost:3008`
2. เชื่อมโมดูล dashboard ให้ใช้ table Supabase จริงทั้งหมด
3. ปรับ UI / branding ให้เป็น Money Couple
4. ตั้ง remote GitHub แล้ว push โค้ด
5. เตรียม deploy และ environment production

## Quick Setup (Supabase + Port 3008)

1. สร้างไฟล์ `.env.local` จากค่าใน `supabase.txt`
2. ตั้งค่าตัวแปร `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`
3. ตั้งค่า `NEXT_PUBLIC_APP_URL=http://localhost:3008` และ `PORT=3008`
4. รัน dev server ด้วยคำสั่ง `npm run dev -- -p 3008`

## Run Commands

- `npm run dev` เปิดระบบที่ `http://localhost:3008`
- `npm run build` ตรวจสอบ production build
- `npm run lint` ตรวจสอบโค้ดตามกฎ ESLint
- `npm run admin:create` สร้าง/อัปเดตผู้ใช้แอดมินใน Supabase

## Default Admin

- username: `admin`
- password: `admin99`
- login ได้ทั้ง `admin` หรือ `admin@cmn.local`

## Auth Routes (พร้อมใช้งาน)

- `/login` เข้าสู่ระบบด้วย Supabase Auth
- `/register` สมัครสมาชิกด้วย Supabase Auth
- `/forgot-password` ขอรีเซ็ตรหัสผ่าน
- `/auth/reset-password` หน้าตั้งรหัสผ่านใหม่หลังคลิกลิงก์จากอีเมล
- `/dashboard` หน้า protected route (ต้องล็อกอิน)

## OAuth Callback & Redirect URLs

ตั้งค่าที่ Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `http://localhost:3008`
- Redirect URL: `http://localhost:3008/auth/callback`
- Redirect URL: `http://localhost:3008/auth/reset-password`

สำหรับ OAuth Provider (Google/LINE) ให้เปิดใช้งานใน Supabase Authentication > Providers

> เอกสารต้นฉบับ: `ระบบบัญชีรายรับรายจ่าย_บุคคล_v2(1).md` (ย้ายมาจัดระเบียบใน `docs/` แล้ว)
