-- 서버 2판 기준 파일 3/5: 1.1.0 호환 RPC (서버 2판 계획 2, 5절).
-- 이름, 인자, 입력과 출력 JSON은 이전 서버(20260930000002_sync_rpc.sql, 20261030000001_goal_sort_order.sql)와 같다.
-- 안쪽만 새 표로 옮겨 쓴다. 규칙도 같다(__tests__/support/syncServerContract.ts가 붙잡는다):
-- - 더 최근 updated_at 우선(같으면 덮어씀). 단 지운 목표는 updated_at이 같은 upsert로 되살아나지 않는다.
-- - 목표, 스티커 삭제는 딸린 행까지 표시. 다시 보내도 결과가 같다.
-- - 형식이 틀리면 22xxx, 부모가 없으면 23503. 앱은 22xxx, 23xxx만 "보류"로 본다(src/sync/supabaseServer.ts isRejection).
-- - sort_order 키가 없거나 null이면 저장된 순서를 지우지 않는다.
-- 1.1.0은 혼자 목표만 안다. 이 함수들은 내가 만든 혼자 목표(mode 'solo', owner = 나)와 거기 붙은 내 스티커, 내 기록만 다룬다.
-- 1.1.0 목표 행 하나 = goals 행(목표 자체) + 내 goal_members 행(순서, 기본 스티커, 완성, 마지막으로 붙인 시각).
-- p_device_id는 받기만 하고 저장하지 않는다(서버 2판 표에 device_id 칸이 없다. 한 번에 한 기기는 나중에 devices 표로, 계획 8절).

-- 1.1.0 기기 id → 서버 uuid. uuid 모양이면 그대로 쓰고(2판 기기가 만든 행, 워치 요청 id), 아니면 사용자와 종류를 섞어 정한다.
-- 같은 입력이면 늘 같은 값이라, 묶음 안에서 자식이 부모보다 먼저 와도 외래 키를 묶음 끝에 검사할 수 있다(이전과 같은 동작).
-- uuid 모양 id로 남의 행을 가리켜도 아래 쓰기 함수가 "내 행일 때만" 바꾸므로 아무 일도 일어나지 않는다.
-- 받아들인 위험(보안 검토 2026-11-04 낮음 4): md5 값은 비밀이 아니라 사용자 id와 기기 id를 알면 서버 id를 미리 계산할 수 있다.
-- 남의 행은 읽기(RLS, RPC 멤버 확인)와 쓰기("내 행일 때만") 모두 막혀 있어 id를 알아도 읽거나 고칠 수 없다.
-- 남은 위험: 누가 남의 서버 id(uuid 글자)로 먼저 자기 행을 만들어 두면, 그 사람이 나중에 같은 기기 id를 올릴 때 조용히 무시된다.
-- 하지만 그러려면 아직 만들지도 않은 기기 id를 알아야 하는데, 기기 id에는 무작위 8글자(src/repositories/ids.ts)나
-- 무작위 uuid(워치 요청)가 들어 있어 미리 알 수 없다. 그래서 그대로 둔다.
create function private.v1_id(p_user uuid, p_kind text, p_local text) returns uuid
language sql immutable set search_path = '' as $$
  select case
    when p_local is null then null
    when p_local ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then p_local::uuid
    else md5(p_user::text || '/' || p_kind || '/' || p_local)::uuid
  end;
$$;

-- 혼자 목표 한 줄(1.1.0 목표 행 모양)을 쓴다. 2판 sync_push의 goal도 이 함수를 쓴다.
-- 내 혼자 목표가 아닌 행이면 쓰지 않고 'not_allowed'를 돌려준다. force면 updated_at과 상관없이 쓴다(replace_all).
create function private.upsert_solo_goal(p_user uuid, p_id uuid, p_client text, r jsonb, force boolean)
returns text language plpgsql set search_path = '' as $$
declare
  -- 형변환을 먼저 해서, 형식이 틀리면 쓰기와 상관없이 22xxx로 거절한다(이전과 같다)
  v_name text := r->>'name';
  v_board text := r->>'board_type';
  v_total integer := (r->>'total_slots')::integer;
  v_sticker text := r->>'default_sticker_id';
  v_created bigint := (r->>'created_at')::bigint;
  v_end text := r->>'end_date';
  v_completed bigint := (r->>'completed_at')::bigint;
  v_seen integer := (r->>'completion_seen')::integer;
  v_last bigint := (r->>'last_placed_at')::bigint;
  v_initial integer := (r->>'initial_slots')::integer;
  v_updated bigint := (r->>'updated_at')::bigint;
  v_sort integer := (r->>'sort_order')::integer;
  inserted boolean;
  g public.goals;
  cur bigint;
