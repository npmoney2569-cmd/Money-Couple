# CMN - ระบบบัญชีรายรับ-รายจ่าย

ระบบบัญชีรายรับ-รายจ่ายสำหรับบุคคลและคู่รัก (v2) พัฒนาด้วย Next.js และ Supabase

## สถานะโปรเจกต์

**In Development / MVP Core** - โปรเจกต์มีแกนระบบหลักแล้ว ได้แก่ Auth, Dashboard, CRUD รายรับ-รายจ่าย, บัญชี, หมวดหมู่, งบประมาณ, รายงานพื้นฐาน และ Supabase schema หลัก

สถานะโดยประมาณ:

- MVP พื้นฐาน: ประมาณ 50-60%
- สเปกเต็มจากเอกสารต้นฉบับ: ประมาณ 30-40%
- ยังไม่พร้อม production จนกว่าจะตรวจ build/lint, แก้ encoding ภาษาไทย และทดสอบ flow จริงกับ Supabase

อ่านรายละเอียดสถานะล่าสุดได้ที่ [docs/11-current-status.md](./docs/11-current-status.md)

## ทำไปแล้ว

- ตั้งโครง Next.js 15 + TypeScript + Supabase
- Auth: login, register, forgot password, reset password และ protected dashboard route
- Dashboard ดึงข้อมูลจริงจาก Supabase
- CRUD หลัก: รายรับ, รายจ่าย, โอนเงิน, บัญชี, หมวดหมู่, งบประมาณ
- รองรับแท็กในฟอร์มรายรับ/รายจ่าย พร้อม sync ตาราง `transaction_tags`
- CRUD แท็กผ่านหน้า `/dashboard/tags`
- CRUD/หน้าใช้งานบางส่วน: เป้าหมาย, หนี้, สินทรัพย์, Subscription
- ค้นหา/กรองรายการจาก `transactions` (keyword, type, date, category, account, amount, tag)
- ค้นหา/กรองรายการ export CSV ได้จากหน้า Search โดยตรง
- Split Transaction UI ที่ `/dashboard/splits`
- Split Transaction คำนวณยอดคงเหลือแบบ real-time ก่อนบันทึก
- แสดงแท็กแบบ badge ในตารางรายรับ/รายจ่าย
- รายงานพื้นฐาน พร้อม export CSV รายเดือน/ช่วงเวลา
- SQL schema หลักพร้อม RLS, FK, index ที่ `scripts/schema.sql`
- Trigger อัปเดตยอดบัญชีจากรายการธุรกรรมที่ `scripts/triggers.sql`
- Trigger ตรวจ Split Transaction ไม่ให้ยอดรวมเกินธุรกรรมหลัก และไม่อนุญาต split สำหรับ `transfer`
- Seed หมวดหมู่ preset ผ่าน `npm run seed:categories`

## ยังต้องทำต่อ

งานสำคัญก่อนส่งใช้งานจริง:

1. ตรวจและแก้ build/lint ให้ผ่าน
2. ตรวจ encoding ภาษาไทยในไฟล์ source, README, schema seed และเมนู dashboard
3. ทดสอบ Supabase flow จริง: สมัคร, login, สร้างบัญชี, เพิ่มรายรับ/รายจ่าย, โอนเงิน, export
4. ปรับ UI/branding ให้เป็น Money Couple อย่างสม่ำเสมอ
5. เตรียม production environment และ deploy

งานหลัง MVP:

- ไฟล์แนบใบเสร็จ
- Recurring transactions UI
- แจ้งเตือนอัตโนมัติ
- PWA / Offline / Push notification
- Couple Mode
- LINE Bot webhook และ parser จริง
- OCR/AI และฟีเจอร์ขั้นสูง

## เอกสาร

