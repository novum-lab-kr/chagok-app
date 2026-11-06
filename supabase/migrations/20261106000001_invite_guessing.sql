-- 초대 코드 맞히기 막기 (2026-11-06, 사용자 결정).
-- 초대 미리보기는 로그인 없이 부른다(초대 링크를 받은 사람은 대부분 로그인 전이다). 아무 코드나 대량으로 넣어
-- 남의 목표 이름과 만든 사람 이름을 맞히지 못하게 두 가지를 한다.
--   1) 새 초대 코드를 8자리에서 12자리로 늘린다(32글자 알파벳, 약 1.2×10^18가지). 이미 만든 코드는 그대로 쓴다.
--   2) 초대 미리보기에서 없는 코드를 한 곳(IP)에서 1시간에 30번 넣으면 그 뒤로는 {status: 'rate_limited'}를 돌려준다.
--      맞는 코드를 여는 사람은 세지 않는다. 들어가기(join_goal)의 사용자별 1시간 20번 제한은 그대로다.
-- IP는 요청 머리글 X-Forwarded-For의 첫 값이다. 운영 서버는 Caddy가 앞에 있고, Caddy는 믿지 않는 곳에서 온 이 머리글을
-- 버리고 실제 접속 주소로 새로 쓴다(trusted_proxies 설정 없음, 2026-11-06 /etc/caddy/Caddyfile 확인). 그래서 첫 값을 앱이나 웹이 꾸밀 수 없다.
-- 남긴 IP는 1시간 뒤 지운다(부를 때마다 1시간 지난 줄을 모두 지운다).

create or replace function private.new_invite_code() returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  a bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  b bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  code text := '';
  i integer;
begin
  -- uuid v4의 판 번호와 변형 비트가 없는 자리에서 8개 + 4개 (256이 32로 나눠떨어져 고르게 나온다)
  foreach i in array array[0, 1, 2, 3, 4, 5, 10, 11] loop
    code := code || substr(alphabet, (get_byte(a, i) % 32) + 1, 1);
  end loop;
  foreach i in array array[0, 1, 2, 3] loop
    code := code || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);
  end loop;
  return code;
end $$;

create table private.invite_preview_misses (
  ip text not null,
  missed_at bigint not null
);
create index invite_preview_misses_ip on private.invite_preview_misses (ip);
create index invite_preview_misses_time on private.invite_preview_misses (missed_at);

-- 부른 곳의 IP. 머리글이 없으면(서버 안에서 부를 때) 'unknown' 하나로 센다.
create function private.request_ip() returns text language sql stable set search_path = '' as $$
  select coalesce(nullif(btrim(split_part(
    coalesce((nullif(current_setting('request.headers', true), '')::json) ->> 'x-forwarded-for', ''), ',', 1)), ''), 'unknown')
$$;

-- 돌려주는 것: {status: 'closed'} (없는 코드, 끈 코드, 지운 목표), {status: 'full'}, {status: 'rate_limited'} (위 2),
-- {status: 'open', goal: {name, mode, board_type, total_slots, end_date}, owner_name, member_count, max_members, taken_stickers}.
-- 없는 코드를 기록해야 해서 stable이 아니라 volatile이다.
create or replace function public.preview_invite(p_code text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  i public.invites;
  g public.goals;
  n integer;
  v_ip text := private.request_ip();
  now_ms bigint := private.now_ms();
begin
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

revoke all on private.invite_preview_misses from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
