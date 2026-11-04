-- 서버 2판 기준 파일 1/5: 순번, 계정, 목표, 멤버, 스티커, 기록 (docs/superpowers/specs/2026-11-04-server-v2-plan.md 3, 4절).
-- 이번 한 번만 이전 마이그레이션 다섯 개를 지우고 이 기준 파일 다섯 개로 바꿨다(계획 1절 2번). 다음부터는 이 위에 새 파일을 더한다.
--
-- 공통 규칙
-- - 시각은 모두 ms epoch(bigint). 앱과 같다.
-- - 서버 id는 uuid. 2판 기기는 uuid를 만들어 그대로 쓴다. 1.1.0 기기가 만든 id('1730000000000-ab12cd34' 같은 글자)는
--   client_id에 그대로 두고, 서버 id는 private.v1_id(사용자, 종류, 그 id)로 정한다(20261105000003_api_v1.sql).
--   그래서 두 사용자가 같은 글자 id를 보내도 서로 다른 행이 된다.
-- - seq는 받아 오기 커서다. 행이 생기거나 바뀔 때마다 전역 순번 change_seq에서 새 번호를 받는다.
-- - 지운 행은 deleted_at으로 표시한다(받아 오기가 지운 것도 알 수 있게).
-- - 표는 RLS를 켜고 읽기만 준다. 쓰기는 모두 security definer RPC로만 한다.

create sequence if not exists public.change_seq; -- db reset --linked가 시퀀스를 남긴 적이 있다(PITFALLS, 2026-10-12)
revoke all on sequence public.change_seq from anon, authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.require_user() returns uuid language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return uid;
end $$;

create function private.now_ms() returns bigint language sql volatile set search_path = '' as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

-- 2판 RPC가 앱에 돌려주는 실패. 메시지가 곧 이유 낱말이다(예: 'full', 'closed'). 형식 오류는 22023을 따로 쓴다.
create function private.fail(code text) returns void language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = code;
end $$;

-- 사용자 한 명: 약관 동의, 만 14세 확인. 1.1.0 앱이 agreed_at을 직접 읽는다(app/account/connect.tsx). 지금과 같다.
create table public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text,
  terms_version integer,
  privacy_version integer,
  agreed_at bigint,
  age_confirmed_at bigint,
  created_at bigint not null
);

-- 목표 자체. 모든 멤버에게 같은 값이다. 사람마다 다른 값(순서, 기본 스티커, 완성)은 goal_members에 둔다.
create table public.goals (
  id uuid primary key,
  client_id text, -- 1.1.0 기기가 만든 id. 2판에서 만든 목표는 null
  owner_id uuid not null references auth.users(id) on delete cascade,
  -- 1.1.0 시험(deleteAccount.test.ts)이 goals.user_id로 찾는다. 같은 값을 따로 쓰지 않게 owner_id에서 만든다.
  user_id uuid generated always as (owner_id) stored,
  -- solo: 혼자, each: 각자 판에, one: 한 판에 같이, show: 내 목표 보여주기(아직 만드는 RPC 없음). 방식은 check 값만 늘린다.
  mode text not null default 'solo' check (mode in ('solo', 'each', 'one', 'show')),
  name text not null check (char_length(name) between 1 and 20),
  board_type text not null check (board_type in ('calendar', 'tally')),
  total_slots integer,
  initial_slots integer,
  end_date text,
  max_members integer not null default 1 check (max_members >= 1), -- 혼자 1, 함께 6. 인원 늘리기는 이 값만 바꾼다
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  seq bigint not null default nextval('public.change_seq')
);

-- 목표 안의 사람. 혼자 목표도 멤버 한 명(owner)이다.
create table public.goal_members (
  goal_id uuid not null references public.goals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member', 'viewer')),
  display_name text check (display_name is null or char_length(display_name) between 1 and 10), -- 혼자 목표, 나간 사람은 null
  sticker_id text check (char_length(sticker_id) <= 40), -- 그 사람의 기본 스티커. 1.1.0의 goals.default_sticker_id
  sort_order integer, -- 내 목표 목록 순서, 작을수록 위 (PRD 4.1)
  completed_at bigint,
  completion_seen integer not null default 0,
  last_placed_at bigint,
  joined_at bigint, -- 나간 사람은 null
  left_at bigint,
  left_reason text check (left_reason in ('left', 'kicked')), -- kicked는 같은 초대로 다시 들어오지 못한다
  updated_at bigint not null,
  deleted_at bigint,
  seq bigint not null default nextval('public.change_seq'),
  primary key (goal_id, user_id),
  -- 나가거나 내보내지면 goal_id, user_id, role, left_at, left_reason만 남기고 비운다(private.remove_member).
  -- left_reason이 남아야 내보내진 사람이 같은 초대로 다시 들어오지 못한다.
  check (left_at is not null or (joined_at is not null and (role = 'viewer' or sticker_id is not null))),
  check ((left_at is null) = (left_reason is null))
);
-- 나가지 않은 사람끼리 스티커가 겹치지 않는다. 혼자 목표는 한 명이라 해당 없음.
create unique index goal_members_sticker_once on public.goal_members (goal_id, sticker_id)
  where left_at is null and sticker_id is not null;
