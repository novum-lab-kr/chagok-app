-- 서버 2판 기준 파일 4/5: 2판 동기화와 함께 목표 RPC (서버 2판 계획 5절, PRD 4.15, 함께 목표 개발 설계 8절).
-- 1.1.0 호환 함수(20261105000003)와 같은 표를 쓰므로 데이터가 갈라지지 않는다.
--
-- 실패를 돌려주는 방법
-- - 이유 낱말은 SQLSTATE P0001의 메시지로 온다: not_member, not_owner, not_shared, full, sticker_taken, name_not_allowed.
-- - join_goal만 실패를 오류가 아니라 값 {error: '<낱말>'}로 돌려준다. 실패한 시도도 기록해 횟수를 세야 하는데,
--   오류를 내면 그 기록까지 되돌려지기 때문이다. 낱말: closed, full, rate_limited, invalid_name, name_not_allowed,
--   invalid_sticker, sticker_taken.
-- - 입력 형식이 틀리면 22023(invalid_name, invalid_sticker, invalid_input) 또는 형변환 오류 22xxx.
-- - 로그인 없음 42501.
--
-- 동기화 규칙 (다음 앱 버전이 따른다)
-- - 다른 사람의 멤버 행과 칸은 sync_pull, pull_goal로만 받는다. 표를 직접 읽을 수 없다.
-- - sync_pull(since)은 「내가 나가지 않은 멤버인 목표」의 바뀐 행과 내 멤버 행, 내 기록을 seq 순서로 준다.
-- - 멤버가 된 순간 이전 seq의 행은 커서로 받지 못한다. 내 멤버 행이 새로 생기면(가입) 그 목표만 pull_goal(goal_id)로
--   처음부터 받는다. pull_goal은 그 목표의 지금 상태 전체라, 받으면 그 목표를 통째로 바꾼다.
-- - 목표 행이 sync_pull에 오면 그 목표를 pull_goal로 다시 받는다. 누가 나가거나, 내보내지거나, 계정을 지우거나,
--   차단해서 사람이나 칸이 사라질 때 서버는 지운 표시를 남기지 않고 목표 행의 순번만 바꾼다.
-- - 다른 사람 멤버 행이 {goal_id, user_id, gone: true}로 오면 그 사람은 이 목표에서 사라졌다. 나간 사람, 내보내진 사람,
--   나와 차단 관계인 사람을 똑같이 이 모양으로 보낸다(차단당한 쪽이 차단과 나가기를 가르지 못하게). 앱은 그 사람의 판을 지운다.
-- - 차단하거나 풀면 차단한 사람의 멤버 행과 그 목표 행의 순번이 바뀐다. 차단당한 사람에게는 상대가 나간 것과 같은 모양이다.
--   차단한 사람의 앱은 자기가 차단한 것을 알므로 상대를 직접 지우고, 풀면 pull_goal로 다시 받는다.

-- 행 모양 (sync_pull, pull_goal)
create function private.goal_json(g public.goals) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', g.id, 'client_id', g.client_id, 'mode', g.mode, 'owner_id', g.owner_id, 'name', g.name,
    'board_type', g.board_type, 'total_slots', g.total_slots, 'initial_slots', g.initial_slots, 'end_date', g.end_date,
    'max_members', g.max_members, 'created_at', g.created_at, 'updated_at', g.updated_at);
$$;

-- 다른 사람에게는 이름, 스티커, 역할, 들어오고 나간 시각만. 순서와 완성은 그 사람만 본다(비교 없이, PRD 4.15).
create function private.member_json(m public.goal_members, viewer uuid) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'goal_id', m.goal_id, 'user_id', m.user_id, 'role', m.role, 'display_name', m.display_name, 'sticker_id', m.sticker_id,
    'joined_at', m.joined_at, 'left_at', m.left_at, 'updated_at', m.updated_at)
  || case when m.user_id = viewer then jsonb_build_object(
    'sort_order', m.sort_order, 'completed_at', m.completed_at, 'completion_seen', m.completion_seen,
    'last_placed_at', m.last_placed_at, 'left_reason', m.left_reason) else '{}'::jsonb end;
