-- 함께 목표 서버 고침 묶음 (2026-11-05). 앞 파일(20261105000001~5)은 이미 올라가 있어 고치지 않고 여기서 바꾼다.
-- 1. 내보낸 사람도 유효한 초대 링크로 다시 들어온다(join_goal). 차단은 그대로 막는다.
-- 2. 스티커 id는 앱의 스티커 id 규칙에 맞아야 한다(private.check_sticker).
-- 3. 서버에서 지운 기록의 사진 파일을 지운다(private.photo_trash, 기록 삭제 트리거, Edge Function purge-photos).
-- 4. 마지막 사람이 나가 목표를 지울 때 그 목표에 있던 사람마다 나감 표시를 남긴다(private.goal_exits, hand_off, sync_pull).
-- 5. 신고할 때 그때의 대상 이름을 남긴다(reports.target_name, report).

-- ───────────── 1. 내보낸 사람 다시 들어오기 ─────────────
-- 사용자 결정(2026-11-05): 「내보낸 사람도 제한 없이 다시 링크로 입장할 수 있도록 해」.
-- 다시 못 들어오게 하려면 만든 사람이 초대 링크를 새로 만든다(rotate_invite, 옛 링크는 closed). 앱의 내보내기 설명이 이 방법을 알려 준다.
-- left_reason('left', 'kicked')은 남기지만 들어가기를 막는 데 쓰지 않는다. core.sql의 「kicked는 다시 들어오지 못한다」 주석은 이 파일로 바뀌었다.
comment on column public.goal_members.left_reason is
  '나간 이유: left(나감), kicked(내보내짐). 들어가기를 막지 않는다(20261105000006). 다시 못 들어오게 하는 방법은 초대 링크 새로 만들기.';
comment on function public.kick_member(uuid, uuid) is
  '만든 사람만: 내보내기. 내보내진 사람도 유효한 초대 링크가 있으면 다시 들어온다(20261105000006). 막으려면 rotate_invite.';

