-- 20261106000001에서 새 코드를 12자리로 늘렸는데 invites.code 검사가 8자리만 받아 목표 만들기가 실패했다(2026-11-06 개발 서버 시험에서 찾음).
-- 이미 만든 8자리 코드도 계속 쓰므로 8자리와 12자리를 모두 받는다.
alter table public.invites drop constraint invites_code_check;
alter table public.invites add constraint invites_code_check check (code ~ '^[A-HJ-NP-Z2-9]{8}([A-HJ-NP-Z2-9]{4})?$');