begin
  if p_id is null then raise exception 'goal id required' using errcode = '23502'; end if;
  insert into public.goals (id, client_id, owner_id, mode, name, board_type, total_slots, initial_slots, end_date,
    max_members, created_at, updated_at)
  values (p_id, p_client, p_user, 'solo', v_name, v_board, v_total, v_initial, v_end, 1, v_created, v_updated)
  on conflict (id) do nothing
  returning true into inserted;
  if inserted then
    insert into public.goal_members (goal_id, user_id, role, sticker_id, sort_order, completed_at, completion_seen,
      last_placed_at, joined_at, updated_at)
    values (p_id, p_user, 'owner', v_sticker, v_sort, v_completed, v_seen, v_last, v_created, v_updated);
    return null;
  end if;

  select * into g from public.goals where id = p_id for update;
  if g.owner_id <> p_user or g.mode <> 'solo' then return 'not_allowed'; end if;
  select greatest(g.updated_at, m.updated_at) into cur from public.goal_members m where m.goal_id = p_id and m.user_id = p_user;
  cur := coalesce(cur, g.updated_at);
  -- updated_at이 같으면 지운 행을 되살리지 않는다. 삭제는 updated_at을 바꾸지 않아서, 다른 기기가 updated_at을 그대로 두고
  -- 모든 목표를 다시 올리면 지운 목표가 살아난다(20261030000001과 같은 규칙).
  if not (force or cur < v_updated or (cur = v_updated and g.deleted_at is null)) then return null; end if;

  update public.goals set
    name = v_name, board_type = v_board, total_slots = v_total, initial_slots = v_initial, end_date = v_end,
    created_at = v_created, updated_at = v_updated, deleted_at = null, client_id = coalesce(p_client, client_id)
  where id = p_id;
  insert into public.goal_members as t (goal_id, user_id, role, sticker_id, sort_order, completed_at, completion_seen,
    last_placed_at, joined_at, updated_at)
  values (p_id, p_user, 'owner', v_sticker, v_sort, v_completed, v_seen, v_last, v_created, v_updated)
  on conflict (goal_id, user_id) do update set
    sticker_id = excluded.sticker_id,
    -- 옛 앱(1.0)은 sort_order 없이 올린다. 그때는 저장된 순서를 지우지 않는다.
    sort_order = coalesce(excluded.sort_order, t.sort_order),
    completed_at = excluded.completed_at, completion_seen = excluded.completion_seen,
    last_placed_at = excluded.last_placed_at, updated_at = excluded.updated_at, deleted_at = null;
  return null;
end $$;

-- 스티커 한 줄. 붙인 사람은 나, 판 주인은 방식에 따라(한 판 null, 나머지 나). 내가 붙인 행이 아니면 'not_allowed'.
-- date_key가 날짜 형식이 아니면 22007로 거절된다. 같은 칸에 다른 스티커가 있으면 23505(1.1.0에서는 보류, 2판은 slot_taken).
create function private.upsert_sticker(p_user uuid, p_id uuid, p_goal uuid, p_client text, r jsonb, force boolean)
returns text language plpgsql set search_path = '' as $$
declare
  v_goal uuid := p_goal;
  v_slot integer := (r->>'slot_index')::integer;
  v_date date := (r->>'date_key')::date;
  v_tz smallint := (r->>'tz_offset_min')::smallint;
  v_type text := r->>'sticker_type';
  v_placed bigint := (r->>'placed_at')::bigint;
  v_updated bigint := (r->>'updated_at')::bigint;
  v_board uuid;
  applied boolean;
