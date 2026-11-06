-- 20261106000001 보안 검토에서 찾은 것 (2026-11-06).
-- 1) 그 파일 끝의 `revoke execute on all functions in schema private`가 정책이 쓰는 can_see_goal, is_owner 권한까지 거둬 갔다.
--    로그인 사용자가 goals, invites 표를 읽으면 permission denied가 났다(개발 서버 시험에서 확인). 앞 파일들처럼 다시 준다.
-- 2) IPv6는 회선 하나에 /64 대역을 받으므로 주소 하나가 아니라 /64로 묶어 센다. 지금 운영 API 주소에는 IPv6(AAAA)가 없다.
-- 3) 같은 곳에서 동시에 들어온 요청이 함께 30번을 넘지 않게 그 곳의 요청을 한 줄로 세운다.
-- 앞단 전제: 운영 API는 CDN 없이 Caddy가 맨 앞이다(2026-11-06 DNS 확인). Caddy 앞에 CDN 프록시를 두거나 웹 서버가 대신 부르면
-- 모두가 몇 개 주소로 묶여 이 제한이 모두를 막는다. 그때는 이 함수를 다시 본다.

grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;

create or replace function private.request_ip() returns text language plpgsql stable set search_path = '' as $$
declare
  raw text := btrim(split_part(
    coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-forwarded-for', ''), ',', 1));
  addr inet;
begin
  if raw = '' then return 'unknown'; end if;
  begin
    addr := raw::inet;
  exception when others then
    return left(raw, 64);
  end;
  if family(addr) = 6 then return host(network(set_masklen(addr, 64))) || '/64'; end if;
  return host(addr);
end $$;

create or replace function public.preview_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  i public.invites;
  g public.goals;
  n integer;
  v_ip text := private.request_ip();
  now_ms bigint := private.now_ms();
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

revoke execute on function private.request_ip() from public, anon, authenticated;
