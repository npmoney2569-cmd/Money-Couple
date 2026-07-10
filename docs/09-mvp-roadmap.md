# MVP Roadmap

> สถานะล่าสุดของโค้ดจริงดูที่ [11-current-status](./11-current-status.md)

## สรุปสถานะปัจจุบัน

- โปรเจกต์อยู่ช่วง **Phase 2 — Extended Features** (MVP Core เสร็จแล้ว ~95%)
- TypeScript: ✅ 0 errors | ESLint: ✅ No warnings
- Deploy: ✅ cmn-money-couple.vercel.app ใช้งานได้จริง
- ทดสอบ production แล้ว (2026-07-09): login/ทุกหน้า/mobile

## หลักการแบ่ง Phase

- **MVP (Phase 1):** ใช้งานได้จริงสำหรับบุคคลเดี่ยว — บันทึกรายรับ-รายจ่าย ดู Dashboard ตั้งงบประมาณ ✅
- **Phase 2:** ฟีเจอร์เสริม + PWA + แจ้งเตือน (กำลังทำ)
- **Phase 3:** โหมดคู่รัก + LINE Bot + Google/LINE OAuth
- **Phase 4:** AI, OCR, Offline Sync, ฟีเจอร์ขั้นสูง

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

### MVP — สิ่งที่ไม่ทำใน Phase 1
- Google Login, LINE Login (→ Phase 3 ทีหลังสุด)
- Apple Login, 2FA, Biometric Lock (→ Phase 3/4)
- Recurring Transactions, PWA, Push Notification (→ Phase 2)
- โหมดคู่รัก, LINE Bot, OCR/AI (→ Phase 3/4)

---

## Phase 2 — Extended Features (กำลังทำ)

### 🟠 ลำดับ 1: ปฏิทินการเงิน (Calendar View)
- [x] แปลงหน้าปฏิทินจากตารางธุรกรรมเป็น Calendar Grid จริง
- [x] กดวันที่ดู popup รายการธุรกรรมของวันนั้น
- [x] แสดงยอด income/expense สรุปบนแต่ละวัน

### 🟠 ลำดับ 2: รายการประจำ (Recurring Transactions)
- [x] CRUD recurring_transactions (ประเภท, จำนวน, บัญชี, หมวดหมู่, ความถี่)
- [x] Auto-create transactions ตามรอบ (รายวัน/สัปดาห์/เดือน/ปี)
- [x] แสดง upcoming transactions บน Dashboard/Calendar

### 🟠 ลำดับ 3: ระบบแจ้งเตือนอัตโนมัติ
- [x] แจ้งเตือนบิลใกล้ครบกำหนด (X วันก่อน due_day)
- [x] แจ้งเตือนเกินงบประมาณ (expense > budget amount)
- [x] แจ้งเตือนเป้าหมายบรรลุ (balance >= target_amount)
- [x] Scheduled job หรือ trigger สร้าง notification อัตโนมัติ

### 🟡 ลำดับ 4: PWA
- [x] `manifest.json` (icon, theme, name, standalone)
- [x] Service Worker (cache shell assets)
- [x] Add to Home Screen prompt

### 🟡 ลำดับ 5: รายงานขั้นสูง
- [x] เปรียบเทียบรายเดือน MoM (Month-over-Month)
- [x] เปรียบเทียบรายปี YoY (Year-over-Year)
- [x] PDF Export

### 🟡 ลำดับ 6: Receipt Upload
- [x] อัปโหลดรูปใบเสร็จแนบกับธุรกรรม
- [x] ใช้ Supabase Storage
- [x] แสดง thumbnail ในตารางรายการ

### 🟢 ลำดับ 7: Audit Log
- [x] บันทึกประวัติการแก้ไข CRUD
- [x] แสดงหน้า Audit Log

