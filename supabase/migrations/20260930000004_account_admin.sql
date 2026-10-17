-- 계정 관리용 (apple-link·delete-account Edge Function만 service_role로 부른다).

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

revoke execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid)
  from public, anon, authenticated;
grant execute on function public.admin_save_apple_token(uuid, text), public.admin_get_apple_token(uuid), public.admin_delete_apple_token(uuid),
  public.admin_delete_user_rows(uuid)
  to service_role;
