# Tech Stack

## สรุป

| Layer | เทคโนโลยี | เหตุผล |
|-------|-----------|--------|
| Frontend | **Next.js 15** (App Router) + **TypeScript** | SSR/SSG, API routes, ecosystem ใหญ่ |
| UI | **Tailwind CSS** + **shadcn/ui** | Responsive เร็ว, component สวย, customize ง่าย |
| State | **TanStack Query** + **Zustand** | Server state + client state แยกชัด |
| Forms | **React Hook Form** + **Zod** | Validation type-safe |
| Charts | **Recharts** | กราฟ Dashboard / รายงาน |
| Backend | **Next.js API Routes** + **Supabase** | ลด infra ซ้ำซ้อน |
| Database | **PostgreSQL** (Supabase) | Relational, RLS, realtime |
| Auth | **Supabase Auth** | Email, Google, Apple, LINE OAuth |
| Storage | **Supabase Storage** | ใบเสร็จ, ไฟล์แนบ |
| Hosting | **Vercel** | Deploy Next.js อัตโนมัติ |
| LINE Bot | **Next.js API Route** (Webhook) | รับ event จาก LINE Messaging API |

## โครงสร้างโปรเจกต์ (แนะนำ)

```
CMN/
├── docs/                    # เอกสาร spec (ไฟล์นี้)
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # login, register
│   │   ├── (dashboard)/     # หน้าหลักหลัง login
│   │   │   ├── dashboard/
│   │   │   ├── transactions/
│   │   │   ├── accounts/
│   │   │   ├── categories/
│   │   │   ├── budgets/
│   │   │   ├── reports/
│   │   │   └── settings/
│   │   └── api/             # API routes + LINE webhook
│   ├── components/          # UI components
│   │   ├── ui/              # shadcn/ui
│   │   ├── layout/          # Sidebar, BottomNav
│   │   └── features/        # TransactionForm, DashboardCard
│   ├── lib/
│   │   ├── supabase/        # client, server, middleware
│   │   ├── validators/      # Zod schemas
│   │   └── utils/           # formatCurrency, formatDate
│   ├── hooks/               # useTransactions, useAccounts
│   └── types/               # TypeScript types
├── supabase/
│   ├── migrations/          # SQL migrations
│   └── seed.sql             # หมวดหมู่ preset
├── public/
│   ├── manifest.json        # PWA
│   └── icons/
├── package.json
└── README.md
```

## Dependencies หลัก (MVP)

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "@supabase/supabase-js": "latest",
    "@supabase/ssr": "latest",
    "@tanstack/react-query": "latest",
    "zustand": "latest",
    "react-hook-form": "latest",
    "zod": "latest",
    "@hookform/resolvers": "latest",
    "recharts": "latest",
    "date-fns": "latest",
    "lucide-react": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "tailwindcss": "latest",
    "@types/react": "latest"
  }
}
```

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3008
PORT=3008

# LINE (Phase 3)
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# AI (Phase 4)
OPENAI_API_KEY=
```

## Run On Port 3008

- Development: `npm run dev -- -p 3008`
- Production (self-host): ตั้งค่า env `PORT=3008` ก่อน `npm start`
- แนะนำให้ใช้ค่า `NEXT_PUBLIC_APP_URL=http://localhost:3008` ให้ตรงกับ runtime

## API Routes (MVP)

| Method | Endpoint | คำอธิบาย |
|--------|----------|----------|
| GET | `/api/transactions` | ดึงรายการ (filter, pagination) |
| POST | `/api/transactions` | สร้างรายการ |
| PUT | `/api/transactions/[id]` | แก้ไข |
| DELETE | `/api/transactions/[id]` | ลบ (soft delete) |
| GET | `/api/accounts` | ดึงบัญชีทั้งหมด |
| POST | `/api/accounts` | สร้างบัญชี |
| GET | `/api/categories` | ดึงหมวดหมู่ |
| GET | `/api/budgets` | ดึงงบประมาณ |
| GET | `/api/reports/summary` | สรุป Dashboard |
| GET | `/api/reports/export` | Export CSV |
| POST | `/api/webhooks/line` | LINE Bot webhook (Phase 3) |

## การเชื่อมต่อ Supabase

- **Client-side:** `@supabase/ssr` สำหรับ browser (auth session)
- **Server-side:** `createServerClient` ใน Server Components / API routes
- **Middleware:** refresh session ทุก request
- **RLS:** เปิดบนทุกตาราง ผู้ใช้เห็นเฉพาะข้อมูลตัวเอง

## มาตรฐานการพัฒนา

- **ภาษา UI:** ไทยเป็นหลัก รองรับอังกฤษ
- **สกุลเงิน:** THB เป็นค่าเริ่มต้น เก็บเป็น `DECIMAL(15,2)`
- **Timezone:** `Asia/Bangkok` (UTC+7)
- **Date format:** `DD/MM/YYYY` เป็นค่าเริ่มต้น
