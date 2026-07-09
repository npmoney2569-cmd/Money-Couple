# รายงานตรวจสอบโปรเจกต์ Money Couple (CMN) ฉบับสมบูรณ์

อัปเดต: 2026-07-08

---

## ภาพรวมโปรเจกต์

| รายการ | รายละเอียด |
|---|---|
| **Tech Stack** | Next.js 15, React 19, TypeScript, Supabase |
| **ไฟล์โค้ดทั้งหมด** | ~54 ไฟล์ (40 ใน src/app + 10 components + 4 lib) |
| **ฐานข้อมูล** | 21 ตาราง + RLS policies ครบ + Trigger อัปเดตยอดคงเหลือ |
| **Scripts** | 18 ไฟล์ (10 SQL + 8 MJS) |
| **Build / Lint / TypeCheck** | ✅ ผ่านทั้งหมด |
| **Deploy** | Vercel (cmn-money-couple.vercel.app) — ใช้งานได้แต่ยังไม่ปรับ Production เต็มรูปแบบ |

---

## สถานะแต่ละโมดูล (ละเอียด)

### ✅ ใช้งานได้จริง (16 หน้า)

| หน้า | ประเภท | สถานะ | หมายเหตุ |
|---|---|---|---|
| **Dashboard** | Custom Server | ✅ ทำงานจริง | KPI 6 ตัว, กราฟ SVG แนวโน้ม 6 เดือน, สัดส่วนรายจ่าย, รายการล่าสุด |
| **รายรับ** | CrudPage | ✅ ทำงานจริง | CRUD + เชื่อมหมวดหมู่/บัญชี/แท็ก |
| **รายจ่าย** | CrudPage | ✅ ทำงานจริง | CRUD + เชื่อมหมวดหมู่/บัญชี/แท็ก |
| **โอนเงิน** | CrudPage | ✅ ทำงานจริง | CRUD + Trigger อัปเดตยอดคงเหลือ |
| **บัญชี** | CrudPage | ✅ ทำงานจริง | รองรับ 5 ประเภท (เงินสด/ธนาคาร/บัตรเครดิต/e-Wallet/ลงทุน) |
| **หมวดหมู่** | CrudPage | ✅ ทำงานจริง | Preset + Custom, แยกรายรับ/รายจ่าย |
| **แท็ก** | CrudPage | ✅ ทำงานจริง | CRUD + เชื่อมกับ transaction_tags |
| **งบประมาณ** | CrudPage | ✅ ทำงานจริง | ตั้งงบรายวัน/สัปดาห์/เดือน/ปี + Progress bar |
| **เป้าหมายการออม** | CrudPage | ⚠️ มีบั๊ก | `current_amount` not-null constraint error ตอนสร้าง |
| **หนี้สิน** | CrudPage | ✅ ทำงานจริง | CRUD + ดอกเบี้ย/งวดผ่อน |
| **สินทรัพย์** | CrudPage | ✅ ทำงานจริง | 6 ประเภท + ค่าเสื่อม/ราคาซื้อ |
| **บิล/Subscription** | CrudPage | ✅ ทำงานจริง | CRUD + วันครบกำหนด + เตือนก่อนกี่วัน |
| **Split Transaction** | Custom Client | ✅ ทำงานจริง | คำนวณยอดคงเหลือ real-time |
| **รายงาน** | Custom Server | ✅ ทำงานจริง | สรุปรายเดือน + กราฟรายวัน + Export CSV |
| **ค้นหา/กรอง** | Custom Client | ✅ ทำงานจริง | ค้นหา keyword/ประเภท/วันที่/หมวด/บัญชี/จำนวน/แท็ก |
| **ตั้งค่า** | Custom Client | ✅ ทำงานจริง | โปรไฟล์/ภาษา/สกุลเงิน/ธีม/เปลี่ยนรหัสผ่าน |

### ⚠️ โครงหน้า (Read-Only / ยังไม่มีฟังก์ชันจริง — 5 หน้า)