-- 초대로 들어간다. 이미 멤버면 그대로 성공. 실패는 오류가 아니라 값으로 돌려준다(시도 기록을 남겨야 해서).
-- 돌려주는 것: 성공 {goal_id}, 실패 {error}. error: rate_limited(1시간에 20번 넘게 시도), closed(없는 코드, 끈 코드,
-- 지운 목표, 만든 사람과 차단 관계), full, invalid_name, name_not_allowed, invalid_sticker, sticker_taken.
-- 내보내진 사람도 다른 사람과 똑같이 들어온다. 들어간 뒤 앱은 pull_goal을 부른다.
create or replace function public.join_goal(p_code text, p_display_name text, p_sticker_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := private.now_ms();
  i public.invites;
  g public.goals;
  m public.goal_members;
  v_name text;
begin
  delete from private.join_attempts where user_id = uid and attempted_at < now_ms - 3600000;
  if (select count(*) from private.join_attempts where user_id = uid) >= 20 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  insert into private.join_attempts (user_id, attempted_at) values (uid, now_ms);

  select * into i from public.invites where code = upper(btrim(coalesce(p_code, ''))) and revoked_at is null;
  if not found then return jsonb_build_object('error', 'closed'); end if;
  select * into g from public.goals where id = i.goal_id for update; -- 자리 세기와 넣기를 한 사람씩
  if g.deleted_at is not null or g.mode not in ('each', 'one') then return jsonb_build_object('error', 'closed'); end if;
  select * into m from public.goal_members where goal_id = g.id and user_id = uid;
  if found and m.left_at is null then return jsonb_build_object('goal_id', g.id); end if;
  if private.blocked_between(uid, g.owner_id) then return jsonb_build_object('error', 'closed'); end if;
  if (select count(*) from public.goal_members where goal_id = g.id and left_at is null) >= g.max_members then
    return jsonb_build_object('error', 'full');
  end if;
  begin
    v_name := private.clean_name(p_display_name, 10);
    perform private.check_sticker(p_sticker_id);
  exception when invalid_parameter_value or raise_exception then
    return jsonb_build_object('error', sqlerrm);
  end;
  if exists (select 1 from public.goal_members where goal_id = g.id and left_at is null and sticker_id = p_sticker_id) then
    return jsonb_build_object('error', 'sticker_taken');
  end if;
  insert into public.goal_members as t (goal_id, user_id, role, display_name, sticker_id, joined_at, updated_at)
  values (g.id, uid, 'member', v_name, p_sticker_id, now_ms, now_ms)
  on conflict (goal_id, user_id) do update set
    role = 'member', display_name = excluded.display_name, sticker_id = excluded.sticker_id, sort_order = null,
    completed_at = null, completion_seen = 0, last_placed_at = null, joined_at = excluded.joined_at,
    left_at = null, left_reason = null, updated_at = excluded.updated_at, deleted_at = null;
  perform private.save_member_defaults(uid, v_name, p_sticker_id);
  return jsonb_build_object('goal_id', g.id);
end $$;

-- ───────────── 2. 스티커 id 검사 ─────────────
-- 앱의 스티커 id(src/stickers/color/catalog.ts, src/stickers/stickerIds.ts)와 같은 규칙:
-- - 컬러 스티커 '<묶음>.<이름>'. 묶음은 colorStickerPacks의 id, 이름은 영문 소문자로 시작하고 소문자, 숫자, 밑줄.
-- - 1.0의 흑백 id 6개(sprout, cat, star, flower, book, shoe). 앱이 읽을 때 basic.<id>로 바꾼다(normalizeStickerId).
-- 묶음 안에 스티커를 더하는 것은 이 규칙을 바꾸지 않는다. 새 묶음을 더하면 이 목록에 묶음 id를 더하는 새 마이그레이션이 필요하다.
-- 목록 하나하나를 서버에 두지 않은 이유: 앱이 스티커를 더할 때마다 서버를 먼저 바꿔야 해서다(결정, 2026-11-05).
-- 틀리면 22023 invalid_sticker(앞 판과 같은 오류). create_shared_goal, join_goal, update_member가 쓴다. 1.1.0 혼자 목표와 sync_push 칸에는 걸지 않는다.
create or replace function private.check_sticker(p text) returns text language plpgsql immutable set search_path = '' as $$
begin
  if p is null or char_length(p) > 40 or not (
    p ~ '^(basic|sports_normal|snack_normal|objects_normal|animals_normal|emotions_normal|weather_normal|christmas_normal|study_normal|food_normal)\.[a-z][a-z0-9_]*$'
    or p in ('sprout', 'cat', 'star', 'flower', 'book', 'shoe')
  ) then
    raise exception using errcode = '22023', message = 'invalid_sticker';
  end if;
  return p;
end $$;

-- ───────────── 3. 지운 기록의 사진 파일 ─────────────
-- 처리방침의 파기 약속: 나가거나 내보내져 기록 행이 서버에서 지워지면 그 사진 파일도 지운다.
-- 저장소 파일은 SQL로 지울 수 없다(storage.protect_delete가 막고, 막지 않아도 행만 지워지고 파일은 남는다). 그래서 기록 행이
-- 지워질 때 경로를 이 표에 모으고, Edge Function purge-photos가 저장소 API로 지운 뒤 줄을 지운다. 앱은 나가기, 내보내기,
-- 차단이 끝나면 purge-photos를 부른다(src/app-data/sharedGoalActions.ts). 실패해도 줄이 남아 다음 호출이 지운다.
-- 기록 주인의 폴더({user_id}/파일, 한 단계)에 있는 경로만 모은다. 기록의 사진 경로는 기기가 올린 값이라, 남의 경로를 적어 둔
-- 기록이 지워져도 남의 파일을 지우지 않게 한다. 계정을 지우면 줄도 함께 지워진다(그 폴더는 delete-account가 비운다).
create table private.photo_trash (
  path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  queued_at bigint not null
);
create index photo_trash_queued on private.photo_trash (queued_at);

create function private.queue_record_photo() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.photo_remote_path is not null and old.photo_remote_path ~ ('^' || old.user_id::text || '/[^/]+$') then
    insert into private.photo_trash (path, user_id, queued_at) values (old.photo_remote_path, old.user_id, private.now_ms())
    on conflict (path) do nothing;
  end if;
  return old;
end $$;
-- 행을 지울 때만(표시 삭제 deleted_at은 앱이 사진을 직접 지운다). 칸이 지워져 외래 키로 따라 지워질 때도 불린다.
create trigger records_queue_photo after delete on public.records
  for each row execute function private.queue_record_photo();

-- purge-photos만 service_role로 부른다. 모은 경로를 오래된 것부터 p_limit개(1~1000) 돌려준다.
create function public.admin_take_photo_trash(p_limit int) returns text[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(t.path order by t.queued_at), '{}'::text[])
  from (select path, queued_at from private.photo_trash order by queued_at
        limit least(greatest(coalesce(p_limit, 100), 1), 1000)) t;
$$;

create function public.admin_clear_photo_trash(p_paths text[]) returns void
language sql security definer set search_path = '' as $$
  delete from private.photo_trash where path = any(p_paths);
$$;

-- ───────────── 4. 마지막 사람이 나갔을 때 나감 표시 ─────────────
-- 마지막 사람이 나가면 목표를 행째 지우고 멤버 행도 외래 키로 함께 지워져, 같은 계정의 다른 기기가 받을 신호가 없었다.
-- 목표를 지우기 전에 그 목표에 있던 사람마다 이 표에 한 줄을 남기고, sync_pull이 그 사람에게 나간 멤버 행 모양으로 보낸다.
-- 앱은 내 멤버 행의 left_at이 있으면 그 목표를 기기에서 지운다(src/sync/pull.ts applyMember). 앱은 바꾸지 않는다.
-- 목표 이름 같은 내용은 남기지 않고 id와 시각만 둔다. 지운 목표라 goals 외래 키는 없다. 계정을 지우면 함께 지워진다.
create table private.goal_exits (
  goal_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  left_at bigint not null,
  left_reason text not null check (left_reason in ('left', 'kicked')),
  seq bigint not null default nextval('public.change_seq'),
  primary key (goal_id, user_id)
);
create index goal_exits_user_seq on private.goal_exits (user_id, seq);

-- 만든 사람이 나가거나 계정을 지울 때: 가장 먼저 들어온 남은 멤버가 이어받는다.
-- 아무도 없으면 그 목표에 있던 사람마다 나감 표시를 남기고 목표를 지운다(초대, 멤버, 칸, 기록이 함께 지워진다).
create or replace function private.hand_off(p_goal uuid, p_leaving uuid) returns void language plpgsql set search_path = '' as $$
declare next_owner uuid;
begin
  if not exists (select 1 from public.goals where id = p_goal and owner_id = p_leaving) then return; end if;
  select user_id into next_owner from public.goal_members
    where goal_id = p_goal and user_id <> p_leaving and left_at is null and role <> 'viewer'
    order by joined_at, user_id limit 1;
  if next_owner is null then
    insert into private.goal_exits (goal_id, user_id, left_at, left_reason)
    select m.goal_id, m.user_id, coalesce(m.left_at, private.now_ms()), coalesce(m.left_reason, 'left')
      from public.goal_members m where m.goal_id = p_goal
    on conflict (goal_id, user_id) do update set
      left_at = excluded.left_at, left_reason = excluded.left_reason, seq = nextval('public.change_seq');
    delete from public.goals where id = p_goal;
    return;
  end if;
  update public.goal_members set role = 'member', updated_at = private.now_ms()
    where goal_id = p_goal and user_id = p_leaving and role = 'owner';
  update public.goal_members set role = 'owner', updated_at = private.now_ms() where goal_id = p_goal and user_id = next_owner;
  update public.goals set owner_id = next_owner, updated_at = private.now_ms() where id = p_goal;
end $$;

-- 바뀐 행 받기. 돌려주는 것: {rows: [{entity, row, deletedAt}], cursor, more}. entity: goal, member, sticker, record.
-- 다른 사람 멤버 행은 나가지 않았고 차단 관계가 아니면 member_json, 아니면 {goal_id, user_id, gone: true}.
-- 지운 목표의 내 나감 표시(goal_exits)는 나간 내 멤버 행과 같은 모양으로 보낸다(20261105000006).
create or replace function public.sync_pull(p_since bigint, p_limit int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lim int := least(greatest(coalesce(p_limit, 500), 1), 1000);
  result jsonb;
begin
  with my_goals as (
    select goal_id from public.goal_members where user_id = uid and left_at is null
  ),
  changed as (
    select 'goal' as entity, g.seq, g.deleted_at, private.goal_json(g) as row
      from public.goals g join my_goals mg on mg.goal_id = g.id where g.seq > p_since
    union all
    select 'member', m.seq, m.deleted_at, private.member_json(m, uid)
      from public.goal_members m where m.user_id = uid and m.seq > p_since
    union all
    select 'member', m.seq, null,
        case when m.left_at is null and not private.blocked_between(uid, m.user_id) then private.member_json(m, uid)
          else jsonb_build_object('goal_id', m.goal_id, 'user_id', m.user_id, 'gone', true) end
      from public.goal_members m join my_goals mg on mg.goal_id = m.goal_id
      where m.user_id <> uid and m.seq > p_since
    union all
    select 'member', e.seq, null, jsonb_build_object(
        'goal_id', e.goal_id, 'user_id', e.user_id, 'role', 'member', 'display_name', null, 'sticker_id', null,
        'joined_at', null, 'left_at', e.left_at, 'updated_at', e.left_at, 'sort_order', null, 'completed_at', null,
        'completion_seen', 0, 'last_placed_at', null, 'left_reason', e.left_reason)
      from private.goal_exits e where e.user_id = uid and e.seq > p_since
    union all
    select 'sticker', s.seq, s.deleted_at, private.sticker_json(s, uid)
      from public.stickers s join my_goals mg on mg.goal_id = s.goal_id
      where s.seq > p_since
        and (s.board_user_id is null or s.board_user_id = uid or not private.blocked_between(uid, s.board_user_id))
    union all
    select 'record', r.seq, r.deleted_at, private.record_json(r)
      from public.records r where r.user_id = uid and r.seq > p_since
  ),
  page as (select * from changed order by seq limit lim + 1),
  kept as (select * from page order by seq limit lim)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object('entity', entity, 'row', row, 'deletedAt', deleted_at) order by seq)
      from kept), '[]'::jsonb),
    'cursor', coalesce((select max(seq) from kept), p_since),
    'more', (select count(*) from page) > lim
  ) into result;
  return result;