### 🟢 ลำดับ 8: Dark Mode Toggle จริง
- [x] ปัจจุบันมีตัวเลือกแต่ยังไม่เปลี่ยนธีมจริง
- [x] เชื่อม localStorage + CSS variables

---

## Phase 3 — Couple Mode & LINE Bot & OAuth (ทำทีหลังสุด)

- [ ] Google Login (OAuth) — เปิด `ENABLE_GOOGLE_OAUTH = true` หลังตั้งค่า Google Console
- [x] LINE Login (OAuth) — พัฒนา Custom OAuth Callback และเปิดใช้งานเรียบร้อย
- [ ] LINE Bot — Webhook, Parser แบบ Pattern
- [ ] LINE Bot — บันทึกรายรับ-รายจ่าย, คำสั่งสรุป, แก้ไข/ลบ
- [ ] โหมดคู่รัก — เชิญ, ยืนยัน, บัญชีกลาง
- [ ] Expense Split + Settlement
- [ ] เป้าหมายร่วม + งบประมาณร่วม
- [ ] Dashboard / รายงานคู่รัก
- [ ] 2FA
- [ ] PIN Lock / Biometric Lock

---

## Phase 4 — Advanced (ทีหลังสุด)

- [ ] OCR ใบเสร็จ
- [ ] AI จัดหมวดหมู่ + Natural Language Parser
- [ ] AI วิเคราะห์การเงิน + Forecast
- [ ] Multi Currency
- [ ] Offline Sync
- [ ] Import Statement ธนาคาร (CSV/Excel)
- [ ] Financial Health Score
- [ ] Gamification (Streak, Badge)
- [ ] Apple Login
- [ ] Capacitor wrap → App Store / Play Store

---

## ความคืบหน้าภาพรวม

```
Phase 1 (MVP Core):         ████████████████████▓░  ~95%
Phase 2 (Extended):          ████░░░░░░░░░░░░░░░░░  ~20%
Phase 3 (Couple+LINE+OAuth): █░░░░░░░░░░░░░░░░░░░░   ~5%
Phase 4 (AI/OCR/Advanced):   ░░░░░░░░░░░░░░░░░░░░    0%
───────────────────────────────────────────────────
ภาพรวมทั้งโปรเจกต์:         ███████░░░░░░░░░░░░░░  ~37%
```

---

## ผลการทดสอบ Production (2026-07-09)

| หน้า | สถานะ | หมายเหตุ |
|---|---|---|
| Login (Email/Username) | ✅ ทำงานได้ | admin/admin99 ผ่าน |
| Dashboard | ✅ แสดงข้อมูล | KPI, กราฟ, รายการล่าสุด |
| รายรับ/รายจ่าย/โอนเงิน | ✅ ทำงานได้ | CRUD สมบูรณ์ |
| บัญชี/หมวดหมู่/แท็ก | ✅ ทำงานได้ | CRUD สมบูรณ์ |
| งบประมาณ/เป้าหมาย | ✅ ทำงานได้ | CRUD สมบูรณ์ |
| หนี้สิน/สินทรัพย์/บิล | ✅ ทำงานได้ | CRUD สมบูรณ์ |
| รายงาน | ✅ ทำงานได้ | สรุปรายเดือน + Export CSV |
| ค้นหา | ✅ ทำงานได้ | - |
| ปฏิทิน | ⚠️ โครงร่าง | แสดงตารางธุรกรรม ยังไม่ใช่ Calendar Grid |
| แจ้งเตือน | ✅ ทำงานได้ | (ยังไม่มีการแจ้งเตือนอัตโนมัติ) |
| ผู้ใช้งาน/ความปลอดภัย/ตั้งค่า | ✅ ทำงานได้ | - |
| Google Login | ⛔ ซ่อนไว้ | Phase 3 ทำทีหลังสุด |
| LINE Login | ✅ ทำงานได้ | พัฒนา Custom OAuth Callback สำเร็จ |
| LINE Bot | ❌ ยังไม่ทำ | Phase 3 |
