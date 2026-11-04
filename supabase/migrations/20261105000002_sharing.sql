-- 서버 2판 기준 파일 2/5: 초대, 차단, 신고, 금칙어, 다음 함께 목표 기본값, 읽기 권한 (서버 2판 계획 3, 4절, PRD 4.15).
-- 읽기 규칙 하나: 다른 사용자의 행은 그 목표의 나가지 않은 멤버이고, 서로 차단하지 않았을 때만 보인다(계획 1절 3번).
-- 다른 사람의 멤버 행과 칸은 sync_pull, pull_goal로만 받는다(표 직접 읽기 없음). 목표 행은 멤버면 표로도 읽는다.

-- 초대 코드 8자. 헷갈리는 글자(I, O, 0, 1)는 뺀다. 목표마다 쓰는 코드는 하나, 새로 만들면 옛 코드는 끈다.
create table public.invites (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  goal_id uuid not null references public.goals(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  created_at bigint not null,
  revoked_at bigint
);
create unique index invites_one_active on public.invites (goal_id) where revoked_at is null;

-- 차단. 양쪽 방향을 private.blocked_between 하나로 본다.
create table public.blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  -- 차단할 때 그 사람이 함께 목표에서 쓰던 이름. 차단하면 내보내지며 멤버 행의 이름이 지워지므로, 「차단한 사람」 목록용으로 여기 둔다.
  display_name text check (char_length(display_name) <= 10),
  created_at bigint not null,
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked on public.blocks (blocked_id);

-- 신고. 알림 메일(Edge Function report-notify, DB 웹훅)은 나중에 이 표의 insert에 붙인다.
-- 계정을 지워도 신고 내용은 운영 처리를 위해 남기고, 사람 id만 비운다.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete set null,
  reporter_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at bigint not null,
  handled_at bigint
);

-- 이름 금칙어. 비워 둔다(심사 전에 운영자가 채운다). 비교 방법은 private.normalize_name.
create table public.banned_words (
  word text primary key
);

-- 다음 함께 목표에 채워 줄 내 이름과 스티커 (PRD 4.15 「지난번 함께 목표에서 쓴 값」).
create table public.member_defaults (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 10),
  sticker_id text not null check (char_length(sticker_id) <= 40),
  updated_at bigint not null
);

-- 초대로 들어가기 시도 기록. 한 사람이 1시간에 20번까지(코드 맞히기 막기). join_goal이 1시간 지난 줄을 지운다.
-- 초대 코드에는 기간이 없다(제품 결정). 로그인 없이 부르는 preview_invite의 횟수 제한은 서버 앞단(프록시나 엣지)에서 나중에 건다.
create table private.join_attempts (
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_at bigint not null
);
create index join_attempts_user_time on private.join_attempts (user_id, attempted_at);

-- a와 b 사이에 어느 쪽이든 차단이 있는가
create function private.blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create function private.is_owner(p_goal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.goals where id = p_goal and owner_id = (select auth.uid()));
$$;

