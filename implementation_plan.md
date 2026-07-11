# บันทึกสถานะและแผนงาน — Money Couple (CMN)

> อัปเดตล่าสุด: 2026-07-11

---

## 📊 ภาพรวมโปรเจกต์

| รายการ | รายละเอียด |
|---|---|
| **Tech Stack** | Next.js 15, React 19, TypeScript, Supabase |
| **ไฟล์โค้ดทั้งหมด** | ~54 ไฟล์ (40 ใน src/app + 10 components + 4 lib) |
| **ฐานข้อมูล** | 21 ตาราง + RLS policies ครบ + Trigger อัปเดตยอดคงเหลือ |
| **Scripts** | 28 ไฟล์ (SQL + MJS) |
| **Build / Lint / TypeCheck** | ✅ ผ่านทั้งหมด (Next.js 15.5.20, 40 routes, 0 TS errors) |
| **Deploy** | Vercel (cmn-money-couple.vercel.app) — ใช้งานได้จริง |

### ความคืบหน้าภาพรวม

```
Phase 1 (MVP Core):          ██████████████████████  100% เสร็จสิ้น
Phase 2 (Extended Features): █████████████████████░   95% (รอ PDF export)
Phase 3 (Couple + LINE):     █████████████████░░░░░   85% (รอ Google OAuth, 2FA, PIN)
Phase 4 (AI/OCR/Advanced):   ░░░░░░░░░░░░░░░░░░░░░░    0% ยังไม่เริ่ม
──────────────────────────────────────────────────────
ภาพรวมทั้งโปรเจกต์:          ████████████████░░░░░░  ~80%
```

---

## 🟢 สถานะโมดูลทั้งหมด

### ✅ Phase 1 — Core Finance (ใช้งานได้ทั้งหมด)

| หน้า | ประเภท | หมายเหตุ |
|---|---|---|
| **Dashboard** | Custom Server | KPI 6 ตัว, กราฟ SVG แนวโน้ม 6 เดือน, สัดส่วนรายจ่าย, รายการล่าสุด |
| **รายรับ** | CrudPage | CRUD + เชื่อมหมวดหมู่/บัญชี/แท็ก + Pagination 50/หน้า |
| **รายจ่าย** | CrudPage | CRUD + เชื่อมหมวดหมู่/บัญชี/แท็ก + Pagination |
| **โอนเงิน** | CrudPage | CRUD + Trigger อัปเดตยอดคงเหลือ |
| **บัญชี** | CrudPage | รองรับ 5 ประเภท (เงินสด/ธนาคาร/บัตรเครดิต/e-Wallet/ลงทุน) |
| **หมวดหมู่** | CrudPage | Preset + Custom, แยกรายรับ/รายจ่าย |
| **แท็ก** | CrudPage | CRUD + เชื่อมกับ transaction_tags |
| **งบประมาณ** | CrudPage | ตั้งงบรายวัน/สัปดาห์/เดือน/ปี + Progress bar + แจ้งเตือนอัตโนมัติ |
| **เป้าหมายการออม** | Custom Client | CRUD + ปุ่มฝาก/ถอน + sync goals.current_amount |
| **หนี้สิน** | CrudPage | CRUD + ดอกเบี้ย/งวดผ่อน |
| **สินทรัพย์** | CrudPage | 6 ประเภท + ค่าเสื่อม/ราคาซื้อ |
| **บิล/Subscription** | CrudPage | CRUD + วันครบกำหนด + เตือนก่อนกี่วัน |
| **ตั้งค่า** | Custom Client | โปรไฟล์/ภาษา/สกุลเงิน/ธีม/เปลี่ยนรหัสผ่าน |

### ✅ Phase 2 — Extended Features (ใช้งานได้ 95%)

| หน้า | ประเภท | หมายเหตุ |
|---|---|---|
| **ปฏิทิน** | Custom Client | Calendar Grid จริง + กดวันที่ดู Popup รายการ + ยอดรับ/จ่ายรายวัน |
| **แจ้งเตือน** | Custom Client | mark read/all, filter unread, delete, badge count |
| **รายการประจำ** | Custom Client | CRUD daily/weekly/monthly/yearly + "ประมวลผลวันนี้" → สร้าง transaction จริง |
| **รายงาน** | Custom Server | MoM + YoY + กราฟรายวัน + หมวดรายจ่าย + Export CSV + Export ช่วง + Print |
| **Audit Log** | Custom Server | บันทึกประวัติ CRUD ลงตาราง audit_logs อัตโนมัติ |
| **ค้นหา/กรอง** | Custom Client | keyword/ประเภท/วันที่/หมวด/บัญชี/จำนวน/แท็ก |
| **Split Transaction** | Custom Client | คำนวณสัดส่วนหารเงิน manual (standalone) |
| **PWA** | Web App | manifest.json + Service Worker + Add to Home Screen |
| **รายงาน PDF** | — | ⏳ ยังไม่ทำ |

