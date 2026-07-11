-- Fix: Remove couple_id from existing personal savings account
-- บัญชี "💖 ออม: test2" ถูกมาร์คเป็น couple account ผิด ต้องเป็น personal
-- Run once after applying couple-rpc.sql

update public.accounts 
set couple_id = null 
where id = '530e8d05-f6ac-4faf-a6ee-08ba55bc1f41';