$$;

-- 한 판에서 차단 관계인 사람이 붙인 칸은 붙인 사람과 스티커를 비운다(이름 없는 흐린 칸, PRD 4.15).
create function private.sticker_json(s public.stickers, viewer uuid) returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', s.id, 'client_id', case when s.placed_by = viewer then s.client_id end, 'goal_id', s.goal_id,
    'board_user_id', s.board_user_id, 'slot_index', s.slot_index, 'date_key', to_char(s.date_key, 'YYYY-MM-DD'),
    'tz_offset_min', s.tz_offset_min, 'placed_at', s.placed_at, 'updated_at', s.updated_at,
    'placed_by', case when hidden then null else s.placed_by end,
    'sticker_type', case when hidden then null else s.sticker_type end)
  from (select s.placed_by <> viewer and private.blocked_between(viewer, s.placed_by) as hidden) h;
$$;

create function private.record_json(r public.records) returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id', r.id, 'client_id', r.client_id, 'sticker_id', r.sticker_id, 'memo', r.memo,
    'photo_remote_path', r.photo_remote_path, 'visibility', r.visibility, 'created_at', r.created_at, 'updated_at', r.updated_at);
$$;

-- 만든 사람이 나가거나 계정을 지울 때: 가장 먼저 들어온 남은 멤버가 이어받는다.
-- 아무도 없으면 목표를 지운다(표시가 아니라 행을 지운다. 초대, 멤버, 칸, 기록이 함께 지워진다).
create function private.hand_off(p_goal uuid, p_leaving uuid) returns void language plpgsql set search_path = '' as $$
declare next_owner uuid;
begin
  if not exists (select 1 from public.goals where id = p_goal and owner_id = p_leaving) then return; end if;
  select user_id into next_owner from public.goal_members
    where goal_id = p_goal and user_id <> p_leaving and left_at is null and role <> 'viewer'
    order by joined_at, user_id limit 1;
  if next_owner is null then
    delete from public.goals where id = p_goal;
    return;
  end if;
  update public.goal_members set role = 'member', updated_at = private.now_ms()
    where goal_id = p_goal and user_id = p_leaving and role = 'owner';
  update public.goal_members set role = 'owner', updated_at = private.now_ms() where goal_id = p_goal and user_id = next_owner;
  update public.goals set owner_id = next_owner, updated_at = private.now_ms() where id = p_goal;
end $$;

-- 멤버를 목표에서 뺀다(나가기 'left', 내보내기 'kicked').
-- - 각자 판: 그 사람 판을 그 사람의 새 혼자 목표로 옮기고 그 id를 돌려준다(PRD 4.15 「내 판이 내 목표로 남는다」).
-- - 한 판: 그 사람이 붙인 칸을 지운다(행을 지운다. 그 칸의 기록도 외래 키로 함께 지워진다).
-- - 멤버 행은 goal_id, user_id, role, left_at, left_reason만 남기고 이름, 스티커, 순서, 완성, 들어온 시각을 비운다.
--   left_reason은 내보내진 사람이 다시 들어오지 못하게 남긴다.
-- - 만든 사람이면 넘겨주고(없으면 목표를 지운다), 목표 행의 순번을 바꿔 다른 멤버가 pull_goal로 다시 받게 한다.
create function private.remove_member(p_goal uuid, p_user uuid, p_reason text) returns uuid
language plpgsql set search_path = '' as $$
declare
  g public.goals;
  m public.goal_members;
  now_ms bigint := private.now_ms();
  solo uuid;
