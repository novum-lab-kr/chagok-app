-- 내 목표 순서 (PRD 4.1, 2026-10-30). 사용자가 끌어 옮겨 정한 순서를 백업한다. 작을수록 위.
-- 하위 호환:
-- - 칸을 더하기만 한다. 이미 있는 행은 null이고, 새 앱이 복원할 때 첫 순서 규칙(마지막으로 붙인 시각, 없으면 만든 시각
--   최근순)으로 채워 다시 올린다(src/sync/restore.ts fillSortOrder).
-- - 옛 앱(1.0)은 sort_order 없이 올린다 — 저장된 값을 지우지 않는다(coalesce). 옛 앱은 pull 응답의 새 키를 읽지 않는다.
-- 반영 순서: 이 마이그레이션을 운영 서버에 반영한 뒤에 새 앱을 제출한다(docs/RELEASE-CHECKLIST.md 6절).
-- - 새 앱이 먼저 나가면 올리기는 실패하지 않는다(apply_upsert가 모르는 키를 무시한다). 하지만 기기 DB v2가 한 번만 올리는
--   sort_order 값이 서버에 남지 않고 사라지고, 다른 기기에서 지운 목표가 updated_at이 같은 upsert로 되살아난다.
-- 함수는 20260930000002_sync_rpc.sql의 원문에서 sort_order 부분만 바꿨다. create or replace는 기존 실행 권한을 그대로 둔다.

alter table public.goals add column if not exists sort_order integer;

create or replace function private.apply_upsert(uid uuid, device text, entity text, r jsonb, force boolean)
returns void language plpgsql set search_path = '' as $$
begin
  if entity = 'goal' then
    insert into public.goals as t (user_id, id, name, board_type, total_slots, default_sticker_id, created_at, end_date,
      completed_at, completion_seen, last_placed_at, initial_slots, updated_at, deleted_at, device_id, sort_order)
    values (uid, r->>'id', r->>'name', r->>'board_type', (r->>'total_slots')::int, r->>'default_sticker_id',
      (r->>'created_at')::bigint, r->>'end_date', (r->>'completed_at')::bigint, (r->>'completion_seen')::int,
      (r->>'last_placed_at')::bigint, (r->>'initial_slots')::int, (r->>'updated_at')::bigint, null, device,
      (r->>'sort_order')::int)
    on conflict (user_id, id) do update set
      name = excluded.name, board_type = excluded.board_type, total_slots = excluded.total_slots,
      default_sticker_id = excluded.default_sticker_id, created_at = excluded.created_at, end_date = excluded.end_date,
      completed_at = excluded.completed_at, completion_seen = excluded.completion_seen,
      last_placed_at = excluded.last_placed_at, initial_slots = excluded.initial_slots,
      updated_at = excluded.updated_at, deleted_at = null, device_id = excluded.device_id,
      -- 옛 앱(1.0)은 sort_order 없이 올린다. 그때는 저장된 순서를 지우지 않는다.
      sort_order = coalesce(excluded.sort_order, t.sort_order)
    -- updated_at이 같으면 지운 행을 되살리지 않는다. apply_delete는 updated_at을 바꾸지 않아서, 기기 DB v2가 updated_at을
    -- 그대로 두고 모든 목표를 올리면 다른 기기에서 지운 목표가 살아난다.
    where force or t.updated_at < excluded.updated_at or (t.updated_at = excluded.updated_at and t.deleted_at is null);
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

create or replace function public.pull_changes(p_since bigint, p_limit int) returns jsonb
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
        'initial_slots', initial_slots, 'updated_at', updated_at, 'sort_order', sort_order) as row
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

-- 권한은 20260930000002와 같다(다시 걸어 둔다)
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on function public.pull_changes(bigint, int) from public, anon;
grant execute on function public.pull_changes(bigint, int) to authenticated;