begin
  v_board := case when (select mode from public.goals where id = v_goal) = 'one' then null else p_user end;
  insert into public.stickers as t (id, client_id, goal_id, board_user_id, placed_by, slot_index, date_key, tz_offset_min,
    sticker_type, placed_at, updated_at, deleted_at)
  values (p_id, p_client, v_goal, v_board, p_user, v_slot, v_date, v_tz, v_type, v_placed, v_updated, null)
  on conflict (id) do update set
    goal_id = excluded.goal_id, board_user_id = excluded.board_user_id, slot_index = excluded.slot_index,
    date_key = excluded.date_key, tz_offset_min = excluded.tz_offset_min, sticker_type = excluded.sticker_type,
    placed_at = excluded.placed_at, updated_at = excluded.updated_at, deleted_at = null,
    client_id = coalesce(excluded.client_id, t.client_id)
  where t.placed_by = p_user and (force or t.updated_at <= excluded.updated_at)
  returning true into applied;
  if applied is null and exists (select 1 from public.stickers where id = p_id and placed_by <> p_user) then
    return 'not_allowed';
  end if;
  return null;
end $$;

-- 기록 한 줄. 늘 내 것(visibility는 바꾸지 않는다).
create function private.upsert_record(p_user uuid, p_id uuid, p_sticker uuid, p_client text, r jsonb, force boolean)
returns text language plpgsql set search_path = '' as $$
declare
  v_sticker uuid := p_sticker;
  v_memo text := r->>'memo';
  v_photo text := r->>'photo_remote_path';
  v_created bigint := (r->>'created_at')::bigint;
  v_updated bigint := (r->>'updated_at')::bigint;
  applied boolean;
begin
  insert into public.records as t (id, client_id, sticker_id, user_id, memo, photo_remote_path, created_at, updated_at, deleted_at)
  values (p_id, p_client, v_sticker, p_user, v_memo, v_photo, v_created, v_updated, null)
  on conflict (id) do update set
    sticker_id = excluded.sticker_id, memo = excluded.memo, photo_remote_path = excluded.photo_remote_path,
    created_at = excluded.created_at, updated_at = excluded.updated_at, deleted_at = null,
    client_id = coalesce(excluded.client_id, t.client_id)
  where t.user_id = p_user and (force or t.updated_at <= excluded.updated_at)
  returning true into applied;
  if applied is null and exists (select 1 from public.records where id = p_id and user_id <> p_user) then
    return 'not_allowed';
  end if;
  return null;
end $$;

-- 삭제 표시. 이미 표시된 행은 건드리지 않아 다시 보내도 seq가 바뀌지 않는다. 내 행이 아니면 'not_allowed'.
create function private.delete_solo_goal(p_user uuid, p_id uuid, at bigint) returns text
language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from public.goals where id = p_id) then return null; end if;
  if not exists (select 1 from public.goals where id = p_id and owner_id = p_user and mode = 'solo') then return 'not_allowed'; end if;
  update public.goals set deleted_at = at where id = p_id and deleted_at is null;
  update public.records set deleted_at = at where user_id = p_user and deleted_at is null
    and sticker_id in (select id from public.stickers where goal_id = p_id);
  update public.stickers set deleted_at = at where goal_id = p_id and deleted_at is null;
  return null;
end $$;

create function private.delete_sticker(p_user uuid, p_id uuid, at bigint) returns text
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.stickers where id = p_id and placed_by <> p_user) then return 'not_allowed'; end if;
  update public.stickers set deleted_at = at where id = p_id and placed_by = p_user and deleted_at is null;
  update public.records set deleted_at = at where user_id = p_user and sticker_id = p_id and deleted_at is null;
  return null;
end $$;

create function private.delete_record(p_user uuid, p_id uuid, at bigint) returns text
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.records where id = p_id and user_id <> p_user) then return 'not_allowed'; end if;
  update public.records set deleted_at = at where id = p_id and user_id = p_user and deleted_at is null;
  return null;