| ไฟล์ | เนื้อหา |
|------|---------|
| [01-overview](./docs/01-overview.md) | ภาพรวมระบบ + โครงสร้างเมนู |
| [02-core-modules](./docs/02-core-modules.md) | โมดูลหลัก |
| [03-extended-modules](./docs/03-extended-modules.md) | โมดูลเสริม |
| [04-couple-mode](./docs/04-couple-mode.md) | โหมดคู่รัก |
| [05-line-bot](./docs/05-line-bot.md) | LINE Bot Integration |
| [06-platform-pwa](./docs/06-platform-pwa.md) | Platform & PWA |
| [07-auth-security](./docs/07-auth-security.md) | Auth & Security |
| [08-database-schema](./docs/08-database-schema.md) | Database Schema |
| [09-mvp-roadmap](./docs/09-mvp-roadmap.md) | MVP Roadmap |
| [10-tech-stack](./docs/10-tech-stack.md) | Tech Stack + โครงสร้างโปรเจกต์ |
| [11-current-status](./docs/11-current-status.md) | สถานะล่าสุดและงานถัดไป |
| [12-deploy-production](./docs/12-deploy-production.md) | คู่มือ Deploy Production |

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, CSS Modules
- **Backend:** Next.js App Router / API Routes
- **Database/Auth:** Supabase PostgreSQL + Supabase Auth
- **Package Manager:** npm
- **Port:** `3008`

> หมายเหตุ: เอกสารเดิมเคยระบุ Tailwind/shadcn แต่ dependency ปัจจุบันยังไม่พบ Tailwind/shadcn ใน `package.json`

## Quick Setup

1. สร้างไฟล์ `.env.local` จาก `.env.example` หรือค่าจาก `supabase.txt`
2. ตั้งค่า `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL`
3. ตั้งค่า `NEXT_PUBLIC_APP_URL=http://localhost:3008` และ `PORT=3008`
4. รัน SQL จาก `scripts/schema.sql` ใน Supabase SQL Editor
5. รัน trigger จาก `scripts/triggers.sql`
6. Seed หมวดหมู่ preset ด้วย `npm run seed:categories`
7. เปิด dev server ด้วย `npm run dev`

## Run Commands

- `npm run dev` เปิดระบบที่ `http://localhost:3008`
- `npm run build` ตรวจ production build
- `npm run lint` ตรวจ ESLint
- `npm run admin:create` สร้าง/อัปเดตผู้ใช้แอดมิน
- `npm run seed:categories` seed หมวดหมู่ preset
- `npm run db:apply` รัน schema + triggers
- `npm run db:grants` แก้สิทธิ์ตารางสำหรับ role `authenticated`
- `npm run db:rls-fix` แก้ default `user_id` + RLS policy ให้รองรับ CRUD
- `npm run db:backfill-users` sync ผู้ใช้จาก `auth.users` เข้า `public.users`

## Default Admin

- username: `admin`
- password: `admin99`
- login ได้ทั้ง `admin` หรือ `admin@cmn.local`

## Auth Routes

- `/login`
- `/register`
- `/forgot-password`
- `/auth/reset-password`
- `/dashboard` protected route

## OAuth Callback & Redirect URLs

ตั้งค่าที่ Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `http://localhost:3008`
- Redirect URL: `http://localhost:3008/auth/callback`
- Redirect URL: `http://localhost:3008/auth/reset-password`

สำหรับ OAuth Provider ให้เปิดใช้งานใน Supabase Authentication > Providers

### Google OAuth Quick Setup (ทำครั้งเดียว)

1. ไปที่ Google Cloud Console > APIs & Services > Credentials
2. สร้าง OAuth Client ID (Application type: Web application)
3. ใส่ Authorized redirect URIs:
	- `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
4. คัดลอก Client ID และ Client Secret
5. ไปที่ Supabase Dashboard > Authentication > Providers > Google แล้วเปิดใช้งาน
6. วาง Client ID / Client Secret แล้ว Save
7. ไปที่ Supabase Dashboard > Authentication > URL Configuration แล้วเพิ่ม Redirect URLs:
	- `http://localhost:3008/auth/callback`
	- `https://cmn-money-couple.vercel.app/auth/callback`

หลังตั้งค่าเสร็จ ปุ่ม `เข้าสู่ระบบด้วย Google` ในหน้า login จะทำงานได้ทันที

## หมายเหตุ

- เอกสารต้นฉบับอยู่ที่ `ระบบบัญชีรายรับรายจ่าย_บุคคล_v2(1).md`
- โปรเจกต์ปัจจุบันยังมีไฟล์ที่แก้ไข/เพิ่มใหม่แต่ยังไม่ commit หลายรายการ
