-- 신고 알림 메일 (2026-11-06, 설계: docs/superpowers/specs/2026-11-04-friends-goal-dev-design.md 「신고 알림」).
-- 신고(public.report)가 들어오면 운영자 메일(chagok.app.help@gmail.com)로 알린다. 운영 목표: 24시간 안에 확인.
-- 설계는 DB 웹훅이었지만, 서버마다 함수 주소를 DB에 넣지 않으려고 purge-photos와 같은 방식으로 바꿨다:
-- 앱이 신고한 직후 Edge Function report-notify를 부르고, 함수가 아직 알리지 않은 신고를 모아 메일로 보낸 뒤 표시한다.
-- 한 번 실패해도 다음 신고 때 함께 간다.

alter table public.reports add column notified_at bigint;
create index reports_unnotified on public.reports (created_at) where notified_at is null;

-- report-notify만 service_role로 부른다. 아직 알리지 않은 신고를 오래된 것부터 p_limit개(1~50).
create function public.admin_take_unnotified_reports(p_limit int) returns table (
  id uuid, goal_id uuid, goal_name text, target_name text, reason text, created_at bigint, target_is_goal boolean
)
language sql stable security definer set search_path = '' as $$
  select r.id, r.goal_id, g.name, r.target_name, r.reason, r.created_at, r.target_user_id is null
  from public.reports r left join public.goals g on g.id = r.goal_id
  where r.notified_at is null
  order by r.created_at
  limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

create function public.admin_mark_reports_notified(p_ids uuid[]) returns void
language sql security definer set search_path = '' as $$
  update public.reports set notified_at = private.now_ms() where id = any(p_ids) and notified_at is null;
$$;

revoke execute on function public.admin_take_unnotified_reports(int), public.admin_mark_reports_notified(uuid[])
  from public, anon, authenticated;
grant execute on function public.admin_take_unnotified_reports(int), public.admin_mark_reports_notified(uuid[]) to service_role;