begin
  select * into g from public.goals where id = p_goal for update;
  select * into m from public.goal_members where goal_id = p_goal and user_id = p_user and left_at is null;
  if not found then return null; end if;
  if g.mode = 'each' then
    solo := gen_random_uuid();
    insert into public.goals (id, owner_id, mode, name, board_type, total_slots, initial_slots, end_date, max_members,
      created_at, updated_at)
    values (solo, p_user, 'solo', g.name, g.board_type, g.total_slots, g.initial_slots, g.end_date, 1, m.joined_at, now_ms);
    insert into public.goal_members (goal_id, user_id, role, sticker_id, sort_order, completed_at, completion_seen,
      last_placed_at, joined_at, updated_at)
    values (solo, p_user, 'owner', m.sticker_id, m.sort_order, m.completed_at, m.completion_seen, m.last_placed_at,
      m.joined_at, now_ms);
    update public.stickers set goal_id = solo where goal_id = p_goal and board_user_id = p_user;
  elsif g.mode = 'one' then
    delete from public.stickers where goal_id = p_goal and placed_by = p_user;
  end if;
  update public.goal_members set left_at = now_ms, left_reason = p_reason, updated_at = now_ms,
    role = case when role = 'owner' then 'member' else role end,
    display_name = null, sticker_id = null, sort_order = null, completed_at = null, completion_seen = 0,
    last_placed_at = null, joined_at = null
  where goal_id = p_goal and user_id = p_user;
  if g.owner_id = p_user then perform private.hand_off(p_goal, p_user); end if;
  update public.goals set updated_at = updated_at where id = p_goal; -- 순번만 바꾼다(지워졌으면 아무것도 안 함)
  return solo;
end $$;

-- 나가지 않은 멤버인 함께 목표를 잠가서 읽는다. 아니면 not_member, 혼자 목표면 not_shared.
create function private.shared_goal_for(p_goal uuid, p_user uuid) returns public.goals
language plpgsql set search_path = '' as $$
declare g public.goals;
begin
  select * into g from public.goals where id = p_goal and deleted_at is null for update;
  if not found or not exists (
    select 1 from public.goal_members where goal_id = p_goal and user_id = p_user and left_at is null
  ) then
    perform private.fail('not_member');
  end if;
  if g.mode = 'solo' then perform private.fail('not_shared'); end if;
  return g;
end $$;

create function private.save_member_defaults(p_user uuid, p_name text, p_sticker text) returns void
language sql set search_path = '' as $$
  insert into public.member_defaults (user_id, display_name, sticker_id, updated_at) values (p_user, p_name, p_sticker, private.now_ms())
  on conflict (user_id) do update set display_name = excluded.display_name, sticker_id = excluded.sticker_id, updated_at = excluded.updated_at;
$$;



-- 차단하거나 풀 때 알림: 차단한 사람(p_user)의 멤버 행과 그 목표 행의 순번을 바꾼다. 상대(p_other)와 함께 있는 목표만.
-- 나가기 알림(나간 사람의 멤버 행과 목표 행)과 같은 행이 바뀌므로, 차단당한 쪽에는 상대가 나간 것과 같게 보인다.
-- 차단당한 사람 자신의 행은 건드리지 않는다(자기 행이 이유 없이 바뀌면 차단을 눈치챌 수 있다).
create function private.touch_member_rows(p_user uuid, p_other uuid) returns void language plpgsql set search_path = '' as $$
begin
  update public.goal_members m set updated_at = m.updated_at
  where m.user_id = p_user and m.left_at is null and m.goal_id in (
    select y.goal_id from public.goal_members y where y.user_id = p_other and y.left_at is null);
  update public.goals g set updated_at = g.updated_at
  where g.mode <> 'solo' and g.id in (
    select x.goal_id from public.goal_members x join public.goal_members y on y.goal_id = x.goal_id
    where x.user_id = p_user and x.left_at is null and y.user_id = p_other and y.left_at is null);
end $$;

-- ───────────── 동기화 ─────────────

