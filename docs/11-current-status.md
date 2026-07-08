# สถานะล่าสุดของโปรเจกต์

อัปเดต: 2026-07-07

โปรเจกต์อยู่ในช่วง **MVP Core / In Development** มีโครงระบบหลักและหลายหน้าที่เชื่อม Supabase แล้ว แต่ยังต้องทดสอบจริงและเก็บงานสำคัญก่อนพร้อมใช้งาน production

## ภาพรวมความคืบหน้า

| ส่วนงาน | สถานะ | หมายเหตุ |
|---|---|---|
| โครงโปรเจกต์ Next.js | เสร็จบางส่วน | ใช้ Next.js 15, React 19, TypeScript |
| Auth | เสร็จบางส่วน | มี login/register/reset password และ protected dashboard |
| Dashboard | เสร็จบางส่วน | ดึงข้อมูลจาก Supabase และมี KPI หลัก |
| รายรับ/รายจ่าย | เสร็จบางส่วน | CRUD ได้ แต่ยังไม่มี split/tags/receipt upload |
| โอนเงิน | เสร็จบางส่วน | มี UI และ trigger สำหรับ balance ต้องทดสอบข้อมูลจริง |
| บัญชี | เสร็จบางส่วน | CRUD พื้นฐานพร้อม |
| หมวดหมู่ | เสร็จบางส่วน | มี preset/custom พื้นฐาน แต่ seed ภาษาไทยบางส่วนอาจเพี้ยน encoding |
| งบประมาณ | เสร็จบางส่วน | CRUD และ progress พื้นฐาน |
| เป้าหมาย/หนี้/สินทรัพย์ | เสร็จบางส่วน | มี CRUD พื้นฐาน ยังไม่ครบ logic เฉพาะทาง |
| Subscription/Bills | เสร็จบางส่วน | มี CRUD พื้นฐาน ยังไม่มีแจ้งเตือนอัตโนมัติ |
| ค้นหา/กรอง | เสร็จบางส่วน | ค้นจาก transactions ได้ ยังไม่ครบทุก filter ตามสเปก |
| รายงาน | เสร็จบางส่วน | มีสรุปรายเดือนและ export CSV |
| ปฏิทิน | โครงหน้า | แสดงรายการเรียงวันที่ ยังไม่ใช่ calendar view เต็ม |
| แจ้งเตือน | โครงหน้า | มีตาราง/หน้าแสดง ยังไม่มี automation |
| LINE Bot | โครงหน้า | ยังไม่มี webhook/parser/account linking จริง |
| Couple Mode | โครงฐานข้อมูลบางส่วน | ยังไม่มี UI/flow ใช้งานจริง |
| PWA | ยังไม่ทำ | ยังไม่พบ manifest/service worker/offline sync |
| OCR/AI/Import | ยังไม่ทำ | อยู่ Phase 4 |

## งานที่เสร็จแล้ว

- Scaffold โปรเจกต์และ dependency หลัก
- Supabase client/server/middleware
- Auth pages และ callback route
- Protected dashboard layout
- Dashboard shell พร้อม sidebar และ mobile nav
- CRUD component กลางสำหรับหลายโมดูล
- หน้า CRUD: income, expense, transfer, accounts, categories, budgets, goals, debts, assets, subscriptions
- หน้า report พร้อม export CSV รายเดือน/ช่วงวันที่
- หน้า search/filter รายการธุรกรรม
- SQL schema หลักที่ `scripts/schema.sql`
- Trigger สำหรับอัปเดต balance ที่ `scripts/triggers.sql`
- Script seed หมวดหมู่ preset

## จุดที่ต้องแก้ก่อนถือว่า MVP พร้อม

1. **ตรวจ build/lint**
   - ล่าสุด `npm run build` ผ่านแล้ว
   - ล่าสุด `npm run lint` ผ่านแล้ว
   - ให้คงการตรวจทุกครั้งก่อน deploy

2. **แก้ schema mismatch**
   - แก้แล้ว: เพิ่มตาราง `auth_providers` และ RLS ใน `scripts/schema.sql`
   - ที่ยังต้องทำคือรัน schema ชุดล่าสุดให้ครบใน Supabase environment ที่ใช้งานจริง

3. **แก้ encoding ภาษาไทย**
   - บางไฟล์ใน source แสดงภาษาไทยเพี้ยน เช่นเมนู dashboard, dashboard labels และ seed categories
   - ควรบันทึกทุกไฟล์เป็น UTF-8 และตรวจหน้าเว็บจริง

