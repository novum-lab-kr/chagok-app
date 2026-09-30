-- 계정 삭제용 (delete-account Edge Function만 service_role로 부른다).
create function public.admin_has_apple_token(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.apple_tokens where user_id = p_user);
$$;

create function public.admin_delete_user_rows(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.records where user_id = p_user;
  delete from public.stickers where user_id = p_user;
  delete from public.goals where user_id = p_user;
  delete from public.accounts where user_id = p_user;
end $$;

revoke execute on function public.admin_has_apple_token(uuid), public.admin_delete_user_rows(uuid) from public, anon, authenticated;
grant execute on function public.admin_has_apple_token(uuid), public.admin_delete_user_rows(uuid) to service_role;