-- 바뀐 행 올리기. 행 모양:
-- - goal(혼자 목표만): 1.1.0 목표 행과 같은 키, id는 uuid. 처음이면 내 멤버 행도 만든다(default_sticker_id → 기본 스티커).
--   함께 목표는 update_goal로 고친다.
-- - member: {goal_id, sort_order, completed_at, completion_seen, last_placed_at, updated_at, sticker_id(혼자 목표만)}. 내 행만.
--   함께 목표의 이름과 스티커는 update_member로 고친다.
-- - sticker: {id, goal_id, slot_index, date_key, tz_offset_min, sticker_type, placed_at, updated_at}. 붙인 사람은 나,
--   판 주인은 서버가 방식으로 정한다.
-- - record: {id, sticker_id, memo, photo_remote_path, created_at, updated_at}. 내가 붙인 칸에만.
-- - delete: {entity, op: 'delete', id, deletedAt}. goal은 혼자 목표만(함께 목표는 leave_goal), member는 받지 않는다.
-- 돌려주는 것: {rejected: [{entity, id, reason}]}. reason은 slot_taken(같은 칸에 이미 다른 스티커, 한 판 같은 날 두 장)
-- 또는 not_allowed(내 행이 아님, 함께 목표의 멤버가 아니거나 나감). 그 행만 빠지고 나머지는 반영된다. 형식 오류와 부모 없음(23503)은 이전처럼 묶음 전체를 거절한다.
create function public.sync_push(p_device_id text, p_changes jsonb) returns jsonb
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
          when raise_exception then -- 함께 목표의 멤버가 아니거나 나간 사람(스티커 트리거)
            if sqlerrm = 'not_allowed' then reason := 'not_allowed'; else raise; end if;
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

-- 바뀐 행 받기. 돌려주는 것: {rows: [{entity, row, deletedAt}], cursor, more}. entity: goal, member, sticker, record.
-- 다른 사람 멤버 행은 나가지 않았고 차단 관계가 아니면 member_json, 아니면 {goal_id, user_id, gone: true}.
create function public.sync_pull(p_since bigint, p_limit int) returns jsonb
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

