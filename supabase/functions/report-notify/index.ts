// 신고 알림 메일 (20261106000005_report_notify.sql). 앱이 신고(report RPC)한 직후 부른다(로그인한 사람 누구나).
// 아직 알리지 않은 신고를 모아 운영자 메일로 한 통 보내고 알린 것으로 표시한다. 보내지 못하면 표시하지 않아 다음 호출이 다시 보낸다.
// 메일은 Gmail SMTP(465, TLS)로 보낸다. Supabase 클라우드 Edge Function은 25와 587 포트를 막아 465를 쓴다.
// 필요한 비밀 설정: GMAIL_USER, GMAIL_APP_PASSWORD(Google 앱 비밀번호), REPORT_NOTIFY_TO(받는 주소, 없으면 GMAIL_USER).
// 메일에는 신고 내용(목표 이름, 신고된 이름, 사유)만 넣고 신고한 사람과 신고된 사람의 계정 정보는 넣지 않는다(처리방침 2판).
import nodemailer from 'npm:nodemailer@6.9.16';
import { adminClient, json, userIdFrom } from '../_shared/auth.ts';

type Row = { id: string; goal_id: string | null; goal_name: string | null; target_name: string | null; reason: string; created_at: number; target_is_goal: boolean };

const kst = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().replace('T', ' ').slice(0, 16) + ' (KST)';

function body(rows: Row[]): string {
  const items = rows.map((r, i) => [
    `${i + 1}. ${kst(r.created_at)}`,
    `   대상: ${r.target_is_goal ? '목표 이름' : '함께하는 사람의 이름'} 「${r.target_name ?? '(이름 없음)'}」`,
    `   목표: ${r.goal_name ?? '(지워진 목표)'} (${r.goal_id ?? '-'})`,
    `   사유: ${r.reason}`,
    `   신고 id: ${r.id}`,
  ].join('\n'));
  return [
    `차곡차곡 함께 목표에 신고가 ${rows.length}건 들어왔어요. 24시간 안에 확인해 주세요.`,
    '처리: 이름을 지우거나 그 사람을 내보내고, 처리한 신고는 reports.handled_at에 시각을 남깁니다.',
    '',
    ...items,
  ].join('\n');
}

Deno.serve(async (req) => {
  if (!(await userIdFrom(req))) return json({ error: 'unauthorized' }, 401);
  const user = Deno.env.get('GMAIL_USER');
  const pass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!user || !pass) {
    console.error('report-notify: mail secrets missing');
    return json({ error: 'not_configured' }, 500);
  }
  const admin = adminClient();
  const taken = await admin.rpc('admin_take_unnotified_reports', { p_limit: 20 });
  if (taken.error) {
    console.error('report-notify: take failed', taken.error.message);
    return json({ error: 'take_failed' }, 500);
  }
  const rows = (taken.data ?? []) as Row[];
  if (!rows.length) return json({ ok: true, sent: 0 });
  try {
    const transport = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user, pass } });
    await transport.sendMail({
      from: `차곡차곡 신고 알림 <${user}>`,
      to: Deno.env.get('REPORT_NOTIFY_TO') || user,
      subject: `[신고] 차곡차곡 함께 목표 ${rows.length}건`,
      text: body(rows),
    });
  } catch (error) {
    console.error('report-notify: send failed', error instanceof Error ? error.message : String(error));
    return json({ error: 'send_failed' }, 502);
  }
  const marked = await admin.rpc('admin_mark_reports_notified', { p_ids: rows.map((r) => r.id) });
  if (marked.error) {
    // 메일은 갔다. 표시하지 못하면 다음 호출이 같은 신고를 한 번 더 보낸다(빠뜨리는 것보다 낫다)
    console.error('report-notify: mark failed', marked.error.message);
    return json({ error: 'mark_failed' }, 500);
  }
  return json({ ok: true, sent: rows.length });
});