create unique index goal_members_one_owner on public.goal_members (goal_id) where role = 'owner' and left_at is null;
create index goal_members_user_active on public.goal_members (user_id, goal_id) where left_at is null;
create index goal_members_goal_seq on public.goal_members (goal_id, seq);
create index goal_members_user_seq on public.goal_members (user_id, seq);
create index goals_owner on public.goals (owner_id);

-- 판에 붙은 칸. board_user_id는 판 주인: 혼자 판과 각자 판은 붙인 사람, 한 판은 null.
create table public.stickers (
  id uuid primary key,
  client_id text,
  goal_id uuid not null,
  board_user_id uuid check (board_user_id is null or board_user_id = placed_by),
  placed_by uuid not null,
  slot_index integer not null,
  -- 붙인 날짜와 그때 기기 시간대(분, 한국 540). 달력 칸은 이 날짜로 정한다 (PRD 4.5)
  date_key date not null,
  tz_offset_min smallint not null,
  sticker_type text not null check (char_length(sticker_type) <= 40),
  placed_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  -- 칸 하나를 가리키는 값. 트리거가 채운다: 적립판 's<칸 번호>', 달력판 'd<날짜>', 한 판 달력은 'd<날짜>/<붙인 사람>'.
  -- 목표 행이 아직 없으면(같은 묶음 뒤쪽에 옴) null이고, 그 행은 칸 겹침 검사에서 빠진다.
  cell_key text,
  seq bigint not null default nextval('public.change_seq'),
  unique (id, placed_by),
  -- 붙인 사람이 그 목표의 멤버여야 한다. 한 묶음 안에서는 순서와 상관없이 묶음 끝에 검사한다(없으면 23503).
  -- 멤버 행이 지워지면(계정 삭제) 그 사람이 붙인 칸도 지워진다.
  foreign key (goal_id, placed_by) references public.goal_members (goal_id, user_id) on delete cascade deferrable initially deferred
);
-- 적립판 유일: (목표, 판 주인, 칸). 달력판: (목표, 판 주인, 날짜[, 붙인 사람]). 한 판 칸 겹침도 이것 하나로 막는다.
create unique index stickers_one_per_cell on public.stickers (goal_id, board_user_id, cell_key) nulls not distinct
  where deleted_at is null and cell_key is not null;
create index stickers_goal_seq on public.stickers (goal_id, seq);
create index stickers_placed_by_seq on public.stickers (placed_by, seq);

-- 칸에 남긴 사진과 메모. 지금은 늘 나만 본다(visibility 'self'). 나누기는 이 값과 RLS, 사진 정책만 바꾼다(계획 8절).
create table public.records (
  id uuid primary key,
  client_id text,
  sticker_id uuid not null,
  user_id uuid not null,
  memo text,
  photo_remote_path text,
  visibility text not null default 'self' check (visibility in ('self', 'members')),
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  seq bigint not null default nextval('public.change_seq'),
  -- 내가 붙인 칸에만 기록을 남긴다. 묶음 끝에 검사한다.
  foreign key (sticker_id, user_id) references public.stickers (id, placed_by) on delete cascade deferrable initially deferred
);
create index records_user_seq on public.records (user_id, seq);
create index records_sticker on public.records (sticker_id);

-- 행이 바뀔 때마다 새 순번
create function private.bump_seq() returns trigger language plpgsql set search_path = '' as $$
begin
  new.seq := nextval('public.change_seq');
  return new;
end $$;

create trigger goals_bump_seq before update on public.goals for each row execute function private.bump_seq();
create trigger goal_members_bump_seq before update on public.goal_members for each row execute function private.bump_seq();
create trigger stickers_bump_seq before update on public.stickers for each row execute function private.bump_seq();
create trigger records_bump_seq before update on public.records for each row execute function private.bump_seq();

