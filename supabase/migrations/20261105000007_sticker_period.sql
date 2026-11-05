-- 함께 목표 달력판: 목표 기간 밖 날짜의 스티커를 받지 않는다 (PRD 4.15, 2026-11-05).
-- 앱 규칙(src/domain/board.ts canPlace, sharedBoardView canPlaceOn)은 시작일(목표 created_at의 기기 날짜)부터
-- 오늘까지, 종료일이 있으면 종료일까지다. 서버는 기기 시간대를 모르므로 UTC 날짜에 하루씩 여유를 둬
-- 앱이 붙일 수 있는 날을 거절하지 않는다:
--   시작일 - 1 <= date_key <= 오늘 + 1, 종료일이 있으면 date_key <= 종료일(날짜 문자열이라 여유 없음).
-- 종료일 없는 판의 「완성한 날까지」는 앱만 본다(서버가 더 너그럽다).
-- 혼자 목표(1.1.0과 같게 둔다)와 적립판(칸 번호 범위만 본다)은 검사하지 않는다. 지우는 표시만 남기는 쓰기도 그대로.
-- 거절은 P0001 out_of_period이고, sync_push가 그 행만 rejected {reason: 'out_of_period'}로 돌려준다.
-- 앱은 그 칸을 기기에서 지우고 다시 보내지 않는다(src/sync/push.ts).

create or replace function private.stickers_before_write() returns trigger language plpgsql set search_path = '' as $$
declare
  g record;
  m record;
  taken integer;
begin
  select mode, board_type, total_slots, created_at, end_date into g from public.goals where id = new.goal_id;
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
    -- 기간 밖 날짜(위 머리말). 하루 여유는 기기 시간대와 UTC의 차이(최대 하루)다.
    if g.board_type = 'calendar' and (
         new.date_key < (to_timestamp(g.created_at / 1000.0) at time zone 'UTC')::date - 1
      or new.date_key > (now() at time zone 'UTC')::date + 1
      or (g.end_date is not null and new.date_key > g.end_date::date)) then
      raise exception using errcode = 'P0001', message = 'out_of_period';
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

-- sync_push: 스티커 트리거의 out_of_period도 not_allowed처럼 그 행만 거절한다. 나머지는 20261105000004와 같다.
create or replace function public.sync_push(p_device_id text, p_changes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  c jsonb;
  r jsonb;
  entity text;
  reason text;
  rejected jsonb := '[]'::jsonb;
  m public.goal_members;
  gmode text;
begin
  if jsonb_typeof(p_changes) is distinct from 'array' then
    raise exception 'changes must be an array' using errcode = '22023';
  end if;
  for c in select value from jsonb_array_elements(p_changes) loop
    entity := c->>'entity';
    r := c->'row';
    reason := null;
    if c->>'op' = 'upsert' then
      if entity = 'goal' then
        reason := private.upsert_solo_goal(uid, (r->>'id')::uuid, null, r, false);
      elsif entity = 'member' then
        select * into m from public.goal_members where goal_id = (r->>'goal_id')::uuid and user_id = uid for update;
        if not found then raise exception 'member not found' using errcode = '23503'; end if;
        if m.left_at is not null then
          reason := 'not_allowed';
        elsif m.updated_at <= (r->>'updated_at')::bigint then
          select mode into gmode from public.goals where id = m.goal_id;
          update public.goal_members set
            sort_order = (r->>'sort_order')::integer, completed_at = (r->>'completed_at')::bigint,
            completion_seen = coalesce((r->>'completion_seen')::integer, 0), last_placed_at = (r->>'last_placed_at')::bigint,
            sticker_id = case when gmode = 'solo' and r->>'sticker_id' is not null then r->>'sticker_id' else sticker_id end,
            updated_at = (r->>'updated_at')::bigint
          where goal_id = m.goal_id and user_id = uid;
        end if;
      elsif entity = 'sticker' then
        begin
          reason := private.upsert_sticker(uid, (r->>'id')::uuid, (r->>'goal_id')::uuid, null, r, false);
        exception
          when unique_violation then reason := 'slot_taken';
          when raise_exception then -- 함께 목표의 멤버가 아니거나 나간 사람, 기간 밖 날짜(스티커 트리거)
            if sqlerrm in ('not_allowed', 'out_of_period') then reason := sqlerrm; else raise; end if;
        end;
      elsif entity = 'record' then
        reason := private.upsert_record(uid, (r->>'id')::uuid, (r->>'sticker_id')::uuid, null, r, false);
      else
        raise exception 'unknown entity %', entity using errcode = '22023';
      end if;
    elsif c->>'op' = 'delete' then
      if c->>'id' is null or c->>'deletedAt' is null then
        raise exception 'delete needs id and deletedAt' using errcode = '22023';
      end if;
      if entity = 'goal' then
        reason := private.delete_solo_goal(uid, (c->>'id')::uuid, (c->>'deletedAt')::bigint);
      elsif entity = 'sticker' then
        reason := private.delete_sticker(uid, (c->>'id')::uuid, (c->>'deletedAt')::bigint);
      elsif entity = 'record' then
        reason := private.delete_record(uid, (c->>'id')::uuid, (c->>'deletedAt')::bigint);
      elsif entity = 'member' then
        reason := 'not_allowed';
      else
        raise exception 'unknown entity %', entity using errcode = '22023';
      end if;
    else
      raise exception 'unknown op %', c->>'op' using errcode = '22023';
    end if;
    if reason is not null then
      rejected := rejected || jsonb_build_array(jsonb_build_object(
        'entity', entity, 'id', coalesce(r->>'id', c->>'id', r->>'goal_id'), 'reason', reason));
    end if;
  end loop;
  set constraints all immediate;
  return jsonb_build_object('rejected', rejected);
end $$;