end $$;

-- 1.1.0 행 하나를 쓴다. 남의 행을 가리키면 조용히 넘어간다(이전 서버에서도 남의 행은 건드릴 수 없었다).
create function private.v1_upsert(uid uuid, entity text, r jsonb, force boolean) returns void
language plpgsql set search_path = '' as $$
begin
  if entity = 'goal' then
    perform private.upsert_solo_goal(uid, private.v1_id(uid, 'goal', r->>'id'), r->>'id', r, force);
  elsif entity = 'sticker' then
    perform private.upsert_sticker(uid, private.v1_id(uid, 'sticker', r->>'id'), private.v1_id(uid, 'goal', r->>'goal_id'),
      r->>'id', r, force);
  elsif entity = 'record' then
    perform private.upsert_record(uid, private.v1_id(uid, 'record', r->>'id'), private.v1_id(uid, 'sticker', r->>'sticker_id'),
      r->>'id', r, force);
  else
    raise exception 'unknown entity %', entity using errcode = '22023';
  end if;
end $$;

create function private.v1_delete(uid uuid, entity text, target text, at bigint) returns void
language plpgsql set search_path = '' as $$
begin
  if target is null or at is null then raise exception 'delete needs id and deletedAt' using errcode = '22023'; end if;
  if entity = 'goal' then
    perform private.delete_solo_goal(uid, private.v1_id(uid, 'goal', target), at);
  elsif entity = 'sticker' then
    perform private.delete_sticker(uid, private.v1_id(uid, 'sticker', target), at);
  elsif entity = 'record' then
    perform private.delete_record(uid, private.v1_id(uid, 'record', target), at);
  else
    raise exception 'unknown entity %', entity using errcode = '22023';
  end if;
end $$;

create function public.push_changes(p_device_id text, p_changes jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c jsonb;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'changes must be an array' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    if c->>'op' = 'upsert' then
      perform private.v1_upsert(uid, c->>'entity', c->'row', false);
    elsif c->>'op' = 'delete' then
      perform private.v1_delete(uid, c->>'entity', c->>'id', (c->>'deletedAt')::bigint);
    else
      raise exception 'unknown op %', c->>'op' using errcode = '22023';
    end if;
  end loop;
  -- 부모 확인(외래 키)을 이 호출 안에서 끝낸다. 오류가 23503으로 이 RPC의 응답에 실린다.
  set constraints all immediate;
end $$;

-- 내 혼자 목표를 1.1.0 행 모양 그대로. id는 기기가 보낸 글자(client_id), 2판에서 만든 행이면 uuid 글자.
-- 함께 목표는 보내지 않는다(1.1.0은 모른다).
create function public.pull_changes(p_since bigint, p_limit int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lim int := least(greatest(coalesce(p_limit, 500), 1), 1000);
  result jsonb;
begin
  with mine as (
    select g.*, m.sticker_id, m.sort_order, m.completed_at, m.completion_seen, m.last_placed_at,
      greatest(g.updated_at, m.updated_at) as merged_updated_at, greatest(g.seq, m.seq) as merged_seq
    from public.goals g join public.goal_members m on m.goal_id = g.id and m.user_id = uid
    where g.owner_id = uid and g.mode = 'solo'
  ),
  changed as (
    select 'goal' as entity, merged_seq as seq, deleted_at, jsonb_build_object(
        'id', coalesce(client_id, id::text), 'name', name, 'board_type', board_type, 'total_slots', total_slots,
        'default_sticker_id', sticker_id, 'created_at', created_at, 'end_date', end_date,
        'completed_at', completed_at, 'completion_seen', completion_seen, 'last_placed_at', last_placed_at,
        'initial_slots', initial_slots, 'updated_at', merged_updated_at, 'sort_order', sort_order) as row
      from mine where merged_seq > p_since
    union all
    select 'sticker', s.seq, s.deleted_at, jsonb_build_object(
        'id', coalesce(s.client_id, s.id::text), 'goal_id', coalesce(g.client_id, g.id::text), 'placed_at', s.placed_at,
        'slot_index', s.slot_index, 'sticker_type', s.sticker_type, 'updated_at', s.updated_at,
        'date_key', to_char(s.date_key, 'YYYY-MM-DD'), 'tz_offset_min', s.tz_offset_min)
      from public.stickers s join mine g on g.id = s.goal_id
      where s.placed_by = uid and s.seq > p_since
    union all
    select 'record', r.seq, r.deleted_at, jsonb_build_object(
        'id', coalesce(r.client_id, r.id::text), 'sticker_id', coalesce(s.client_id, s.id::text), 'memo', r.memo,
        'photo_remote_path', r.photo_remote_path, 'created_at', r.created_at, 'updated_at', r.updated_at)
      from public.records r join public.stickers s on s.id = r.sticker_id join mine g on g.id = s.goal_id
      where r.user_id = uid and r.seq > p_since
  ),
  page as (select * from changed order by seq limit lim + 1),
  kept as (select * from page order by seq limit lim)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object('entity', entity, 'row', row, 'deletedAt', deleted_at) order by seq) from kept), '[]'::jsonb),
    'cursor', coalesce((select max(seq) from kept), p_since),
    'more', (select count(*) from page) > lim
  ) into result;
  return result;
