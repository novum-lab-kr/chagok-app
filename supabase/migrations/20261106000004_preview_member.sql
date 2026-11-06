-- 초대 미리보기: 이미 그 목표에 든 사람이 같은 링크를 다시 열 때 (2026-11-06 시뮬레이터 QA에서 찾음).
-- 전: taken_stickers에 내 스티커까지 들어가 앱이 「이미 누가 쓰는 스티커」로 [함께하기]를 막았다.
-- 지금: 로그인한 사람이 이미 멤버면 member: true와 goal_id를 더하고(멤버는 이미 아는 값), 자리가 다 찼어도 full로 막지 않는다.
--       taken_stickers에서는 부른 사람의 스티커를 뺀다. 로그인하지 않았으면 전과 같다.
-- 나머지(코드 맞히기 횟수 제한, IP 묶음)는 20261106000003 그대로다.

create or replace function public.preview_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  i public.invites;
  g public.goals;
  n integer;
  v_ip text := private.request_ip();
  now_ms bigint := private.now_ms();
  v_uid uuid := auth.uid();
  v_member boolean := false;
begin
  perform pg_advisory_xact_lock(hashtext('invite_preview:' || v_ip));
  delete from private.invite_preview_misses where missed_at < now_ms - 3600000;
  if (select count(*) from private.invite_preview_misses where ip = v_ip) >= 30 then
    return jsonb_build_object('status', 'rate_limited');
  end if;
  select * into i from public.invites where code = upper(btrim(coalesce(p_code, ''))) and revoked_at is null;
  if not found then
    insert into private.invite_preview_misses (ip, missed_at) values (v_ip, now_ms);
    return jsonb_build_object('status', 'closed');
  end if;
  select * into g from public.goals where id = i.goal_id;
  if g.deleted_at is not null or g.mode not in ('each', 'one') then return jsonb_build_object('status', 'closed'); end if;
  if v_uid is not null then
    v_member := exists (select 1 from public.goal_members where goal_id = g.id and user_id = v_uid and left_at is null);
  end if;
  select count(*) into n from public.goal_members where goal_id = g.id and left_at is null;
  if n >= g.max_members and not v_member then return jsonb_build_object('status', 'full'); end if;
  return jsonb_build_object(
    'status', 'open',
    'goal', jsonb_build_object('name', g.name, 'mode', g.mode, 'board_type', g.board_type, 'total_slots', g.total_slots,
      'end_date', g.end_date),
    'owner_name', (select display_name from public.goal_members where goal_id = g.id and user_id = g.owner_id),
    'member_count', n,
    'max_members', g.max_members,
    'taken_stickers', coalesce((select jsonb_agg(sticker_id order by sticker_id) from public.goal_members
      where goal_id = g.id and left_at is null and sticker_id is not null
        and (v_uid is null or user_id <> v_uid)), '[]'::jsonb))
    || case when v_member then jsonb_build_object('member', true, 'goal_id', g.id) else '{}'::jsonb end;
end $$;
