-- 서버 2판 기준 파일 5/5: 기록 사진 저장소, 계정 관리(애플 토큰, 카카오 연결 해제 실패, 계정 삭제 기록, 계정 지우기).
-- 사진, 애플, 카카오, 삭제 기록 부분은 이전 서버(20260930000003_photos.sql, 20260930000004_account_admin.sql)와 같다.

-- 기록 사진 (계정과 백업 설계 ③ Storage). 비공개, 본인 폴더({user_id}/)만. 사진 나누기를 넣을 때 정책을 넓힌다(서버 2판 계획 8절).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

create policy record_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
-- 올리기와 바꾸기는 {user_id}/{record_id}.jpg 한 단계에만 둔다. 하위 폴더를 허용하면 계정 삭제가 사진 폴더를 비우지 못한다
-- (폴더 목록에 하위 폴더 이름만 나오고, 그 이름을 지워도 안의 파일은 남는다).
create policy record_photos_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'record-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
  );
create policy record_photos_update on storage.objects for update to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'record-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 1
  );
create policy record_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 계정 관리용 (apple-link, delete-account, kakao-unlink Edge Function만 service_role로 부른다).
-- private 스키마는 API로 노출하지 않으므로 함수로만 다룬다.
create table private.apple_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null
);
-- 카카오 연결 해제 웹훅이 다시 시도해도 지우지 못한 회원. 운영자가 웹훅을 다시 보내 지우면 줄도 사라진다.
create table private.kakao_unlink_failures (
  kakao_id text primary key,
  referrer text not null,
  step text not null,
  failed_at timestamptz not null default now()
);

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

-- 사용자의 행을 지운다. 서버 2판 계획 3절 「사용자가 사라질 때」:
-- 1. 그 사람이 만든 함께 목표는 가장 먼저 들어온 남은 멤버가 이어받고, 아무도 없으면 지운다.
-- 2. 그 사람이 있던 함께 목표의 행 순번을 바꿔 다른 멤버 기기가 그 목표를 다시 받게 한다(pull_goal).
-- 3. 그 사람의 멤버 행을 지운다 → 그 사람이 붙인 칸(각자 판, 한 판)과 기록이 따라 지워진다(외래 키 on delete cascade).
-- 4. 그 사람의 혼자 목표, 기록, 차단, 기본값, 계정 행을 지운다. 초대와 신고의 사람 id는 비운다.
-- 여러 번 불러도 결과가 같다.
create function private.remove_user(p_user uuid) returns void language plpgsql set search_path = '' as $$
declare gid uuid;
begin
  for gid in
    select id from public.goals where owner_id = p_user and mode <> 'solo' and deleted_at is null for update
  loop
    perform private.hand_off(gid, p_user);
  end loop;
  update public.goals g set updated_at = g.updated_at
    where g.mode <> 'solo' and g.owner_id <> p_user and g.deleted_at is null
      and g.id in (select goal_id from public.goal_members where user_id = p_user and left_at is null);
  delete from public.goal_members where user_id = p_user;
  delete from public.goals where owner_id = p_user;
  delete from public.records where user_id = p_user;
  delete from public.blocks where blocker_id = p_user or blocked_id = p_user;
  delete from public.member_defaults where user_id = p_user;
  delete from public.accounts where user_id = p_user;
  update public.invites set created_by = null where created_by = p_user;
  update public.reports set reporter_id = null where reporter_id = p_user;
  update public.reports set target_user_id = null where target_user_id = p_user;
end $$;

-- 대시보드나 다른 길로 인증 계정을 바로 지워도 넘겨주기가 먼저 일어나게 한다(외래 키 cascade만으로는 함께 목표가 통째로 지워진다).
create function private.before_auth_user_delete() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.remove_user(old.id);
  return old;
end $$;
create trigger chagok_remove_user_rows before delete on auth.users
  for each row execute function private.before_auth_user_delete();

-- Apple refresh token 저장, 읽기, 삭제. apple-link가 저장하고 delete-account가 폐기한 뒤 지운다.
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
  perform private.remove_user(p_user);
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

revoke execute on all functions in schema private from public, anon, authenticated;
grant execute on function private.can_see_goal(uuid), private.is_owner(uuid) to authenticated;
revoke execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid), public.admin_find_user_by_identity(text, text),
  public.admin_record_kakao_unlink_failure(text, text, text), public.admin_clear_kakao_unlink_failure(text),
  public.admin_record_account_deletion(uuid, timestamptz, text, text), public.admin_scrub_user_audit_log(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid), public.admin_find_user_by_identity(text, text),
  public.admin_record_kakao_unlink_failure(text, text, text), public.admin_clear_kakao_unlink_failure(text),
  public.admin_record_account_deletion(uuid, timestamptz, text, text), public.admin_scrub_user_audit_log(uuid)
  to service_role;
