# MVP Roadmap

> อัปเดตล่าสุด: **15 กรกฎาคม 2569**

## สรุปสถานะปัจจุบัน

- โปรเจกต์อยู่ช่วง **Phase 4 — AI/OCR/Advanced** (Phase 1-3 เสร็จแล้ว)
- TypeScript: ✅ 0 errors | ESLint: ✅ No warnings | Build: ✅ Pass
- Deploy: ✅ cmn-money-couple.vercel.app ใช้งานได้จริง
- Region: **Singapore** (Vercel `sin1` + Supabase `ap-southeast-1`) ✅
- LINE Bot: ✅ ทำงานได้ (พิมพ์ข้อความ) | ⏳ สแกนรูป (รอเติม Gemini API Credit)

## หลักการแบ่ง Phase

- **MVP (Phase 1):** ใช้งานได้จริงสำหรับบุคคลเดี่ยว — บันทึกรายรับ-รายจ่าย ดู Dashboard ตั้งงบประมาณ ✅
- **Phase 2:** ฟีเจอร์เสริม + PWA + แจ้งเตือน ✅
- **Phase 3:** โหมดคู่รัก + LINE Bot + Google/LINE OAuth ✅
- **Phase 4:** AI, OCR, Offline Sync, ฟีเจอร์ขั้นสูง (กำลังทำ)

---

## Phase 1 — MVP ✅ เสร็จแล้ว

### Sprint 1: Foundation ✅
- [x] Scaffold Next.js 15 + TypeScript + React 19
- [x] ตั้งค่า Supabase client/server/middleware
- [x] Auth: Email + Password + Username login
- [x] Layout responsive (Sidebar PC / Bottom Nav mobile)
- [x] หน้า Settings (โปรไฟล์, ภาษา, สกุลเงิน, theme, เปลี่ยนรหัสผ่าน)

### Sprint 2: Core Finance ✅
- [x] CRUD บัญชี (เงินสด, ธนาคาร, บัตรเครดิต, e-Wallet, investment)
- [x] CRUD หมวดหมู่ (preset + custom)
- [x] CRUD รายรับ / รายจ่าย + แท็ก
- [x] CRUD แท็ก (ตาราง `tags` + ผูกกับ `transaction_tags`)
- [x] โอนเงินระหว่างบัญชี (trigger อัปเดต balance)
- [x] Split Transaction UI (คำนวณยอดคงเหลือ real-time)

### Sprint 3: Dashboard & Budget ✅
- [x] Dashboard — KPI 6 ตัว, กราฟ SVG 6 เดือน, สัดส่วนรายจ่าย, รายการล่าสุด
- [x] งบประมาณ (ตั้งค่า + progress bar)
- [x] รายงาน — สรุปรายเดือน + daily trend + Export CSV
- [x] ค้นหา/กรองรายการ (keyword/ประเภท/วันที่/หมวด/บัญชี/จำนวน/แท็ก)

### Sprint 4: Extended Modules ✅
- [x] เป้าหมายการออม (Custom UI + ฝาก/ถอนเชื่อม transfer)
- [x] หนี้สิน (CRUD + ดอกเบี้ย/งวดผ่อน)
- [x] สินทรัพย์ (CRUD + 6 ประเภท + ค่าเสื่อม)
- [x] บิล/Subscription (CRUD + วันครบกำหนด + แจ้งเตือนล่วงหน้า)
- [x] แจ้งเตือน (Custom Client — mark read/all, filter, delete, badge)
- [x] ผู้ใช้งาน (แสดงเฉพาะตัวเอง, แก้ชื่อ inline)
- [x] ความปลอดภัย (auth providers, unlink, global sign out)

### Sprint 5: Polish & Deploy ✅
- [x] `npm run build` ✅ ผ่าน
- [x] `npm run lint` ✅ ผ่าน
- [x] TypeScript 0 errors
- [x] CrudPage Pagination (Supabase range + count, pageSize=50)
- [x] Mobile UI fixes (KPI overflow, section layout, table buttons)
- [x] Deploy Vercel (cmn-money-couple.vercel.app)

---

## Phase 2 — Extended Features ✅ เสร็จแล้ว

- [x] ปฏิทินการเงิน (Calendar Grid + popup รายการรายวัน)
- [x] รายการประจำ (Recurring Transactions)
- [x] ระบบแจ้งเตือนอัตโนมัติ (บิล/งบ/เป้าหมาย)
- [x] Vercel Cron Job แจ้งเตือนผ่าน LINE ทุก 08:00 น.
- [x] PWA (manifest.json + Service Worker)
- [x] รายงานขั้นสูง (MoM / YoY / PDF Export)
- [x] Receipt Upload (Supabase Storage)
- [x] Audit Log
- [x] Dark Mode Toggle
- [x] Account Bank Icons + Logo Upload

