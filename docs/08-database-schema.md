# Database Schema

> PostgreSQL ผ่าน Supabase — ใช้ UUID เป็น primary key ทุกตาราง

## ตารางหลัก (MVP)

### users

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| display_name | VARCHAR(100) | |
| email | VARCHAR(255) | nullable, unique |
| avatar_url | TEXT | nullable |
| locale | VARCHAR(10) | default `th` |
| currency | VARCHAR(3) | default `THB` |
| date_format | VARCHAR(20) | default `DD/MM/YYYY` |
| theme | ENUM | `light`, `dark`, `system` |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |

### auth_providers

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| provider | ENUM | `email`, `google`, `apple`, `line` |
| provider_uid | VARCHAR(255) | unique per provider |
| password_hash | VARCHAR(255) | เฉพาะ provider = email |
| line_user_id | VARCHAR(50) | เฉพาะ provider = line |
| created_at | TIMESTAMPTZ | |

**Unique:** `(provider, provider_uid)`

### accounts

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| name | VARCHAR(100) | |
| type | ENUM | `cash`, `bank`, `credit_card`, `e_wallet`, `investment` |
| balance | DECIMAL(15,2) | ยอดปัจจุบัน |
| initial_balance | DECIMAL(15,2) | ยอดเริ่มต้น |
| currency | VARCHAR(3) | default `THB` |
| icon | VARCHAR(50) | nullable |
| color | VARCHAR(7) | hex color |
| is_active | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### categories

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users, nullable สำหรับ preset |
| name | VARCHAR(100) | |
| type | ENUM | `income`, `expense` |
| icon | VARCHAR(50) | nullable |
| color | VARCHAR(7) | nullable |
| is_preset | BOOLEAN | default false |
| parent_id | UUID | FK → categories, nullable (subcategory) |
| sort_order | INT | |
| created_at | TIMESTAMPTZ | |

### tags

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| name | VARCHAR(50) | |
| color | VARCHAR(7) | nullable |
| created_at | TIMESTAMPTZ | |

**Unique:** `(user_id, name)`

### transactions

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| type | ENUM | `income`, `expense`, `transfer` |
| amount | DECIMAL(15,2) | |
| date | DATE | |
| account_id | UUID | FK → accounts |
| to_account_id | UUID | FK → accounts, เฉพาะ transfer |
| category_id | UUID | FK → categories, nullable สำหรับ transfer |
| payee | VARCHAR(200) | ผู้รับเงิน (รายรับ) |
| merchant | VARCHAR(200) | ร้านค้า (รายจ่าย) |
| note | TEXT | nullable |
| receipt_url | TEXT | nullable |
| source | ENUM | `app`, `line_bot`, `ocr` |
| fee_amount | DECIMAL(15,2) | ค่าธรรมเนียมโอน, nullable |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| deleted_at | TIMESTAMPTZ | soft delete |

### transaction_splits

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions |
| category_id | UUID | FK → categories |
| amount | DECIMAL(15,2) | |
| note | TEXT | nullable |

### transaction_tags

| Field | Type | Note |
|-------|------|------|
| transaction_id | UUID | FK → transactions |
| tag_id | UUID | FK → tags |

**PK:** `(transaction_id, tag_id)`

### budgets

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| category_id | UUID | FK → categories, nullable = งบรวม |
| period | ENUM | `daily`, `weekly`, `monthly`, `yearly` |
| amount | DECIMAL(15,2) | |
| start_date | DATE | |
| end_date | DATE | nullable |
| created_at | TIMESTAMPTZ | |

---

## ตารางเสริม (Phase 2)

### goals

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| name | VARCHAR(200) | |
| target_amount | DECIMAL(15,2) | |
| current_amount | DECIMAL(15,2) | default 0 |
| target_date | DATE | nullable |
| icon | VARCHAR(50) | nullable |
| created_at | TIMESTAMPTZ | |

### goal_transactions

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| goal_id | UUID | FK → goals |
| amount | DECIMAL(15,2) | บวก = ฝาก, ลบ = ถอน |
| note | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### debts

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| type | ENUM | `we_owe`, `they_owe` |
| counterparty | VARCHAR(200) | ชื่อคู่สัญญา |
| principal | DECIMAL(15,2) | |
| interest_rate | DECIMAL(5,2) | % ต่อปี, nullable |
| total_installments | INT | nullable |
| due_date | DATE | nullable |
| note | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### debt_schedules

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| debt_id | UUID | FK → debts |
| installment_no | INT | |
| due_date | DATE | |
| amount | DECIMAL(15,2) | |
| paid_amount | DECIMAL(15,2) | default 0 |
| paid_at | TIMESTAMPTZ | nullable |

