# MVP Roadmap

> สถานะล่าสุดของโค้ดจริงดูที่ [11-current-status](./11-current-status.md)

## สรุปสถานะปัจจุบัน

- โปรเจกต์อยู่ช่วง **MVP Core / In Development**
- Foundation และ Core Finance ทำไปแล้วบางส่วน
- Extended modules บางหน้าเริ่มทำเป็น CRUD พื้นฐานแล้ว เช่น goals, debts, assets, subscriptions
- ยังไม่พร้อม production เพราะต้องตรวจ build/lint, แก้ encoding ภาษาไทย และทดสอบ Supabase flow จริง

## หลักการแบ่ง Phase

- **MVP (Phase 1):** ใช้งานได้จริงสำหรับบุคคลเดี่ยว — บันทึกรายรับ-รายจ่าย ดู Dashboard ตั้งงบประมาณ
- **Phase 2:** ฟีเจอร์เสริม + PWA + แจ้งเตือน
- **Phase 3:** โหมดคู่รัก + LINE Bot
- **Phase 4:** AI, OCR, Offline Sync, ฟีเจอร์ขั้นสูง

---

## Phase 1 — MVP (เป้าหมาย: 4–6 สัปดาห์)

### Sprint 1: Foundation (สัปดาห์ 1–2)

- [x] Scaffold Next.js + TypeScript
- [x] ตั้งค่า Supabase client/server/middleware
- [x] Auth: Email + Password
- [~] Google/LINE OAuth button และ callback route ต้องทดสอบ provider จริง
- [x] Layout responsive เบื้องต้น (Sidebar PC / Bottom Nav mobile)
- [~] หน้า Settings พื้นฐาน (โปรไฟล์, ภาษา, สกุลเงิน, theme)

### Sprint 2: Core Finance (สัปดาห์ 2–3)

- [x] CRUD บัญชี (เงินสด, ธนาคาร, บัตรเครดิต, e-Wallet, investment)
- [~] CRUD หมวดหมู่ (preset + custom พื้นฐาน; subcategory ยังไม่ครบ UI)
- [~] CRUD รายรับ / รายจ่าย (จำนวนเงิน, วันที่, หมวดหมู่, บัญชี, โน้ต, แท็ก; ทดสอบ create จริงแล้ว, ยังไม่มีไฟล์แนบ)
- [x] CRUD แท็ก (ตาราง `tags` + ผูกกับ `transaction_tags`)
- [~] โอนเงินระหว่างบัญชี (มี UI และ trigger; ทดสอบ create จริงแล้ว, ควรทดสอบ update/delete เพิ่ม)
- [x] Split Transaction UI (หน้า `dashboard/splits` พร้อมคำนวณยอดคงเหลือแบบ real-time)
- [x] Split validation ที่ DB (trigger กัน split เกินจำนวนธุรกรรมและกัน transfer split)
- [x] ค้นหา/กรองรายการ (keyword/type/date/category/account/amount/tag)

### Sprint 3: Dashboard & Budget (สัปดาห์ 3–4)

- [~] Dashboard — ยอดคงเหลือ, รายรับ/จ่าย, กราฟ, รายการล่าสุด
- [~] งบประมาณ (ตั้งค่า + progress bar พื้นฐาน)
- [~] รายงานพื้นฐาน — สรุปรายเดือน, แยกตามหมวดหมู่
- [x] Export CSV รายเดือน/ช่วงเวลา

### Sprint 4: Polish & Deploy (สัปดาห์ 4–6)

- [~] หน้าผู้ใช้งาน/ตั้งค่า/เปลี่ยนรหัสผ่าน
- [~] Seed หมวดหมู่ preset (ต้องตรวจ encoding ภาษาไทย)
- [~] Error handling + loading states
- [~] Deploy Vercel + Supabase production (เตรียมคู่มือ deploy + checklist แล้ว)
- [~] ทดสอบบน mobile browser (ผ่าน smoke test หน้า login/register/dashboard/search/reports/splits ที่ 390px และทดสอบ CRUD รายรับ/รายจ่าย/โอนเงิน/split สำเร็จ)
- [x] ตรวจ `npm run build`
- [x] ตรวจ `npm run lint`
- [x] แก้ schema mismatch ของ `auth_providers` (เพิ่ม table + RLS ใน `scripts/schema.sql`)

