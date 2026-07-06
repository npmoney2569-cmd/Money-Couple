# MVP Roadmap

## หลักการแบ่ง Phase

- **MVP (Phase 1):** ใช้งานได้จริงสำหรับบุคคลเดี่ยว — บันทึกรายรับ-รายจ่าย ดู Dashboard ตั้งงบประมาณ
- **Phase 2:** ฟีเจอร์เสริม + PWA + แจ้งเตือน
- **Phase 3:** โหมดคู่รัก + LINE Bot
- **Phase 4:** AI, OCR, Offline Sync, ฟีเจอร์ขั้นสูง

---

## Phase 1 — MVP (เป้าหมาย: 4–6 สัปดาห์)

### Sprint 1: Foundation (สัปดาห์ 1–2)

- [ ] Scaffold Next.js + TypeScript + Tailwind + shadcn/ui
- [ ] ตั้งค่า Supabase project + migrations ตาราง MVP
- [ ] Auth: Email + Password, Google Login
- [ ] Layout responsive (Sidebar PC / Bottom Nav mobile)
- [ ] หน้า Settings พื้นฐาน (โปรไฟล์, ภาษา, สกุลเงิน, theme)

### Sprint 2: Core Finance (สัปดาห์ 2–3)

- [ ] CRUD บัญชี (เงินสด, ธนาคาร, บัตรเครดิต, e-Wallet)
- [ ] CRUD หมวดหมู่ (preset + custom + subcategory)
- [ ] CRUD รายรับ / รายจ่าย (พร้อมแท็ก, โน้ต, ไฟล์แนบ)
- [ ] โอนเงินระหว่างบัญชี
- [ ] Split Transaction (แยกหมวดหมู่ในรายการเดียว)
- [ ] ค้นหา/กรองรายการ

### Sprint 3: Dashboard & Budget (สัปดาห์ 3–4)

- [ ] Dashboard — ยอดคงเหลือ, รายรับ/จ่าย, กราฟ, รายการล่าสุด
- [ ] งบประมาณรายเดือน (ตั้งค่า + progress bar)
- [ ] รายงานพื้นฐาน — สรุปรายเดือน, แยกตามหมวดหมู่
- [ ] Export CSV

### Sprint 4: Polish & Deploy (สัปดาห์ 4–6)

- [ ] หน้าผู้ใช้งาน (โปรไฟล์, เปลี่ยนรหัสผ่าน)
- [ ] Seed หมวดหมู่ preset (รายรับ + รายจ่าย)
- [ ] Error handling + loading states
- [ ] Deploy Vercel + Supabase production
- [ ] ทดสอบบน mobile browser

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