-- 스티커를 쓰기 전에: 쓰는 사람이 나가지 않은 멤버인지, 판 주인이 방식에 맞는지, 칸 번호 범위(함께 목표), 칸 값(cell_key),
-- 한 판 달력의 하루 두 장 상한. 지우는 표시(deleted_at)만 남기는 쓰기는 검사하지 않는다.
-- 함께 목표에서 멤버가 아니거나 나갔으면 다른 검사보다 먼저 P0001 not_allowed로 거절한다(sync_push가 그 행만 not_allowed로 돌려준다).
-- 혼자 목표는 1.1.0과 같게 둔다: 멤버 행이 없으면 묶음 끝 외래 키 검사(23503), 칸 번호 범위는 보지 않는다.
create function private.stickers_before_write() returns trigger language plpgsql set search_path = '' as $$
declare
  g record;
  m record;
  taken integer;
begin
  select mode, board_type, total_slots into g from public.goals where id = new.goal_id;
  if not found then
    new.cell_key := null; -- 부모가 없으면 묶음 끝 외래 키 검사가 23503으로 거절한다
    return new;
  end if;
  new.cell_key := case g.board_type
    when 'tally' then 's' || new.slot_index
    else 'd' || to_char(new.date_key, 'YYYY-MM-DD') || case when g.mode = 'one' then '/' || new.placed_by::text else '' end
  end;
  if new.deleted_at is not null then return new; end if;
  select role, left_at into m from public.goal_members where goal_id = new.goal_id and user_id = new.placed_by;
  if g.mode <> 'solo' then
    if not found or m.left_at is not null or m.role = 'viewer' then
      raise exception using errcode = 'P0001', message = 'not_allowed';
    end if;
    -- 칸 번호는 0부터(src/domain/board.ts). 적립판은 칸 수 안, 달력판은 그 달의 날짜 - 1.
    if new.slot_index < 0 or (g.board_type = 'tally' and new.slot_index >= coalesce(g.total_slots, 0))
       or (g.board_type = 'calendar' and new.slot_index > 30) then
      raise exception using errcode = '22023', message = 'invalid_input';
    end if;
  elsif found and (m.left_at is not null or m.role = 'viewer') then
    raise exception 'not an active member' using errcode = '23503';
  end if;
  if (g.mode = 'one') <> (new.board_user_id is null) then
    raise exception 'board owner does not match goal mode' using errcode = '23514';
  end if;
  if g.mode = 'one' and g.board_type = 'calendar' then
    -- 같은 날 두 장까지 (PRD 4.15). 동시에 붙여도 하나씩 세도록 목표 행을 잠근다.
    perform 1 from public.goals where id = new.goal_id for update;
    select count(*) into taken from public.stickers
      where goal_id = new.goal_id and date_key = new.date_key and deleted_at is null and id <> new.id;
    if taken >= 2 then raise exception 'day_full' using errcode = '23505'; end if;
  end if;
  return new;
end $$;

create trigger stickers_check before insert or update on public.stickers
  for each row execute function private.stickers_before_write();

-- 읽기 권한의 바탕: 내가 이 목표의 나가지 않은 멤버인가. 정책에서 부르므로 security definer(멤버 표의 RLS를 다시 타지 않게).
create function private.can_see_goal(p_goal uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.goal_members
    where goal_id = p_goal and user_id = (select auth.uid()) and left_at is null
  );
$$;

-- RLS를 켠다. 정책이 없으면 아무도 읽지 못한다. 목표 정책은 20261105000002_sharing.sql. 멤버와 스티커는 정책도 읽기 권한도 없다(아래).
alter table public.accounts enable row level security;
alter table public.goals enable row level security;
alter table public.goal_members enable row level security;
alter table public.stickers enable row level security;
alter table public.records enable row level security;
create policy accounts_own on public.accounts for select to authenticated using (user_id = (select auth.uid()));
-- 기록은 내 것만. 나중에 visibility = 'members'면 can_see_goal과 차단 확인(private.blocked_between)으로 넓힌다.
create policy records_own on public.records for select to authenticated using (user_id = (select auth.uid()));

-- 권한을 직접 준다(프로젝트의 "새 테이블 자동 공개"를 꺼 둔다). 로그인한 사용자는 읽기만, 쓰기는 RPC로만.
-- 다른 사람의 멤버 행과 칸은 표로 직접 읽지 못한다. 차단과 나간 사람 가리기는 sync_pull, pull_goal에서만 한다(보안 검토 2026-11-04).
-- 1.1.0 앱이 표를 직접 읽는 곳은 accounts.agreed_at 하나다(app/account/connect.tsx). goals와 records 읽기는 1.1.0 서버 시험이 쓴다.
revoke all on public.accounts, public.goals, public.goal_members, public.stickers, public.records from anon, authenticated;
grant select on public.accounts, public.goals, public.records to authenticated;
grant select, insert, update, delete on public.accounts, public.goals, public.goal_members, public.stickers, public.records to service_role;