### MVP — สิ่งที่ **ไม่** ทำ

- โหมดคู่รัก, LINE Bot, OCR/AI
- หนี้สิน, สินทรัพย์, บิล/Subscription
- ปฏิทิน, แจ้งเตือน, PWA
- Apple Login, 2FA, Biometric Lock

---

## Phase 2 — Extended Features (สัปดาห์ 7–10)

- [ ] เป้าหมายการออม
- [ ] หนี้สิน + ตารางผ่อนชำระ
- [ ] สินทรัพย์ + ประวัติมูลค่า
- [ ] รายการประจำ (recurring)
- [ ] บิล/Subscription tracker
- [ ] ปฏิทินการเงิน
- [ ] แจ้งเตือน (Push + Email)
- [ ] รายงานขั้นสูง (MoM, YoY, PDF export)
- [ ] PWA (manifest, service worker, add to home screen)
- [ ] Apple Login
- [ ] Audit Log
- [ ] PIN Lock / Biometric Lock

---

## Phase 3 — Couple Mode & LINE Bot (สัปดาห์ 11–14)

- [ ] โหมดคู่รัก — เชิญ, ยืนยัน, บัญชีกลาง
- [ ] Expense Split + Settlement
- [ ] เป้าหมายร่วม + งบประมาณร่วม
- [ ] Dashboard / รายงานคู่รัก
- [ ] LINE Login + Account Linking
- [ ] LINE Bot — Parser แบบ Pattern, บันทึกรายรับ-รายจ่าย
- [ ] LINE Bot — คำสั่งสรุป, แก้ไข/ลบรายการล่าสุด
- [ ] 2FA

---

## Phase 4 — Advanced (สัปดาห์ 15+)

- [ ] OCR ใบเสร็จ
- [ ] AI จัดหมวดหมู่ + Natural Language Parser (LINE)
- [ ] AI วิเคราะห์การเงิน + Forecast
- [ ] Multi Currency
- [ ] Offline Sync
- [ ] Import Statement ธนาคาร (CSV/Excel)
- [ ] Financial Health Score
- [ ] Gamification (Streak, Badge)
- [ ] Capacitor wrap → App Store / Play Store

---

## ลำดับความสำคัญฟีเจอร์ MVP

```
Must Have ─────────────────────────────────────────
  Auth (Email + Google)
  บัญชี CRUD
  รายรับ/รายจ่าย CRUD
  โอนเงิน
  หมวดหมู่ (preset + custom)
  Dashboard พื้นฐาน
  งบประมาณรายเดือน
  ค้นหา/กรอง
  Export CSV
  Responsive (mobile + PC)

Should Have ───────────────────────────────────────
  Split Transaction
  แท็ก
  ไฟล์แนบใบเสร็จ
  รายงานสรุปตามหมวดหมู่
  Dark mode

Could Have (ถ้าเวลาพอ) ───────────────────────────
  งบประมาณรายวัน/สัปดาห์/ปี
  กราฟเปรียบเทียบหลายเดือน
```

## Definition of Done — MVP

1. ผู้ใช้สมัคร/Login ได้ (Email หรือ Google)
2. สร้างบัญชีและบันทึกรายรับ-รายจ่ายได้
3. โอนเงินระหว่างบัญชีได้
4. Dashboard แสดงยอดคงเหลือและกราฟถูกต้อง
5. ตั้งงบประมาณรายเดือนและเห็น progress ได้
6. Export ข้อมูลเป็น CSV ได้
7. ใช้งานบนมือถือและ PC ได้สะดวก
8. Deploy production บน Vercel ได้
