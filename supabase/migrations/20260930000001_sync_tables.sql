-- 백업 서버 테이블 (계정·백업 설계 ③). 컬럼은 기기 DB와 같다. 시각은 모두 ms epoch(bigint).
-- PK는 (user_id, id): 기기가 만든 id가 다른 사용자와 겹쳐도 서로 건드리지 않는다.
-- seq는 pull_changes 커서다. 행이 바뀔 때마다 새 번호를 받는다.

create sequence if not exists public.change_seq; -- db reset --linked가 시퀀스는 남긴다(2026-10-12)

create table public.goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  name text not null,
  board_type text not null check (board_type in ('calendar', 'tally')),
  total_slots integer,
  default_sticker_id text not null,
  created_at bigint not null,
  end_date text,
  completed_at bigint,
  completion_seen integer not null default 0,
  last_placed_at bigint,
  initial_slots integer,
  updated_at bigint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id)
);

create table public.stickers (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  goal_id text not null,
  placed_at bigint not null,
  slot_index integer not null,
  sticker_type text not null,
  updated_at bigint not null,
  -- 붙인 날짜와 그때 기기 시간대(분, 한국 540). 달력 칸은 이 날짜로 정한다 (PRD 4.5)
  date_key date not null,
  tz_offset_min smallint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id),
  -- 한 묶음 안에서는 순서와 상관없이 묶음 끝에 검사한다
  foreign key (user_id, goal_id) references public.goals (user_id, id) deferrable initially deferred
);

create table public.records (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  sticker_id text not null,
  memo text,
  photo_remote_path text,
  created_at bigint not null,
  updated_at bigint not null,
  deleted_at bigint,
  device_id text,
  seq bigint not null default nextval('public.change_seq'),
  primary key (user_id, id),
  foreign key (user_id, sticker_id) references public.stickers (user_id, id) deferrable initially deferred
);

create index goals_user_seq on public.goals (user_id, seq);
create index stickers_user_seq on public.stickers (user_id, seq);
create index records_user_seq on public.records (user_id, seq);
create index stickers_user_goal on public.stickers (user_id, goal_id);
create index records_user_sticker on public.records (user_id, sticker_id);

create function public.bump_seq() returns trigger language plpgsql set search_path = '' as $$
begin
  new.seq := nextval('public.change_seq');
  return new;
end $$;

create trigger goals_bump_seq before update on public.goals for each row execute function public.bump_seq();
create trigger stickers_bump_seq before update on public.stickers for each row execute function public.bump_seq();
create trigger records_bump_seq before update on public.records for each row execute function public.bump_seq();

create table public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text,
  terms_version integer,
  privacy_version integer,
  agreed_at bigint,
  age_confirmed_at bigint,
  created_at bigint not null
);

create schema if not exists private;
create table private.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null
);
-- 카카오 연결 해제 웹훅이 다시 시도해도 지우지 못한 회원. 운영자가 웹훅을 다시 보내 지우면 줄도 사라진다.
create table private.kakao_unlink_failures (
  kakao_id text primary key,
  referrer text not null,
  step text not null,
  failed_at timestamptz not null default now()
);
revoke all on schema private from anon, authenticated;

-- 읽기는 자기 행만. 쓰기 정책을 만들지 않고 권한도 거둬 테이블 직접 쓰기를 막는다(RPC만 쓴다).
alter table public.goals enable row level security;
alter table public.stickers enable row level security;
alter table public.records enable row level security;
alter table public.accounts enable row level security;
create policy goals_own on public.goals for select to authenticated using (user_id = (select auth.uid()));
create policy stickers_own on public.stickers for select to authenticated using (user_id = (select auth.uid()));
create policy records_own on public.records for select to authenticated using (user_id = (select auth.uid()));
create policy accounts_own on public.accounts for select to authenticated using (user_id = (select auth.uid()));
-- 권한을 직접 준다(프로젝트의 "새 테이블 자동 공개"를 꺼 둔다). 로그인한 사용자는 읽기만, 쓰기는 RPC로만.
revoke all on public.goals, public.stickers, public.records, public.accounts from anon, authenticated;
grant select on public.goals, public.stickers, public.records, public.accounts to authenticated;
grant select, insert, update, delete on public.goals, public.stickers, public.records, public.accounts to service_role;
