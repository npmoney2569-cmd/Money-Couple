# ภาพรวมระบบ

ระบบบัญชีรายรับ-รายจ่าย สำหรับบุคคลและคู่รัก (v2)

## วัตถุประสงค์

Web App เดียวที่ช่วยบันทึก วิเคราะห์ และวางแผนการเงินส่วนบุคคล รองรับโหมดคู่รัก การบันทึกผ่าน LINE Bot และการใช้งานบนทุกอุปกรณ์ผ่าน PWA

## โครงสร้างระบบ (เมนูหลัก)

| # | โมดูล | เอกสาร | Phase |
|---|-------|--------|-------|
| 1 | Dashboard | [02-core-modules](./02-core-modules.md#1-dashboard) | MVP |
| 2 | รายรับ | [02-core-modules](./02-core-modules.md#2-รายรับ) | MVP |
| 3 | รายจ่าย | [02-core-modules](./02-core-modules.md#3-รายจ่าย) | MVP |
| 4 | โอนเงิน | [02-core-modules](./02-core-modules.md#4-โอนเงิน) | MVP |
| 5 | บัญชี | [02-core-modules](./02-core-modules.md#5-บัญชี) | MVP |
| 6 | หมวดหมู่ | [02-core-modules](./02-core-modules.md#6-หมวดหมู่) | MVP |
| 7 | ค้นหา/กรอง | [02-core-modules](./02-core-modules.md#7-ค้นหากรองข้อมูล) | MVP |
| 8 | งบประมาณ | [02-core-modules](./02-core-modules.md#8-งบประมาณ) | MVP |
| 9 | เป้าหมายการออม | [03-extended-modules](./03-extended-modules.md#1-เป้าหมายการออม) | Phase 2 |
| 10 | หนี้สิน | [03-extended-modules](./03-extended-modules.md#2-หนี้สิน) | Phase 2 |
| 11 | สินทรัพย์ | [03-extended-modules](./03-extended-modules.md#3-สินทรัพย์) | Phase 2 |
| 12 | รายการประจำ | [03-extended-modules](./03-extended-modules.md#4-รายการประจำ) | Phase 2 |
| 13 | บิล/Subscription | [03-extended-modules](./03-extended-modules.md#5-บิลsubscription) | Phase 2 |
| 14 | ปฏิทิน | [02-core-modules](./02-core-modules.md#9-ปฏิทิน) | Phase 2 |
| 15 | รายงาน | [03-extended-modules](./03-extended-modules.md#6-รายงาน) | MVP (พื้นฐาน) |
| 16 | แจ้งเตือน | [03-extended-modules](./03-extended-modules.md#7-แจ้งเตือน) | Phase 2 |
| 17 | LINE Bot | [05-line-bot](./05-line-bot.md) | Phase 3 |
| 18 | ตั้งค่า | [02-core-modules](./02-core-modules.md#10-ตั้งค่า) | MVP |
| 19 | ผู้ใช้งาน | [02-core-modules](./02-core-modules.md#11-ผู้ใช้งาน) | MVP |
| 20 | ความปลอดภัย | [07-auth-security](./07-auth-security.md) | MVP |

## เอกสารที่เกี่ยวข้อง

- [สถานะล่าสุดและงานถัดไป](./11-current-status.md)
- [โมดูลหลัก (Core)](./02-core-modules.md)
- [โมดูลเสริม (Extended)](./03-extended-modules.md)
- [โหมดคู่รัก](./04-couple-mode.md)
- [LINE Bot](./05-line-bot.md)
- [Platform & PWA](./06-platform-pwa.md)
- [Auth & Security](./07-auth-security.md)
- [Database Schema](./08-database-schema.md)
- [Tech Stack](./10-tech-stack.md)
- [MVP Roadmap](./09-mvp-roadmap.md)

## สถานะปัจจุบัน

โปรเจกต์อยู่ในช่วง **MVP Core / In Development** มี Auth, Dashboard, CRUD หลัก, schema Supabase และรายงานพื้นฐานแล้ว แต่ยังต้องแก้ build/lint, schema mismatch, encoding ภาษาไทย และทดสอบ flow จริงก่อนพร้อมใช้งาน production

ดูรายละเอียดที่ [11-current-status](./11-current-status.md)

## ฟีเจอร์ขั้นสูง (Phase 4+)

- OCR ใบเสร็จ
- AI จัดหมวดหมู่ / วิเคราะห์การเงิน
- Forecast, Scenario Planner, Financial Timeline
- Multi Currency
- Offline Sync
- Import/Export Statement ธนาคาร (CSV/Excel)
- Financial Health Score (บุคคล + คู่รัก)
- Smart Auto Split, Gamification (Streak, Badge)