4. **ทดสอบ flow หลัก**
   - สมัครสมาชิก
   - login/logout
   - สร้างบัญชี
   - เพิ่มรายรับ/รายจ่าย
   - โอนเงินและตรวจ balance
   - ตั้งงบประมาณ
   - ดู dashboard/report/export
   - Mobile smoke test ล่าสุด (390x844): login/register/dashboard/search/reports/splits เปิดหน้าได้ปกติ
   - ยืนยัน flow CRUD จริงแล้ว: สร้างบัญชี, บันทึกรายรับ, บันทึกรายจ่าย, โอนเงิน, split transaction และ Dashboard คำนวณยอดรวมอัปเดตถูกต้อง

5. **ตรวจ RLS และ user ownership**
   - ทุกตารางที่มี `user_id` ต้อง insert/select/update/delete ได้เฉพาะข้อมูลของผู้ใช้เอง
   - CRUD component ต้องส่ง `user_id` หรือมี trigger/default ที่รองรับอย่างถูกต้อง

6. **Stability scripts ที่เพิ่มเพื่อแก้ฐานข้อมูลหน้างาน**
   - `npm run db:apply` รัน `schema.sql` และ `triggers.sql`
   - `npm run db:grants` แก้ privilege สำหรับ role `authenticated`
   - `npm run db:rls-fix` ตั้ง default `user_id = auth.uid()` และปรับ RLS policy ให้รองรับ insert/update
   - `npm run db:backfill-users` เติมข้อมูล `public.users` จาก `auth.users` สำหรับผู้ใช้เก่า

## งานถัดไปที่แนะนำ

### ลำดับ 1: Stabilize MVP

- แก้ build/lint
- แก้ `auth_providers` mismatch
- แก้ encoding ไทย
- ทดสอบ Supabase schema + RLS
- เพิ่ม error/loading state จุดที่ยังขาด

### ลำดับ 2: ปิดช่องว่าง Core Finance

- Split Transaction UI
- Tags UI
- Receipt attachment/upload
- แสดงชื่อ account/category ในทุกหน้าที่เป็น UUID
- ตรวจ transfer trigger ให้รองรับ create/update/delete

### ลำดับ 3: Polish

- ปรับ UI/branding เป็น Money Couple
- ปรับ responsive mobile/tablet/desktop
- ปรับ README deploy/env production
- เตรียม Vercel deployment

### ลำดับ 4: Extended Features

- Recurring transactions page
- Notifications automation
- PWA manifest/service worker
- Couple Mode flow
- LINE Bot webhook/parser
- OCR/AI/Import statement

## Definition of Done สำหรับ MVP ปัจจุบัน

- `npm run build` ผ่าน
- `npm run lint` ผ่าน หรือมีรายการ warning ที่ยอมรับได้ชัดเจน
- Auth ใช้งานจริงกับ Supabase ได้
- ผู้ใช้สร้างบัญชีและรายการรับ/จ่ายได้
- Dashboard คำนวณยอดหลักถูกต้อง
- Transfer อัปเดต balance ถูกต้อง
- Export CSV ได้
- ใช้งานบนมือถือและ PC ได้
- Deploy production ได้พร้อม environment จริง

## ปัญหาที่พบเพิ่มเติมและต้องแก้ไขในการพัฒนาครั้งต่อไป (User Feedback)

| รายการ | ปัญหาที่พบ | แนวทางแก้ไข / ตั้งค่า |
|---|---|---|
| **เป้าหมายการออม (Goals)** | ไม่สามารถสร้างข้อมูลได้: `null value in column "current_amount" of relation "goals" violates not-null constraint` | ให้ปรับเปลี่ยนระบบเป็นการโอนเงินเข้าไปออม (และปรับฐานข้อมูลให้รองรับ) |
| **แดชบอร์ด (Dashboard)** | แนวโน้มรายรับ - รายจ่าย ยังใช้งานไม่ได้ | พัฒนาหน้าแสดงกราฟหรือข้อมูลแนวโน้มรายรับ-รายจ่ายเพิ่มเติม |
| **การแสดงผลมือถือ (Mobile UI)** | แถบด้านล่าง (Bottom Navigation) ปุ่มรายรับ รายจ่าย บัญชี ข้อความใหญ่เกินไป | ปรับขนาดฟอนต์/ระยะห่างของข้อความแถบด้านล่างบนมือถือให้เล็กลงและพอดีหน้าจอ |

