-- 계정 관리용 (apple-link, delete-account, kakao-unlink Edge Function만 service_role로 부른다).

-- Apple refresh token 저장·읽기·삭제. apple-link가 저장하고 delete-account가 폐기한 뒤 지운다.
-- private 스키마는 API로 노출하지 않으므로 함수로만 다룬다.
create function public.admin_save_apple_token(p_user uuid, p_token text) returns void
language sql security definer set search_path = '' as $$
  insert into private.apple_tokens (user_id, refresh_token) values (p_user, p_token)
  on conflict (user_id) do update set refresh_token = excluded.refresh_token;
$$;

create function public.admin_get_apple_token(p_user uuid) returns text
language sql stable security definer set search_path = '' as $$
  select refresh_token from private.apple_tokens where user_id = p_user;
$$;

create function public.admin_delete_apple_token(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from private.apple_tokens where user_id = p_user;
$$;

create function public.admin_delete_user_rows(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.records where user_id = p_user;
  delete from public.stickers where user_id = p_user;
  delete from public.goals where user_id = p_user;
  delete from public.accounts where user_id = p_user;
end $$;

-- 카카오 연결 해제 웹훅이 회원번호로 사용자를 찾는다. 없으면 null.
create function public.admin_find_user_by_identity(p_provider text, p_provider_id text) returns uuid
language sql stable security definer set search_path = '' as $$
  select user_id from auth.identities where provider = p_provider and provider_id = p_provider_id;
$$;

-- 웹훅이 끝내 지우지 못한 회원번호를 남기고(같은 번호면 마지막 실패로 덮어씀), 지우거나 찾을 사용자가 없으면 지운다.
create function public.admin_record_kakao_unlink_failure(p_kakao_id text, p_referrer text, p_step text) returns void
language sql security definer set search_path = '' as $$
  insert into private.kakao_unlink_failures (kakao_id, referrer, step) values (p_kakao_id, p_referrer, p_step)
  on conflict (kakao_id) do update set referrer = excluded.referrer, step = excluded.step, failed_at = now();
$$;

create function public.admin_clear_kakao_unlink_failure(p_kakao_id text) returns void
language sql security definer set search_path = '' as $$
  delete from private.kakao_unlink_failures where kakao_id = p_kakao_id;
$$;

revoke execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid), public.admin_find_user_by_identity(text, text),
  public.admin_record_kakao_unlink_failure(text, text, text), public.admin_clear_kakao_unlink_failure(text)
  from public, anon, authenticated;
grant execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid), public.admin_find_user_by_identity(text, text),
  public.admin_record_kakao_unlink_failure(text, text, text), public.admin_clear_kakao_unlink_failure(text)
  to service_role;
