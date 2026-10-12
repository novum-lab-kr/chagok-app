-- 동기화 RPC (계정·백업 설계 ③). 규칙은 FakeServer(__tests__/support/fakeServer.ts)와 같다:
-- 더 최근 updated_at 우선(같으면 덮어씀), 목표·스티커 삭제는 딸린 행까지 표식, 멱등.
-- 형식이 틀리면 22xxx, 부모가 없으면 23503 — 앱은 이것만 "보류"로 본다.

create function private.require_user() returns uuid language plpgsql stable set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in' using errcode = '42501'; end if;
  return uid;
end $$;

-- 행 하나 upsert. force면 updated_at과 상관없이 쓴다(replace_all).
create function private.apply_upsert(uid uuid, device text, entity text, r jsonb, force boolean)
returns void language plpgsql set search_path = '' as $$
begin
  if entity = 'goal' then
    insert into public.goals as t (user_id, id, name, board_type, total_slots, default_sticker_id, created_at, end_date,
      completed_at, completion_seen, last_placed_at, initial_slots, updated_at, deleted_at, device_id)
    values (uid, r->>'id', r->>'name', r->>'board_type', (r->>'total_slots')::int, r->>'default_sticker_id',
      (r->>'created_at')::bigint, r->>'end_date', (r->>'completed_at')::bigint, (r->>'completion_seen')::int,
      (r->>'last_placed_at')::bigint, (r->>'initial_slots')::int, (r->>'updated_at')::bigint, null, device)
    on conflict (user_id, id) do update set
      name = excluded.name, board_type = excluded.board_type, total_slots = excluded.total_slots,
      default_sticker_id = excluded.default_sticker_id, created_at = excluded.created_at, end_date = excluded.end_date,
      completed_at = excluded.completed_at, completion_seen = excluded.completion_seen,
      last_placed_at = excluded.last_placed_at, initial_slots = excluded.initial_slots,
      updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id
    where force or t.updated_at <= excluded.updated_at;
  elsif entity = 'sticker' then
    -- date_key가 날짜 형식이 아니면 22007로 거절된다(앱은 22xxx를 "보류"로 본다).
    insert into public.stickers as t (user_id, id, goal_id, placed_at, slot_index, sticker_type, updated_at, deleted_at, device_id,
      date_key, tz_offset_min)
    values (uid, r->>'id', r->>'goal_id', (r->>'placed_at')::bigint, (r->>'slot_index')::int, r->>'sticker_type',
      (r->>'updated_at')::bigint, null, device, (r->>'date_key')::date, (r->>'tz_offset_min')::smallint)
    on conflict (user_id, id) do update set
      goal_id = excluded.goal_id, placed_at = excluded.placed_at, slot_index = excluded.slot_index,
      sticker_type = excluded.sticker_type, updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id,
      date_key = excluded.date_key, tz_offset_min = excluded.tz_offset_min
    where force or t.updated_at <= excluded.updated_at;
  elsif entity = 'record' then
    insert into public.records as t (user_id, id, sticker_id, memo, photo_remote_path, created_at, updated_at, deleted_at, device_id)
    values (uid, r->>'id', r->>'sticker_id', r->>'memo', r->>'photo_remote_path', (r->>'created_at')::bigint,
      (r->>'updated_at')::bigint, null, device)
    on conflict (user_id, id) do update set
      sticker_id = excluded.sticker_id, memo = excluded.memo, photo_remote_path = excluded.photo_remote_path,
      created_at = excluded.created_at, updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id
    where force or t.updated_at <= excluded.updated_at;
  else
    raise exception 'unknown entity %', entity using errcode = '22023';
  end if;
end $$;