| หน้า | ปัญหา | สิ่งที่ขาด |
|---|---|---|
| **ปฏิทิน** | แสดงเป็นตารางธุรกรรมเรียงวัน ไม่ใช่ Calendar view | ต้องทำ UI ปฏิทินจริง (กดวันที่ดูรายการ) |
| **แจ้งเตือน** | แสดงข้อมูลจากตาราง notifications เท่านั้น | ไม่มีระบบสร้างแจ้งเตือนอัตโนมัติ, ไม่มีปุ่มอ่านแล้ว |
| **LINE Bot** | แสดงธุรกรรมที่ source=line_bot เท่านั้น | ไม่มี Webhook, Parser, การผูกบัญชี LINE |
| **ผู้ใช้งาน** | แสดงตาราง users แบบ read-only | ไม่มีจัดการผู้ใช้, อาจแสดงข้อมูลคนอื่นได้ |
| **ความปลอดภัย** | แสดงตาราง auth_providers เท่านั้น | ไม่มี 2FA, PIN Lock, Session Management |

### ❌ ยังไม่ได้เริ่มทำ

| ฟีเจอร์ | เฟส |
|---|---|
| PWA (manifest, service worker, offline) | Phase 2 |
| Recurring Transactions UI | Phase 2 |
| โหมดคู่รัก (Couple Mode) | Phase 3 |
| LINE Bot (Webhook/Parser) | Phase 3 |
| OCR ใบเสร็จ | Phase 4 |
| AI จัดหมวดหมู่ / วิเคราะห์ | Phase 4 |
| Multi Currency | Phase 4 |
| Import Statement ธนาคาร | Phase 4 |

---

## 🐛 บั๊กที่พบและต้องแก้ไข

| # | บั๊ก | ความรุนแรง | ไฟล์ที่เกี่ยวข้อง |
|---|---|---|---|
| 1 | **Goals: `current_amount` not-null constraint** — สร้างเป้าหมายใหม่ไม่ได้ | 🔴 สูง | `goals/page.tsx` — ต้องเพิ่ม default value `0` ให้ field `current_amount` |
| 2 | **Reports: account_id แสดงเป็น UUID** — ไม่แสดงชื่อบัญชี | 🟡 ปานกลาง | `reports/page.tsx` — ต้องสร้าง accountMap เหมือน categoryMap |
| 3 | **Reports: ตัวแปร `averageDailyExpense` และ `incomeCoverage` คำนวณแล้วไม่ได้แสดง** | 🟢 เล็กน้อย | `reports/page.tsx` — dead code |
| 4 | **CrudPage: ไม่มี pagination** — limit(200) อาจช้าเมื่อข้อมูลเยอะ | 🟡 ปานกลาง | `crud-page.tsx` |
| 5 | **Users page: อาจแสดงข้อมูลผู้ใช้คนอื่น** (ขึ้นอยู่กับ RLS) | 🟡 ปานกลาง | `users/page.tsx` + RLS policy |

---

## 📋 สิ่งที่ต้องทำต่อ (เรียงตามลำดับความสำคัญ)

### 🔴 ลำดับ 1: แก้บั๊กเร่งด่วน (ใช้เวลา ~1-2 ชม.)

- [x] **แก้ Goals not-null bug** — เพิ่ม `defaultValue: "0"` ให้ field `current_amount` ใน `goals/page.tsx` + เพิ่ม `defaultValue` support ใน `CrudPage`
- [x] **แก้ Reports account_id UUID** — สร้าง accountMap แล้ว resolve ชื่อบัญชีแทน UUID ใน `reports/page.tsx`
- [x] **แสดง dead code ใน Reports** — เพิ่ม stat cards แสดง `averageDailyExpense` (รายจ่ายเฉลี่ย/วัน) และ `incomeCoverage` (สัดส่วนรายจ่าย/รายรับ)

### 🟠 ลำดับ 2: ปิดช่องว่าง MVP (ใช้เวลา ~1-2 วัน)