end $$;

-- ───────────── 5. 신고할 때 대상 이름 ─────────────
-- 신고를 처리할 때 무엇을 신고했는지 알아야 하는데, 이름은 나중에 바뀌거나(update_member, update_goal) 나가면 지워진다.
-- 신고 당시의 이름을 함께 남긴다: 사람 신고는 그 목표에서 쓰던 이름(나갔으면 내가 차단할 때 남긴 이름), 목표 신고는 목표 이름.
-- 계정을 지워도 신고 행은 운영 처리를 위해 남는다(사람 id만 비운다, remove_user). 이 이름도 함께 남는다.
alter table public.reports add column target_name text check (char_length(target_name) <= 20);

-- 신고. 그 목표에 있었던 사람만, 대상은 그 목표에 있었던 사람(없으면 목표 자체). 사유 1~500자.
-- 실패: not_member, invalid_input. 알림 메일은 이 표의 insert에 웹훅으로 붙인다(아직 없음).
create or replace function public.report(p_goal_id uuid, p_target_user_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_name text;
begin
  if not exists (select 1 from public.goal_members where goal_id = p_goal_id and user_id = uid) then
    perform private.fail('not_member');
  end if;
  if p_target_user_id is not null and (p_target_user_id = uid or not exists (
    select 1 from public.goal_members where goal_id = p_goal_id and user_id = p_target_user_id)) then
    perform private.fail('not_member');
  end if;
  if char_length(v_reason) < 1 or char_length(v_reason) > 500 then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  if p_target_user_id is null then
    select name into v_name from public.goals where id = p_goal_id;
  else
    select coalesce(
      (select display_name from public.goal_members where goal_id = p_goal_id and user_id = p_target_user_id),
      (select display_name from public.blocks where blocker_id = uid and blocked_id = p_target_user_id)) into v_name;
  end if;
  insert into public.reports (goal_id, reporter_id, target_user_id, target_name, reason, created_at)
  values (p_goal_id, uid, p_target_user_id, v_name, v_reason, private.now_ms());
end $$;

-- ───────────── 권한 ─────────────
revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;
revoke execute on function public.admin_take_photo_trash(int), public.admin_clear_photo_trash(text[])
  from public, anon, authenticated;
grant execute on function public.admin_take_photo_trash(int), public.admin_clear_photo_trash(text[]) to service_role;