-- 삭제 표식. 이미 표식된 행은 건드리지 않아 다시 보내도 seq가 바뀌지 않는다.
create function private.apply_delete(uid uuid, device text, entity text, target text, at bigint)
returns void language plpgsql set search_path = '' as $$
begin
  if target is null or at is null then raise exception 'delete needs id and deletedAt' using errcode = '22023'; end if;
  if entity = 'goal' then
    update public.goals set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
    update public.records set deleted_at = at where user_id = uid and deleted_at is null
      and sticker_id in (select id from public.stickers where user_id = uid and goal_id = target);
    update public.stickers set deleted_at = at where user_id = uid and goal_id = target and deleted_at is null;
  elsif entity = 'sticker' then
    update public.stickers set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
    update public.records set deleted_at = at where user_id = uid and sticker_id = target and deleted_at is null;
  elsif entity = 'record' then
    update public.records set deleted_at = at, device_id = device where user_id = uid and id = target and deleted_at is null;
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
      perform private.apply_upsert(uid, p_device_id, c->>'entity', c->'row', false);
    elsif c->>'op' = 'delete' then
      perform private.apply_delete(uid, p_device_id, c->>'entity', c->>'id', (c->>'deletedAt')::bigint);
    else
      raise exception 'unknown op %', c->>'op' using errcode = '22023';
    end if;
  end loop;
  -- 부모 확인(외래키)을 이 호출 안에서 끝낸다. 오류가 23503으로 이 RPC의 응답에 실린다.
  set constraints all immediate;
end $$;

create function public.pull_changes(p_since bigint, p_limit int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  lim int := least(greatest(coalesce(p_limit, 500), 1), 1000);
  result jsonb;
begin
  with changed as (
    select 'goal' as entity, seq, deleted_at, jsonb_build_object(
        'id', id, 'name', name, 'board_type', board_type, 'total_slots', total_slots,
        'default_sticker_id', default_sticker_id, 'created_at', created_at, 'end_date', end_date,
        'completed_at', completed_at, 'completion_seen', completion_seen, 'last_placed_at', last_placed_at,
        'initial_slots', initial_slots, 'updated_at', updated_at) as row
      from public.goals where user_id = uid and seq > p_since
    union all
    select 'sticker', seq, deleted_at, jsonb_build_object(
        'id', id, 'goal_id', goal_id, 'placed_at', placed_at, 'slot_index', slot_index,
        'sticker_type', sticker_type, 'updated_at', updated_at,
        'date_key', to_char(date_key, 'YYYY-MM-DD'), 'tz_offset_min', tz_offset_min)
      from public.stickers where user_id = uid and seq > p_since
    union all
    select 'record', seq, deleted_at, jsonb_build_object(
        'id', id, 'sticker_id', sticker_id, 'memo', memo, 'photo_remote_path', photo_remote_path,
        'created_at', created_at, 'updated_at', updated_at)
      from public.records where user_id = uid and seq > p_since
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
  return jsonb_build_object(
    'goals', (select count(*) from public.goals where user_id = uid and deleted_at is null),
    'lastUpdatedAt', (select max(u) from (
      select max(updated_at) as u from public.goals where user_id = uid and deleted_at is null
      union all select max(updated_at) from public.stickers where user_id = uid and deleted_at is null
      union all select max(updated_at) from public.records where user_id = uid and deleted_at is null) t));
end $$;

create function public.replace_all(p_device_id text, p_rows jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  r jsonb;
begin
  update public.goals set deleted_at = now_ms where user_id = uid and deleted_at is null;
  update public.stickers set deleted_at = now_ms where user_id = uid and deleted_at is null;
  update public.records set deleted_at = now_ms where user_id = uid and deleted_at is null;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'goals', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'goal', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'stickers', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'sticker', r, true);
  end loop;
  for r in select value from jsonb_array_elements(coalesce(p_rows->'records', '[]'::jsonb)) loop
    perform private.apply_upsert(uid, p_device_id, 'record', r, true);
  end loop;
  set constraints all immediate;
end $$;

create function public.record_consent(p_terms_version int, p_privacy_version int) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
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
revoke execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) from public, anon;
grant execute on function public.push_changes(text, jsonb), public.pull_changes(bigint, int), public.server_state(),
  public.replace_all(text, jsonb), public.record_consent(int, int) to authenticated;