- [x] **ปรับหน้า Alerts ให้ใช้งานได้** — เพิ่มปุ่ม "อ่านแล้ว" (mark as read), กรอง unread, ลบการแจ้งเตือน, แสดงจำนวนที่ยังไม่อ่าน
- [x] **ปรับหน้า Users ให้ปลอดภัย** — แสดงเฉพาะข้อมูลตัวเอง (supabase.auth.getUser()), แก้ไขชื่อที่แสดง
- [x] **ปรับหน้า Security** — แสดง providers ที่ผูกอยู่, ปุ่มยกเลิกผูก (ป้องกันการลบ provider เดียว), ปุ่ม Global Sign Out
- [x] **เพิ่ม CrudPage pagination** — Supabase range() + count(), configurable pageSize (default 50), nav controls
- [ ] **เพิ่ม Receipt Upload** — อัปโหลดรูปใบเสร็จแนบกับธุรกรรม (ใช้ Supabase Storage)

### 🟡 ลำดับ 3: ปรับปรุง UI/UX (ใช้เวลา ~2-3 วัน)

- [ ] **สร้างหน้าปฏิทินจริง** — Calendar grid view ที่กดวันที่แล้วดูรายการธุรกรรมของวันนั้นได้
- [ ] **เพิ่ม Progress visualization ให้ Goals** — แสดง progress bar (current/target) + ปุ่มฝาก/ถอนเงินเข้าเป้าหมาย
- [ ] **ปรับ Bottom Nav มือถือ** — ลดขนาดฟอนต์ให้พอดีจอ (ปรับแล้วบางส่วน)
- [ ] **ปรับ Encoding ภาษาไทย** — ตรวจ Preset Categories และเมนู Dashboard ที่อาจแสดงเพี้ยน
- [ ] **Deploy Vercel Production** — ตั้งค่า environment variables จริง, ทดสอบก่อนเปิดใช้งาน

### 🔵 ลำดับ 4: Phase 2 — ฟีเจอร์เสริม

- [ ] Recurring Transactions (รายการประจำ)
- [ ] ระบบแจ้งเตือนอัตโนมัติ (บิลใกล้ครบ, เกินงบ)
- [ ] PWA (manifest, service worker, add to home screen)
- [ ] Dark Mode toggle จริง (ปัจจุบันมีตัวเลือกแต่ยังไม่เปลี่ยนธีมจริง)
- [ ] รายงานขั้นสูง (MoM, YoY, PDF export)
- [ ] Audit Log UI

### 🟣 ลำดับ 5: Phase 3 — โหมดคู่รัก & LINE Bot

- [ ] Couple Mode — เชิญคู่, ยืนยัน, บัญชีกลาง, Expense Split, Settlement
- [ ] LINE Bot — Webhook, Parser, Account Linking, คำสั่งสรุป/บันทึก

### ⚫ ลำดับ 6: Phase 4 — ขั้นสูง

- [ ] OCR ใบเสร็จ
- [ ] AI จัดหมวดหมู่ + วิเคราะห์การเงิน
- [ ] Multi Currency
- [ ] Import Statement ธนาคาร (CSV/Excel)
- [ ] Financial Health Score
- [ ] Gamification

---

## สรุปความคืบหน้า

```
Phase 1 (MVP Core):        ████████████████████░░  ~90%
Phase 2 (Extended):         ███████░░░░░░░░░░░░░░  ~35%
Phase 3 (Couple + LINE):   ██░░░░░░░░░░░░░░░░░░░  ~10%
Phase 4 (AI/OCR/Advanced): ░░░░░░░░░░░░░░░░░░░░░   0%
────────────────────────────────────────────────────
ภาพรวมทั้งโปรเจกต์:        ████████░░░░░░░░░░░░░  ~45%
```

> [!IMPORTANT]
> **คำแนะนำ:** ให้เริ่มจาก **ลำดับ 1 (แก้บั๊ก)** ก่อน เพราะใช้เวลาไม่นาน แต่จะทำให้ระบบพร้อมใช้งานจริงทันที จากนั้นค่อยทำ **ลำดับ 2-3** เพื่อปิด MVP ให้สมบูรณ์ก่อน Deploy Production จริง