### assets

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| name | VARCHAR(200) | |
| type | ENUM | `house`, `car`, `stock`, `fund`, `crypto`, `deposit` |
| current_value | DECIMAL(15,2) | |
| purchase_price | DECIMAL(15,2) | nullable |
| purchase_date | DATE | nullable |
| depreciation_rate | DECIMAL(5,2) | nullable, สำหรับรถ |
| note | TEXT | nullable |
| created_at | TIMESTAMPTZ | |

### asset_valuations

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| asset_id | UUID | FK → assets |
| value | DECIMAL(15,2) | |
| recorded_at | DATE | |
| note | TEXT | nullable |

### recurring_transactions

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| type | ENUM | `income`, `expense` |
| amount | DECIMAL(15,2) | |
| account_id | UUID | FK → accounts |
| category_id | UUID | FK → categories |
| frequency | ENUM | `daily`, `weekly`, `monthly`, `yearly` |
| next_date | DATE | |
| end_date | DATE | nullable |
| is_active | BOOLEAN | default true |
| note | TEXT | nullable |

### bills_subscriptions

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| name | VARCHAR(200) | |
| type | ENUM | `bill`, `subscription` |
| amount | DECIMAL(15,2) | |
| due_day | INT | วันที่ของเดือน (1–31) |
| account_id | UUID | FK → accounts, nullable |
| category_id | UUID | FK → categories, nullable |
| remind_days_before | INT | default 3 |
| is_active | BOOLEAN | default true |

### notifications

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| type | ENUM | `bill_due`, `budget_exceeded`, `goal_reached`, `debt_due` |
| title | VARCHAR(200) | |
| body | TEXT | |
| is_read | BOOLEAN | default false |
| sent_via | ENUM | `push`, `email`, `line` |
| created_at | TIMESTAMPTZ | |

### audit_logs

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| user_id | UUID | FK → users |
| entity_type | VARCHAR(50) | เช่น `transaction`, `account` |
| entity_id | UUID | |
| action | ENUM | `create`, `update`, `delete` |
| old_data | JSONB | nullable |
| new_data | JSONB | nullable |
| created_at | TIMESTAMPTZ | |

---

## ตารางโหมดคู่รัก (Phase 3)

### couples

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| name | VARCHAR(100) | nullable |
| created_at | TIMESTAMPTZ | |

### couple_members

| Field | Type | Note |
|-------|------|------|
| couple_id | UUID | FK → couples |
| user_id | UUID | FK → users |
| role | ENUM | `owner`, `member` |
| permission | ENUM | `view`, `edit` |

**PK:** `(couple_id, user_id)`

### relationship_invites

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| from_user_id | UUID | FK → users |
| to_email | VARCHAR(255) | nullable |
| to_user_id | UUID | FK → users, nullable |
| status | ENUM | `pending`, `accepted`, `rejected`, `cancelled` |
| created_at | TIMESTAMPTZ | |
| expires_at | TIMESTAMPTZ | |

### shared_accounts / shared_transactions / shared_goals / shared_budgets / shared_assets / shared_debts

โครงสร้างคล้ายตารางส่วนตัว แต่เพิ่ม `couple_id` FK → couples แทน `user_id`

### expense_splits

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| transaction_id | UUID | FK → transactions |
| user_id | UUID | FK → users |
| split_percent | DECIMAL(5,2) | |
| split_amount | DECIMAL(15,2) | |
| is_paid | BOOLEAN | default false |

### settlements

| Field | Type | Note |
|-------|------|------|
| id | UUID | PK |
| couple_id | UUID | FK → couples |
| from_user_id | UUID | FK → users |
| to_user_id | UUID | FK → users |
| amount | DECIMAL(15,2) | |
| note | TEXT | nullable |
| settled_at | TIMESTAMPTZ | |

## Row Level Security (RLS)

ทุกตารางที่มี `user_id` ใช้ Supabase RLS:

```sql
-- ตัวอย่าง: transactions
CREATE POLICY "Users can only access own transactions"
  ON transactions FOR ALL
  USING (auth.uid() = user_id);
```

ตาราง couple ใช้ policy ที่ตรวจ `couple_members` เพิ่มเติม
