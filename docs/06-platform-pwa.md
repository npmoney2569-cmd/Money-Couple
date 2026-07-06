# Platform Support & PWA

## แนวทาง

Web App เดียว รองรับทุกอุปกรณ์ผ่าน Responsive Design + PWA ไม่ต้องพัฒนาแอปแยกสำหรับแต่ละแพลตฟอร์ม

## อุปกรณ์ที่รองรับ

| อุปกรณ์ | วิธีใช้งาน |
|---------|-----------|
| PC (Windows / Mac) | เบราว์เซอร์ปกติ |
| Android | เบราว์เซอร์ หรือติดตั้งเป็น PWA |
| iOS (iPhone/iPad) | Safari หรือติดตั้งเป็น PWA ("เพิ่มลงหน้าจอหลัก") |

## Responsive Design

| ขนาดจอ | Layout |
|--------|--------|
| มือถือ (< 768px) | Bottom Navigation, ฟอร์มเต็มจอ, กราฟแบบย่อ |
| แท็บเล็ต (768–1024px) | Layout 2 คอลัมน์ (รายการ + รายละเอียด) |
| PC (> 1024px) | Sidebar ถาวร, Dashboard แสดงข้อมูล/กราฟเต็มรูปแบบ |

## PWA Features

| ฟีเจอร์ | Phase |
|---------|-------|
| Web App Manifest (ไอคอน, ชื่อแอป, ธีมสี) | Phase 2 |
| Service Worker — Offline read-only | Phase 3 |
| Service Worker — Offline Sync | Phase 4 |
| Push Notification ผ่านเบราว์เซอร์ | Phase 2 |
| Add to Home Screen | Phase 2 |

## ความปลอดภัยระดับอุปกรณ์

- Biometric Lock (Face ID / Touch ID / Fingerprint) ผ่าน WebAuthn API — Phase 2

## แนวทางขยายในอนาคต

Wrap เป็นแอป Native ด้วย Capacitor หรือ React Native WebView เพื่อขึ้น App Store / Play Store โดยใช้โค้ดเว็บเดิมเป็นฐาน