-- 금칙어 비교용 이름: 소문자로 바꾸고 공백, 문장부호, 보이지 않는 글자(폭 없는 공백 등)를 뺀다.
-- 한계(일부러 넣지 않음): 모양이 비슷한 글자(0과 o, 키릴 문자 a), 자모로 나눠 쓰기(ㅂㅏㅂㅗ), 글자 사이에 숫자나 다른 글자 끼우기,
-- 전각 영문(Ａ), 소리가 같은 다른 글자는 잡지 못한다. [:punct:]와 [:space:]가 어떤 글자를 포함하는지는 DB 로캘을 따른다.
-- 금칙어는 이름 안에 들어 있으면(부분 일치) 거른다. 짧은 낱말을 넣으면 정상 이름도 걸릴 수 있다.
create function private.normalize_name(p text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(lower(coalesce(p, '')), '[[:space:][:punct:]​‌‍⁠﻿]+', '', 'g');
$$;

create function private.name_banned(p text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.banned_words w
    where private.normalize_name(w.word) <> ''
      and position(private.normalize_name(w.word) in private.normalize_name(p)) > 0
  );
$$;

-- 앞뒤 공백을 빼고 길이와 금칙어를 본다. 길이가 틀리면 22023 invalid_name, 금칙어면 name_not_allowed.
create function private.clean_name(p text, max_len integer) returns text
language plpgsql stable set search_path = '' as $$
declare v text := regexp_replace(coalesce(p, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
begin
  if char_length(v) < 1 or char_length(v) > max_len then
    raise exception using errcode = '22023', message = 'invalid_name';
  end if;
  if private.name_banned(v) then perform private.fail('name_not_allowed'); end if;
  return v;
end $$;

-- 입력 검사 (보안 검토 2026-11-04). 틀리면 22023 invalid_input. 함께 목표 RPC가 쓴다(1.1.0 혼자 목표에는 걸지 않는다).
-- 스티커 id는 1~40자.
create function private.check_sticker(p text) returns text language plpgsql immutable set search_path = '' as $$
begin
  if p is null or btrim(p) = '' or char_length(p) > 40 then
    raise exception using errcode = '22023', message = 'invalid_sticker';
  end if;
  return p;
end $$;

-- 종료일은 null 또는 실제 있는 날짜 'YYYY-MM-DD'.
create function private.check_end_date(p text) returns text language plpgsql immutable set search_path = '' as $$
declare ok boolean;
begin
  if p is null then return null; end if;
  begin
    ok := p ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' and p::date::text = p; -- 2026-02-30 같은 없는 날짜는 형변환 오류
  exception when others then
    ok := false;
  end;
  if not ok then raise exception using errcode = '22023', message = 'invalid_input'; end if;
  return p;
end $$;

-- 적립판 칸 수 1~1000. 앱에는 위 한도가 없어서(src/domain/board.ts parseSlotCount) 서버가 정한 값이다. 달력판은 칸 수를 쓰지 않는다(null).
create function private.check_slots(p_board text, p_slots integer) returns integer language plpgsql immutable set search_path = '' as $$
begin
  if p_board = 'tally' and (p_slots is null or p_slots < 1 or p_slots > 1000) then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  return case when p_board = 'tally' then p_slots end;
end $$;

-- 새 초대 코드. gen_random_uuid(강한 난수)의 무작위 바이트 8개를 32글자 알파벳에 옮긴다(256이 32로 나눠떨어져 고르게 나온다).
create function private.new_invite_code() returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
  i integer;
begin
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop -- uuid v4의 판 번호와 변형 비트가 없는 자리
    code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

-- 목표의 초대 코드를 새로 만든다(옛 코드는 부르는 쪽이 먼저 끈다). 겹치면 다시 뽑는다.
create function private.issue_invite(p_goal uuid, p_user uuid) returns text language plpgsql set search_path = '' as $$
declare code text;
begin
  for attempt in 1..5 loop
    code := private.new_invite_code();
    begin
      insert into public.invites (code, goal_id, created_by, created_at) values (code, p_goal, p_user, private.now_ms());
      return code;
    exception when unique_violation then
      if exists (select 1 from public.invites where goal_id = p_goal and revoked_at is null) then raise; end if;
    end;
  end loop;
  raise exception 'could not issue invite code' using errcode = '55000';
end $$;

-- 읽기 정책 (계획 4절)
alter table public.invites enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.banned_words enable row level security;
alter table public.member_defaults enable row level security;

-- 목표 행은 모두에게 같은 값이라 멤버면 읽는다(만든 사람 id, 이름, 판 모양). goal_members, stickers는 정책과 권한이 없다.
create policy goals_members_read on public.goals for select to authenticated
  using (private.can_see_goal(id));
create policy invites_owner_read on public.invites for select to authenticated using (private.is_owner(goal_id));
create policy blocks_own on public.blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy member_defaults_own on public.member_defaults for select to authenticated using (user_id = (select auth.uid()));
-- reports, banned_words: 정책 없음(앱에서 읽지 못한다).

revoke all on public.invites, public.blocks, public.reports, public.banned_words, public.member_defaults from anon, authenticated;
grant select on public.invites, public.blocks, public.member_defaults to authenticated;
grant select, insert, update, delete on public.invites, public.blocks, public.reports, public.banned_words, public.member_defaults
  to service_role;

-- 정책이 부르는 함수만 로그인 사용자에게 연다. private 스키마는 API로 노출하지 않으므로 RPC로는 부를 수 없다.
revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;