-- 목표 하나의 지금 상태 전체(지운 행 빼고). 가입한 직후, 다시 보이게 된 사람이 있을 때, 목표 행이 바뀌어 다시 맞출 때.
-- 돌려주는 것: {goal, members, stickers, records(이 목표의 내 기록)}.
create function public.pull_goal(p_goal_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  g public.goals;
begin
  select * into g from public.goals where id = p_goal_id;
  if not found or not exists (
    select 1 from public.goal_members where goal_id = p_goal_id and user_id = uid and left_at is null
  ) then
    perform private.fail('not_member');
  end if;
  return jsonb_build_object(
    'goal', private.goal_json(g) || jsonb_build_object('deleted_at', g.deleted_at),
    'members', coalesce((select jsonb_agg(private.member_json(m, uid) order by m.joined_at, m.user_id)
      from public.goal_members m
      where m.goal_id = p_goal_id and m.left_at is null and (m.user_id = uid or not private.blocked_between(uid, m.user_id))), '[]'::jsonb),
    'stickers', coalesce((select jsonb_agg(private.sticker_json(s, uid) order by s.seq)
      from public.stickers s
      where s.goal_id = p_goal_id and s.deleted_at is null
        and (s.board_user_id is null or s.board_user_id = uid or not private.blocked_between(uid, s.board_user_id))), '[]'::jsonb),
    'records', coalesce((select jsonb_agg(private.record_json(r) order by r.seq)
      from public.records r join public.stickers s on s.id = r.sticker_id
      where s.goal_id = p_goal_id and r.user_id = uid and r.deleted_at is null), '[]'::jsonb));
end $$;

-- ───────────── 함께 목표 ─────────────

-- 함께 목표를 만든다: 목표, 만든 사람 멤버, 초대 코드. p_goal_id를 주면 그 id로 만든다(기기가 먼저 정한 id).
-- 실패: 22023 invalid_input(방식, 판 종류, 칸 수 1~1000, 종료일 형식), invalid_sticker(1~40자), invalid_name, name_not_allowed.
-- 돌려주는 것: {goal_id, invite_code}.
create function public.create_shared_goal(p_mode text, p_name text, p_board_type text, p_total_slots int, p_end_date text,
  p_display_name text, p_sticker_id text, p_goal_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  gid uuid := coalesce(p_goal_id, gen_random_uuid());
  now_ms bigint := private.now_ms();
  v_goal_name text;
  v_name text;
  v_slots integer;
  code text;
begin
  if p_mode is null or p_mode not in ('each', 'one') or p_board_type is null or p_board_type not in ('calendar', 'tally') then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  v_slots := private.check_slots(p_board_type, p_total_slots);
  perform private.check_end_date(p_end_date);
  v_goal_name := private.clean_name(p_name, 20);
  v_name := private.clean_name(p_display_name, 10);
  perform private.check_sticker(p_sticker_id);
  insert into public.goals (id, owner_id, mode, name, board_type, total_slots, initial_slots, end_date, max_members,
    created_at, updated_at)
  values (gid, uid, p_mode, v_goal_name, p_board_type, v_slots, v_slots, p_end_date, 6, now_ms, now_ms);
  insert into public.goal_members (goal_id, user_id, role, display_name, sticker_id, joined_at, updated_at)
  values (gid, uid, 'owner', v_name, p_sticker_id, now_ms, now_ms);
  code := private.issue_invite(gid, uid);
  perform private.save_member_defaults(uid, v_name, p_sticker_id);
  return jsonb_build_object('goal_id', gid, 'invite_code', code);
end $$;

-- 초대 미리보기. 로그인 전에도 부른다(anon). 차단 여부는 드러내지 않는다(들어갈 때 join_goal이 closed로 막는다).
-- 받아들인 위험(보안 검토 2026-11-04 중간 3): 차단당한 사람은 미리보기 open 뒤 들어가기 closed를 보고 차단을 짐작할 수 있다.
-- 들어가기 closed는 끈 코드, 지운 목표, 내보내진 경우와 같은 화면이라 이유를 가르지 않는다. 한 판에서는 차단한 사람이
-- 붙인 칸이 이름 없는 칸으로 남아(나가면 칸이 지워지는 것과 다르다) 짐작할 수 있다. 둘 다 PRD 4.15 동작이라 그대로 둔다.
-- 로그인 없는 호출의 횟수 제한은 이 함수에 없다. 서버 앞단(프록시나 엣지)에서 나중에 건다.
-- 돌려주는 것: {status: 'closed'} (없는 코드, 끈 코드, 지운 목표), {status: 'full'},
-- {status: 'open', goal: {name, mode, board_type, total_slots, end_date}, owner_name, member_count, max_members, taken_stickers}.
create function public.preview_invite(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  i public.invites;
  g public.goals;
  n integer;
begin
  select * into i from public.invites where code = upper(btrim(coalesce(p_code, ''))) and revoked_at is null;
  if not found then return jsonb_build_object('status', 'closed'); end if;
  select * into g from public.goals where id = i.goal_id;
  if g.deleted_at is not null or g.mode not in ('each', 'one') then return jsonb_build_object('status', 'closed'); end if;
  select count(*) into n from public.goal_members where goal_id = g.id and left_at is null;
  if n >= g.max_members then return jsonb_build_object('status', 'full'); end if;
  return jsonb_build_object(
    'status', 'open',
    'goal', jsonb_build_object('name', g.name, 'mode', g.mode, 'board_type', g.board_type, 'total_slots', g.total_slots,
      'end_date', g.end_date),
    'owner_name', (select display_name from public.goal_members where goal_id = g.id and user_id = g.owner_id),
    'member_count', n,
    'max_members', g.max_members,
    'taken_stickers', coalesce((select jsonb_agg(sticker_id order by sticker_id) from public.goal_members
      where goal_id = g.id and left_at is null and sticker_id is not null), '[]'::jsonb));
end $$;

-- 초대로 들어간다. 이미 멤버면 그대로 성공. 실패는 오류가 아니라 값으로 돌려준다(시도 기록을 남겨야 해서).
-- 돌려주는 것: 성공 {goal_id}, 실패 {error}. error: rate_limited(1시간에 20번 넘게 시도), closed(없는 코드, 끈 코드,
-- 지운 목표, 내보내진 사람, 만든 사람과 차단 관계), full, invalid_name, name_not_allowed, invalid_sticker, sticker_taken.
-- 들어간 뒤 앱은 pull_goal을 부른다.
create function public.join_goal(p_code text, p_display_name text, p_sticker_id text) returns jsonb
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
  if found and m.left_reason = 'kicked' then return jsonb_build_object('error', 'closed'); end if;
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

-- 내 이름과 스티커 (함께 목표). 실패: not_member, not_shared, invalid_name, name_not_allowed, invalid_sticker, sticker_taken.
create function public.update_member(p_goal_id uuid, p_display_name text, p_sticker_id text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  v_name text;
begin
  perform private.shared_goal_for(p_goal_id, uid);
  v_name := private.clean_name(p_display_name, 10);
  perform private.check_sticker(p_sticker_id);
  if exists (select 1 from public.goal_members
             where goal_id = p_goal_id and user_id <> uid and left_at is null and sticker_id = p_sticker_id) then
    perform private.fail('sticker_taken');
  end if;
  update public.goal_members set display_name = v_name, sticker_id = p_sticker_id, updated_at = private.now_ms()
    where goal_id = p_goal_id and user_id = uid;
  perform private.save_member_defaults(uid, v_name, p_sticker_id);
end $$;

-- 만든 사람만: 이름, 칸 수(적립판 1~1000, 붙은 칸보다 적게 못 함), 종료일('YYYY-MM-DD' 또는 null).
-- 실패: not_member, not_shared, not_owner, invalid_name, name_not_allowed, invalid_input.
create function public.update_goal(p_goal_id uuid, p_name text, p_total_slots int, p_end_date text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  g public.goals := private.shared_goal_for(p_goal_id, uid);
  v_goal_name text;
  v_slots integer;
begin
  if g.owner_id <> uid then perform private.fail('not_owner'); end if;
  v_slots := private.check_slots(g.board_type, p_total_slots);
  -- 이미 붙은 칸보다 적게 줄이지 않는다(앱 parseSlotCount와 같은 뜻, 칸 번호는 0부터)
  if v_slots is not null and exists (select 1 from public.stickers
      where goal_id = p_goal_id and deleted_at is null and slot_index >= v_slots) then
    raise exception using errcode = '22023', message = 'invalid_input';
  end if;
  perform private.check_end_date(p_end_date);
  v_goal_name := private.clean_name(p_name, 20);
  update public.goals set name = v_goal_name, total_slots = v_slots, end_date = p_end_date, updated_at = private.now_ms()
  where id = p_goal_id;
end $$;

-- 만든 사람만: 초대 코드를 새로 만들고 옛 코드를 끈다. 실패: not_member, not_shared, not_owner. 돌려주는 것: {invite_code}.
create function public.rotate_invite(p_goal_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  g public.goals := private.shared_goal_for(p_goal_id, uid);
begin
  if g.owner_id <> uid then perform private.fail('not_owner'); end if;
  update public.invites set revoked_at = private.now_ms() where goal_id = p_goal_id and revoked_at is null;
  return jsonb_build_object('invite_code', private.issue_invite(p_goal_id, uid));
end $$;

-- 나가기. 만든 사람이 나가면 가장 먼저 들어온 사람이 이어받고, 아무도 없으면 목표를 지운다.
-- 각자 판이면 내 판이 내 새 혼자 목표가 된다. 실패: not_member, not_shared. 돌려주는 것: {solo_goal_id}(한 판이면 null).
create function public.leave_goal(p_goal_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  perform private.shared_goal_for(p_goal_id, uid);
  return jsonb_build_object('solo_goal_id', private.remove_member(p_goal_id, uid, 'left'));
end $$;

-- 만든 사람만: 내보내기. 내보내진 사람은 같은 목표에 다시 들어오지 못한다. 실패: not_member, not_shared, not_owner, invalid_input.
create function public.kick_member(p_goal_id uuid, p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  g public.goals := private.shared_goal_for(p_goal_id, uid);
begin
  if g.owner_id <> uid then perform private.fail('not_owner'); end if;
  if p_user_id is null or p_user_id = uid then raise exception using errcode = '22023', message = 'invalid_input'; end if;
  if not exists (select 1 from public.goal_members where goal_id = p_goal_id and user_id = p_user_id and left_at is null) then
    perform private.fail('not_member');
  end if;
  perform private.remove_member(p_goal_id, p_user_id, 'kicked');
end $$;

-- 차단. 함께 목표에서 만난 적이 있는 사람만 차단한다(모르는 id로 이름을 알아내지 못하게).
-- 내가 만든 함께 목표에 그 사람이 있으면 내보낸다. 상대에게 알리지 않는다. 실패: invalid_input, not_member.
create function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  gid uuid;
begin
  if p_user_id is null or p_user_id = uid then raise exception using errcode = '22023', message = 'invalid_input'; end if;
  if not exists (
    select 1 from public.goal_members a join public.goal_members b on b.goal_id = a.goal_id
    where a.user_id = uid and b.user_id = p_user_id
  ) then
    perform private.fail('not_member');
  end if;
  -- 내보내면 멤버 행의 이름이 지워지므로, 「차단한 사람」 목록에 보일 이름을 먼저 남긴다(함께 있던 목표에서 가장 최근 이름).
  insert into public.blocks (blocker_id, blocked_id, display_name, created_at)
  values (uid, p_user_id, (
    select m.display_name from public.goal_members m join public.goal_members mine on mine.goal_id = m.goal_id
    where m.user_id = p_user_id and mine.user_id = uid and m.display_name is not null
    order by m.joined_at desc limit 1), private.now_ms())
  on conflict do nothing;
  for gid in
    select g.id from public.goals g join public.goal_members m on m.goal_id = g.id
    where g.owner_id = uid and g.mode <> 'solo' and g.deleted_at is null and m.user_id = p_user_id and m.left_at is null
  loop
    perform private.remove_member(gid, p_user_id, 'kicked');
  end loop;
  perform private.touch_member_rows(uid, p_user_id);
end $$;

-- 차단 풀기. 다시 보이게 된 사람은 pull_goal로 받는다. 내보낸 것은 되돌리지 않는다.
create function public.unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  delete from public.blocks where blocker_id = uid and blocked_id = p_user_id;
  if found then perform private.touch_member_rows(uid, p_user_id); end if;
end $$;

-- 내가 차단한 사람. 이름은 차단할 때 남긴 이름. 돌려주는 것: [{user_id, display_name, created_at}] (최근 차단 먼저).
create function public.my_blocks() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('user_id', b.blocked_id, 'display_name', b.display_name, 'created_at', b.created_at)
      order by b.created_at desc)
    from public.blocks b where b.blocker_id = uid), '[]'::jsonb);
end $$;

-- 신고. 그 목표에 있었던 사람만, 대상은 그 목표에 있었던 사람(없으면 목표 자체). 사유 1~500자.
-- 실패: not_member, invalid_input. 알림 메일은 이 표의 insert에 웹훅으로 붙인다(아직 없음).
create function public.report(p_goal_id uuid, p_target_user_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := private.require_user();
  v_reason text := btrim(coalesce(p_reason, ''));
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
  insert into public.reports (goal_id, reporter_id, target_user_id, reason, created_at)
  values (p_goal_id, uid, p_target_user_id, v_reason, private.now_ms());
end $$;

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;

revoke execute on function public.sync_push(text, jsonb), public.sync_pull(bigint, int), public.pull_goal(uuid),
  public.create_shared_goal(text, text, text, int, text, text, text, uuid), public.preview_invite(text),
  public.join_goal(text, text, text), public.update_member(uuid, text, text), public.update_goal(uuid, text, int, text),
  public.rotate_invite(uuid), public.leave_goal(uuid), public.kick_member(uuid, uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.my_blocks(), public.report(uuid, uuid, text)
  from public, anon;
grant execute on function public.sync_push(text, jsonb), public.sync_pull(bigint, int), public.pull_goal(uuid),
  public.create_shared_goal(text, text, text, int, text, text, text, uuid), public.preview_invite(text),
  public.join_goal(text, text, text), public.update_member(uuid, text, text), public.update_goal(uuid, text, int, text),
  public.rotate_invite(uuid), public.leave_goal(uuid), public.kick_member(uuid, uuid), public.block_user(uuid),
  public.unblock_user(uuid), public.my_blocks(), public.report(uuid, uuid, text)
  to authenticated;
-- 초대 미리보기는 로그인 전에도 (PRD 4.15 「로그인 전이면 은주님이 함께하자고 했어요」)
grant execute on function public.preview_invite(text) to anon;
