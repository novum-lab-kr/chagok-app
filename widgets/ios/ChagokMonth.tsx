// 「이번 달」 위젯(중간 크기, 달력판) — PRD 4.10. 달력을 누르면 오늘 칸에 붙이고 떼며, 마지막 칸이면 앱을 연다.
import { Button, HStack, Image, Link, Rectangle, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  containerBackground,
  contentShape,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  offset,
  opacity,
  padding,
  resizable,
  shapes,
  widgetURL,
} from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';
import type { MonthWidgetProps } from '../../src/widgets/widgetProps';

type Config = { background: string; goal?: string };

const ChagokMonth = (props: MonthWidgetProps, env: WidgetEnvironment<Config>) => {
  'widget';
  // 바탕은 고른 색 그대로 — 홈 화면 라이트·다크를 따르지 않는다(2026-10-06 사용자 결정).
  const pal = env.configuration?.background === 'white' ? 'white' : env.configuration?.background === 'ink' ? 'ink' : 'ivory';
  const bg = pal === 'white' ? '#FFFFFF' : pal === 'ink' ? '#1A1A1C' : '#FEF1D1';
  const ink = pal === 'white' ? '#1C2321' : pal === 'ink' ? '#FEF1D1' : '#06261C';
  const acc = pal === 'white' ? '#D2502A' : pal === 'ink' ? '#FD9B7A' : '#C2451F';
  const F = 'NeoDunggeunmo';
  // 지금 붙일 칸: 앱 판의 PixelFocusRing처럼 네 귀퉁이 괄호 (2026-10-16 결정 6 T1, 이전: 살구 테두리)
  const brackets = (w: number, h: number, arm: number, t: number) => (
    <ZStack modifiers={[frame({ width: w, height: h })]}>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].flatMap(([sx, sy], k) => [
        <Rectangle key={`h${k}`} modifiers={[frame({ width: arm, height: t }), foregroundStyle(ink), offset({ x: sx * (w / 2 - arm / 2), y: sy * (h / 2 - t / 2) })]} />,
        <Rectangle key={`v${k}`} modifiers={[frame({ width: t, height: arm }), foregroundStyle(ink), offset({ x: sx * (w / 2 - t / 2), y: sy * (h / 2 - arm / 2) })]} />,
      ])}
    </ZStack>
  );
  const g = props.goals[env.configuration?.goal ?? ''] ?? (props.defaultId ? props.goals[props.defaultId] : undefined);
  if (!g) {
    // 목표가 없으면 졸린 차곡이와 안내 — 누르면 새 목표 화면(PRD 4.10 「목표가 없을 때」)
    return (
      <VStack
        spacing={6}
        modifiers={[containerBackground(bg, 'widget'), widgetURL('chagok://goal/new'), frame({ maxWidth: 10000, maxHeight: 10000 })]}>
        <Image uiImage={props.mascotSleepy} modifiers={[resizable(), frame({ width: 40, height: 40 })]} />
        <Text modifiers={[font({ family: F, size: 13 }), foregroundStyle(ink), lineLimit(2)]}>달력판 목표를 만들어 보세요</Text>
        <Link destination="chagok://goal/new">
          <Text
            modifiers={[
              font({ family: F, size: 13 }),
              foregroundStyle('#06261C'),
              padding({ top: 6, bottom: 6, leading: 14, trailing: 14 }),
              background('#FD855F', shapes.roundedRectangle({ cornerRadius: 10 })),
            ]}>
            목표 만들기
          </Text>
        </Link>
      </VStack>
    );
  }

  // 그릴 값 = 앱이 준 값 + 아직 처리 안 된 요청. 날짜는 이 타임라인 항목의 시각(자정 항목이면 다음 날).
  // 이 타임라인 항목의 시각. expo-widgets는 timestamp를 env.date(Date)로 바꿔 넘긴다(expo-widgets/bundle/index.ts).
  // 시스템이 자정 항목을 미리(자정 전에) 그려 두므로 지금 시각(Date.now)을 쓰면 안 된다.
  // 단, 항목이 바닥나 지난날 항목을 다시 그릴 때(앱을 며칠 안 열고 위젯을 누름)는 지금 날짜를 오늘로 쓰고,
  // 앱이 그날 기준으로 준 값(오늘 붙임 등)은 무시한다 (2026-10-08).
  const now = new Date();
  const entry = env.date ? new Date(env.date) : now;
  const pad = (n: number) => String(n).padStart(2, '0');
  const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const late = keyOf(now) > keyOf(entry);
  const day = late ? now : entry;
  const todayKey = keyOf(day);
  const mine = (props.requests ?? []).filter((r) => r.goalId === g.id).sort((a, b) => a.at - b.at);
  let net = 0;
  let todayState: boolean | null = null; // 오늘 날짜 요청의 마지막 결과: true 붙임, false 뗌
  for (const r of mine) {
    net += r.kind === 'add' ? 1 : -1;
    if (r.dateKey === todayKey) todayState = r.kind === 'add';
  }
  const placedToday = todayState ?? (late ? false : g.placedToday);
  const undoable = todayState ?? (late ? false : g.undoable);
  const placed = Math.max(0, g.placed + net);
  const remaining = g.remaining == null ? null : g.remaining - net;
  const lastSlot = remaining !== null && remaining <= 1;
  // 이번 달 칸: 이 달 요청을 반영한다. 오늘 칸은 이 항목의 날짜 기준.
  const days = g.days.slice();
  const sameMonth = g.monthLabel === `${day.getMonth() + 1}월`; // 칸이 이 항목의 달일 때만 요청을 합친다
  for (const r of mine) {
    if (!sameMonth || !r.dateKey.startsWith(todayKey.slice(0, 8))) continue; // 이 달 요청만
    const i = Number(r.dateKey.slice(8, 10)) - 1;
    if (days[i] === undefined || days[i] === 'outside') continue;
    days[i] = r.kind === 'add' ? 'filled' : r.dateKey < todayKey ? 'missed' : 'future';
  }
  const todayDay = sameMonth ? day.getDate() : 0;
  const cells: { day: number; state: string }[] = [];
  for (let i = 0; i < g.firstWeekday; i++) cells.push({ day: 0, state: 'blank' });
  days.forEach((state, i) => cells.push({ day: i + 1, state }));
  while (cells.length % 7 !== 0) cells.push({ day: 0, state: 'blank' });
  const weeks: { day: number; state: string }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const full = placed >= g.total;
  const happy = placedToday || full;
  const word = full ? 'Done!' : placedToday ? 'Nice!' : 'Ready?';
  const bubble = props.bubbles[pal];
  const pct = Math.floor((placed / Math.max(1, g.total)) * 100);

  // 칸마다 누르는 곳 (2026-10-08 — 지난 날짜도 위젯에서 붙이기, PRD 4.10): 지난 빈 날·오늘 빈 칸은 그 날짜에 붙이고
  // (마지막 칸이면 완성 확인 화면), 오늘 붙인 칸은 떼고(기록 있으면 판 상세), 그 밖에 붙인 칸은 판 상세를 연다. 앞날·기간 밖은 누르지 않는다.
  const tap = (key: string, c: { day: number; state: string }, label: React.ReactElement) => {
    if (c.day === 0 || !sameMonth) return label;
    const isToday = c.day === todayDay;
    const filled = c.state === 'filled';
    if (!filled && !isToday && c.state !== 'missed') return label;
    if (!filled && (lastSlot || g.locked)) return <Link key={key} destination={`chagok://goal/${g.id}?place=1`}>{label}</Link>;
    if (filled && !(isToday && undoable)) return <Link key={key} destination={`chagok://goal/${g.id}`}>{label}</Link>;
    const dateKey = `${todayKey.slice(0, 8)}${String(c.day).padStart(2, '0')}`;
    return (
      <Button
        key={key}
        target={`day-${c.day}`}
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const now = new Date();
          const req = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            goalId: g.id,
            kind: filled ? 'undo' : 'add',
            at: now.getTime(),
            dateKey,
          };
          return { requests: [...(props.requests ?? []), req] };
        }}>
        {label}
      </Button>
    );
  };
  return (
    <HStack spacing={0} modifiers={[containerBackground(bg, 'widget'), widgetURL(`chagok://goal/${g.id}`)]}>
      <VStack
        alignment="leading"
        spacing={0}
        modifiers={[frame({ maxWidth: 10000, maxHeight: 10000, alignment: 'topLeading' }), padding({ top: 16, leading: 16, bottom: 14, trailing: 4 })]}>
        <HStack alignment="lastTextBaseline" spacing={0}>
          <Text modifiers={[font({ family: F, size: 38 }), foregroundStyle(ink)]}>{String(pct)}</Text>
          <Text modifiers={[font({ family: F, size: 20 }), foregroundStyle(ink)]}>%</Text>
        </HStack>
        <Spacer />
        <ZStack alignment="topLeading" modifiers={[frame({ width: 110, height: 36, alignment: 'topLeading' }), padding({ bottom: 8 })]}>
          <Image
            uiImage={full ? props.mascotFull : placedToday ? props.mascotDone : props.mascotYet}
            modifiers={[resizable(), frame({ width: 36, height: 36 }), offset({ x: -4 })]}
          />
          <ZStack modifiers={[frame({ width: 64, height: 28 }), offset({ x: 30, y: -10 })]}>
            <Image uiImage={bubble} modifiers={[resizable(), frame({ width: 64, height: 28 })]} />
            <Text modifiers={[font({ family: F, size: 12 }), foregroundStyle(happy ? acc : ink), offset({ x: 0.5, y: -1.5 })]}>{word}</Text>
          </ZStack>
        </ZStack>
        <Text modifiers={[font({ family: F, size: 17 }), foregroundStyle(ink), lineLimit(2), frame({ maxWidth: 140, alignment: 'leading' })]}>
          {g.name}
        </Text>
      </VStack>
      <VStack alignment="leading" spacing={2} modifiers={[frame({ maxHeight: 10000 }), padding({ trailing: 12 })]}>
        <Text modifiers={[font({ family: F, size: 11 }), foregroundStyle(ink), opacity(0.6)]}>{g.monthLabel}</Text>
        {weeks.map((week, w) => (
          <HStack key={`w${w}`} spacing={2}>
            {week.map((c, i) =>
              tap(
                `c${w}-${i}`,
                c,
                c.state === 'filled' ? (
                  <Image key={`c${w}-${i}`} uiImage={g.sticker} modifiers={[resizable(), frame({ width: 20, height: 20 }), frame({ width: 22, height: 20 }), contentShape(shapes.rectangle())]} />
                ) : (
                  <ZStack key={`c${w}-${i}`} modifiers={[frame({ width: 22, height: 20 }), contentShape(shapes.rectangle())]}>
                    <Text
                      modifiers={[
                        font({ family: F, size: 10 }),
                        foregroundStyle(ink),
                        opacity(c.day === 0 || c.state === 'outside' ? 0 : c.state === 'future' && c.day !== todayDay ? 0.55 : 0.7),
                        frame({ width: 22, height: 20 }),
                      ]}>
                      {c.day === 0 || c.state === 'outside' ? ' ' : String(c.day)}
                    </Text>
                    {c.day === todayDay ? brackets(22, 20, 7, 2) : null}
                  </ZStack>
                ),
              ),
            )}
          </HStack>
        ))}
      </VStack>
    </HStack>
  );
};

export default createWidget<MonthWidgetProps, Config>('ChagokMonth', ChagokMonth);