end $$;

create function public.server_state() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  return (
    with mine as (
      select g.id, greatest(g.updated_at, m.updated_at) as updated_at
      from public.goals g join public.goal_members m on m.goal_id = g.id and m.user_id = uid
      where g.owner_id = uid and g.mode = 'solo' and g.deleted_at is null
    )
    select jsonb_build_object(
      'goals', (select count(*) from mine),
      'lastUpdatedAt', (select max(u) from (
        select max(updated_at) as u from mine
        union all select max(s.updated_at) from public.stickers s join mine g on g.id = s.goal_id
          where s.placed_by = uid and s.deleted_at is null
        union all select max(r.updated_at) from public.records r join public.stickers s on s.id = r.sticker_id
          join mine g on g.id = s.goal_id where r.user_id = uid and r.deleted_at is null) t))
  );
end $$;

-- "이 기기 기록 유지": 내 혼자 목표와 거기 딸린 내 스티커, 기록을 모두 지운 표시 뒤 보낸 행을 쓴다(한 트랜잭션).
create function public.replace_all(p_device_id text, p_rows jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := private.now_ms();
  r jsonb;
begin
  update public.goals set deleted_at = now_ms where owner_id = uid and mode = 'solo' and deleted_at is null;
  update public.stickers s set deleted_at = now_ms from public.goals g
    where g.id = s.goal_id and g.owner_id = uid and g.mode = 'solo' and s.placed_by = uid and s.deleted_at is null;
  update public.records r set deleted_at = now_ms from public.stickers s, public.goals g
    where s.id = r.sticker_id and g.id = s.goal_id and g.owner_id = uid and g.mode = 'solo'
      and r.user_id = uid and r.deleted_at is null;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'goals', '[]'::jsonb)) loop
    perform private.v1_upsert(uid, 'goal', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'stickers', '[]'::jsonb)) loop
    perform private.v1_upsert(uid, 'sticker', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'records', '[]'::jsonb)) loop
    perform private.v1_upsert(uid, 'record', r, true);
  end loop;
  set constraints all immediate;
end $$;

create function public.record_consent(p_terms_version int, p_privacy_version int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := private.now_ms();
begin
  if p_terms_version is null or p_privacy_version is null then
    raise exception 'versions required' using errcode = '22023';
  end if;
  insert into public.accounts (user_id, provider, terms_version, privacy_version, agreed_at, age_confirmed_at, created_at)
  values (uid, (select raw_app_meta_data->>'provider' from auth.users where id = uid),
    p_terms_version, p_privacy_version, now_ms, now_ms, now_ms)
  on conflict (user_id) do update set
    terms_version = excluded.terms_version, privacy_version = excluded.privacy_version,
    agreed_at = excluded.agreed_at, age_confirmed_at = excluded.age_confirmed_at;
end $$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;
revoke execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) from public, anon;
grant execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) to authenticated;
