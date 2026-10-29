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

-- 계정 삭제 기록 (2026-10-29 법률 검토 2차, 표준 개인정보 보호지침 10조 3항 파기 기록).
-- 누구의 계정을 언제 어느 경로로 지웠는지만 남긴다. 이메일, 전화, 이름은 넣지 않는다.
-- 지운 계정이라 auth.users 외래 키를 두지 않는다. 1년 지난 행은 운영 서버 타이머가 지운다(docs/DEV-SETUP.md 「운영 서버 로그」).
-- route: app(앱의 계정 삭제), kakao_unlink(카카오 연결 해제 웹훅), email(메일 요청을 운영자가 처리). result: success, failed.
create table private.account_deletions (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  requested_at timestamptz not null,
  completed_at timestamptz not null default now(),
  route text not null check (route in ('app', 'kakao_unlink', 'email')),
  result text not null check (result in ('success', 'failed'))
);

create function public.admin_record_account_deletion(p_user uuid, p_requested_at timestamptz, p_route text, p_result text) returns void
language sql security definer set search_path = '' as $$
  insert into private.account_deletions (user_id, requested_at, route, result) values (p_user, p_requested_at, p_route, p_result);
$$;

-- 지운 사용자의 인증 감사 기록(auth.audit_log_entries)에서 이메일, 전화, 이름 같은 개인 항목을 지우고
-- UUID(actor_id, traits.user_id)와 기록 종류(action, log_type)만 남긴다. 행과 시각, 접속 IP는 그대로 둔다(3개월 보관 뒤 서버 타이머가 지운다).
-- 그 사용자가 한 일(actor_id)과 그 사용자를 대상으로 한 일(traits.user_id, 예: 계정 삭제)을 모두 고친다. 다시 불러도 결과가 같다.
create function public.admin_scrub_user_audit_log(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update auth.audit_log_entries
  set payload = json_strip_nulls(json_build_object(
    'actor_id', payload -> 'actor_id',
    'action', payload -> 'action',
    'log_type', payload -> 'log_type',
    'traits', case when payload -> 'traits' ->> 'user_id' is not null
      then json_build_object('user_id', payload -> 'traits' -> 'user_id') end
  ))
  where payload ->> 'actor_id' = p_user::text or payload -> 'traits' ->> 'user_id' = p_user::text;
$$;

revoke execute on function public.admin_record_account_deletion(uuid, timestamptz, text, text), public.admin_scrub_user_audit_log(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_record_account_deletion(uuid, timestamptz, text, text), public.admin_scrub_user_audit_log(uuid)
  to service_role;