### ✅ Phase 3 — Couple Mode + LINE Bot (ใช้งานได้ 85%)

| ฟีเจอร์ | หมายเหตุ |
|---|---|
| **Couple Hub Dashboard** | แสดง 3 คอลัมน์: บัญชีฉัน / บัญชีแฟน / บัญชีกลาง |
| **เชิญ/ยืนยันคู่รัก** | ส่ง invite → ยืนยัน → Accept ด้วย RPC |
| **Auto-create บัญชีกลาง** | ตอน Accept invite → สร้าง `บัญชีกลางคู่รัก 💖` อัตโนมัติ ✅ Applied 2026-07-11 |
| **Expense Split** | หาร 50/50 หรือ % กำหนดเอง + บันทึกประวัติ |
| **Settlement** | โอนเงินคืนระหว่างคู่ + คำนวณยอดค้างสุทธิ |
| **Couple Reports** | หมวดรายจ่ายร่วม + สัดส่วนแต่ละคน |
| **สลายคู่รัก** | ปุ่ม 💔 + ยืนยัน + ลบ couples row |
| **LINE Bot Webhook** | Webhook endpoint + Pattern Parser + บันทึก/สรุป/ลบ ผ่าน LINE Chat |
| **LINE Login OAuth** | Custom OAuth Callback ✅ |
| **Google Login** | ⏸️ ซ่อนไว้ รอเปิด ENABLE_GOOGLE_OAUTH=true |
| **2FA / PIN Lock** | ❌ ยังไม่ทำ |

### ❌ Phase 4 — ยังไม่เริ่มเลย

| ฟีเจอร์ |
|---|
| OCR ใบเสร็จ |
| AI จัดหมวดหมู่ + วิเคราะห์การเงิน |
| Multi Currency |
| Import Statement ธนาคาร (CSV/Excel) |
| Financial Health Score / Gamification |

---

## 🐛 บั๊กที่แก้แล้ว (ทั้งหมด)

| # | บั๊ก | สถานะ |
|---|---|---|
| 1 | Goals: `current_amount` not-null constraint error ตอนสร้าง | ✅ แก้แล้ว |
| 2 | Reports: account_id แสดงเป็น UUID แทนชื่อบัญชี | ✅ แก้แล้ว (accountMap) |
| 3 | Reports: dead code `averageDailyExpense`/`incomeCoverage` ไม่แสดง | ✅ เพิ่ม stat cards แล้ว |
| 4 | CrudPage: ไม่มี pagination, limit(200) | ✅ ใช้ Supabase range() + count(), pageSize=50 |
| 5 | Users page: อาจแสดงข้อมูลผู้ใช้คนอื่น | ✅ ใช้ supabase.auth.getUser() + RLS |
| 6 | Alerts: notification type `goal_achieved` ≠ `goal_reached` (DB) | ✅ แก้แล้ว 2026-07-11 |
| 7 | Couple: บัญชีส่วนตัว `💖 ออม: test2` ถูก mark เป็น couple_id | ✅ cleanup แล้ว 2026-07-11 |

---

## 📋 สิ่งที่ต้องทำต่อ (เหลือ)

### 🟠 Phase 2 — รอทำ 1 อย่าง

- [ ] **รายงาน PDF Export** — ใช้ `window.print()` + print.css หรือ library เช่น jsPDF

### 🟡 Phase 3 — รอทำ 3 อย่าง

- [ ] **Google Login** — เปิด `ENABLE_GOOGLE_OAUTH=true` ใน .env + Supabase provider
- [ ] **2FA** — TOTP via supabase auth
- [ ] **PIN Lock / Biometric** — localStorage PIN hash + prompt on session

---

## 🧪 วิธีทดสอบหลังย้ายเครื่อง

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. ตรวจสอบ .env.local (NEXT_PUBLIC_SUPABASE_URL, ANON_KEY, DATABASE_URL, DIRECT_URL)

# 3. Build check
npm run build

# 4. Dev server
npm run dev  # http://localhost:3008

# 5. ทดสอบ Couple Hub
# Login test1@cmn.com → /dashboard/couple → ส่ง invite → Login test2@cmn.com → รับ invite
# ยืนยันบัญชีกลาง "บัญชีกลางคู่รัก 💖" ถูกสร้าง
```

---

> **ดู Roadmap ละเอียด:** [`docs/09-mvp-roadmap.md`](file:///d:/CMN/CMN/docs/09-mvp-roadmap.md)
