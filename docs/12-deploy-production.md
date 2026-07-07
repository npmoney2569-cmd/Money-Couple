# Deploy Production (Vercel + Supabase)

อัปเดต: 2026-07-07

เอกสารนี้สรุปขั้นตอน deploy โปรเจกต์ CMN ขึ้น Vercel และผูกกับ Supabase production

## 1) เตรียม Supabase Production

1. สร้าง Supabase project ใหม่สำหรับ production
2. เปิด SQL Editor แล้วรันไฟล์ต่อไปนี้ตามลำดับ:
   - `scripts/schema.sql`
   - `scripts/triggers.sql`
3. Seed หมวดหมู่ preset ด้วยคำสั่ง:
   - `npm run seed:categories`
4. ตั้งค่า Authentication URL:
   - Site URL: URL จริงของระบบบน Vercel (เช่น `https://your-app.vercel.app`)
   - Redirect URL: `https://your-app.vercel.app/auth/callback`
   - Redirect URL: `https://your-app.vercel.app/auth/reset-password`

## 2) เตรียม Environment Variables บน Vercel

ไปที่ Vercel Project > Settings > Environment Variables แล้วเพิ่มค่า:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL` (ต้องเป็นโดเมน production)

หมายเหตุ:
- ห้ามใส่ค่า localhost ใน production
- `SUPABASE_SERVICE_ROLE_KEY` ใช้เฉพาะฝั่ง server เท่านั้น

## 3) Deploy บน Vercel

1. Push โค้ดขึ้น GitHub repository
2. Import โปรเจกต์ใน Vercel
3. Framework Preset: Next.js
4. Build Command: `npm run build`
5. Install Command: `npm install`
6. Output: ค่า default ของ Next.js
7. กด Deploy

## 4) Post-Deploy Checklist

1. เปิดหน้า `/login` และ `/register` ได้ปกติ
2. login แล้วเข้าหน้า `/dashboard` ได้
3. CRUD รายรับ/รายจ่ายทำงานได้
4. โอนเงินแล้ว balance เปลี่ยนถูกต้อง
5. Export CSV จากหน้า reports/search ใช้งานได้
6. ตรวจ OAuth callback ไม่เกิด redirect loop

## 5) Rollback Plan เบื้องต้น

1. ใช้ Vercel Previous Deployment แล้ว Promote ย้อนกลับ
2. ถ้า schema พัง ให้ restore จาก Supabase backup ก่อน deploy ซ้ำ
3. ปิด feature ที่มีผลกระทบผ่าน env flag (ถ้ามี)

## 6) สถานะการทดสอบล่าสุด

- Mobile smoke test (390px): หน้า login/register ผ่าน
- Build/Lint ล่าสุด: ผ่าน
- ยังต้องทดสอบ flow หลัง login บน mobile ด้วยบัญชีจริงใน production