---

## Phase 3 — Couple Mode & LINE Bot & OAuth ✅ เสร็จแล้ว

- [x] LINE Login (OAuth) — Custom OAuth Callback
- [x] LINE Bot — Webhook, Pattern Parser
- [x] LINE Bot — บันทึกรายรับ-รายจ่าย, สรุป, ลบรายการ
- [x] LINE Bot — Natural Language (Gemini AI)
- [x] โหมดคู่รัก — เชิญ, ยืนยัน, บัญชีกลาง
- [x] Expense Split + Settlement
- [x] เป้าหมายร่วม + งบประมาณร่วม
- [x] Dashboard / รายงานคู่รัก
- [ ] Google Login (OAuth) — **(ยังไม่ต้องทำ รอผู้ใช้แจ้งเปิดใช้งาน)**
- [ ] 2FA — **(ยังไม่ต้องทำ รอทีหลังสุด)**
- [ ] PIN Lock / Biometric Lock — **(ยังไม่ต้องทำ รอทีหลังสุด)**

---

## Phase 4 — Advanced (กำลังทำ)

- [x] AI Natural Language Parser (Gemini API in LINE Bot)
- [x] AI ผู้ช่วยการเงิน (`/dashboard/ai-advisor`)
- [x] Import Statement ธนาคาร (CSV/Excel)
- [x] Gamification (Streak, Badge) — ซ่อนชั่วคราว
- [⏳] OCR สแกนรูปสลิป/ใบเสร็จใน LINE Bot — **รอเติม Gemini API Credit (400 บาท)**
- [ ] AI วิเคราะห์การเงิน + Forecast
- [ ] Multi Currency
- [ ] Offline Sync
- [ ] Apple Login
- [ ] Capacitor wrap → App Store / Play Store

### หน้าที่ยังกระดานเปล่า (รอพัฒนา)
- [ ] `/dashboard/assets` — สินทรัพย์
- [ ] `/dashboard/debts` — หนี้สิน
- [ ] `/dashboard/subscriptions` — ค่าบริการรายเดือน

---

## ความคืบหน้าภาพรวม

```
Phase 1 (MVP Core):          ██████████████████████  100% ✅
Phase 2 (Extended):          ██████████████████████  100% ✅
Phase 3 (Couple+LINE+OAuth): ████████████████████░░   92% ✅
Phase 4 (AI/OCR/Advanced):   ██████████░░░░░░░░░░░   50% ⏳
───────────────────────────────────────────────────
ภาพรวมทั้งโปรเจกต์:          ██████████████████░░░  ~88%
```

---

## ผลการทดสอบ Production (15 ก.ค. 2569)

| หน้า | สถานะ | หมายเหตุ |
|---|---|---|
| Login (Email/Username) | ✅ | ทำงานได้ปกติ |
| Dashboard | ✅ | KPI, กราฟ, รายการล่าสุด |
| รายรับ/รายจ่าย/โอนเงิน | ✅ | CRUD สมบูรณ์ |
| บัญชี/หมวดหมู่/แท็ก | ✅ | CRUD + Bank Icons |
| งบประมาณ/เป้าหมาย | ✅ | CRUD สมบูรณ์ |
| หนี้สิน/สินทรัพย์/บิล | ✅ | CRUD สมบูรณ์ |
| รายงาน | ✅ | สรุปรายเดือน + Export CSV |
| ปฏิทิน | ✅ | Calendar Grid สมบูรณ์ |
| แจ้งเตือน | ✅ | Vercel Cron Job 08:00 น. ทุกวัน |
| LINE Login | ✅ | Custom OAuth Callback |
| LINE Bot (พิมพ์ข้อความ) | ✅ | บันทึก/สรุป/ลบ ทำงานได้ |
| LINE Bot (สแกนรูป) | ⏳ | รอเติม Gemini API Credit 400 บาท |
| AI ผู้ช่วยการเงิน | ✅ | `/dashboard/ai-advisor` |
| โหมดคู่รัก | ✅ | จับคู่, แบ่งค่าใช้จ่าย, รายงานร่วม |
| Google Login | ⛔ ซ่อนไว้ | รอผู้ใช้แจ้งเปิดใช้งาน |
| `/dashboard/health` | ❌ ลบแล้ว | ถูกนำออกเมื่อ 15 ก.ค. 69 |
| Vercel Region | ✅ Singapore `sin1` | ตรงกับ Supabase `ap-southeast-1` |
