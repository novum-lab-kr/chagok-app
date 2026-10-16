// 「적립판」 위젯(중간 크기) — PRD 4.10. 10칸(5×2). 빈칸을 누르면 다음 빈칸에 붙이고, 오늘 붙인 칸을 누르면 그 칸을 뗀다.
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
import type { TallyWidgetProps } from '../../src/widgets/widgetProps';

type Config = { background: string; goal?: string };

const ChagokTally = (props: TallyWidgetProps, env: WidgetEnvironment<Config>) => {
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
        <Text modifiers={[font({ family: F, size: 13 }), foregroundStyle(ink), lineLimit(2)]}>적립판 목표를 만들어 보세요</Text>
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
  // 앱이 그날 기준으로 준 값(오늘 붙임 등)은 무시한다 (2026-10-07 시험).
  const now = new Date();
  const entry = env.date ? new Date(env.date) : now;
  const pad = (n: number) => String(n).padStart(2, '0');
  const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const late = keyOf(now) > keyOf(entry);
  const day = late ? now : entry;
  const todayKey = keyOf(day);
  const mine = (props.requests ?? []).filter((r) => r.goalId === g.id).sort((a, b) => a.at - b.at);
  // 칸 위치는 어림이다(앱이 열리면 맞춘다). 칸 번호는 판 전체 번호(0부터), all[i]는 g.from - 1 + i번.
  // 요청은 지금 묶음과 다음 묶음을 이어 붙인 칸에 반영한다 — 지금 묶음을 다 채워도 앱 없이 다음 묶음에 붙인다 (2026-10-10 실기기).
  const all = [...g.cells, ...(g.nextCells ?? [])];
  const first = g.from - 1;
  const today = new Set(late ? [] : g.todaySlots ?? []); // 오늘 붙인 칸
  const removable = new Set(late ? [] : g.removableSlots ?? []); // 위젯에서 눌러 뗄 수 있는 칸
  let placed = g.placed;
  for (const r of mine) {
    if (r.kind === 'add') {
      const i = all.indexOf('empty');
      if (i < 0) continue;
      all[i] = 'filled';
      placed += 1;
      if (r.dateKey === todayKey) { today.add(first + i); removable.add(first + i); }
    } else if (r.kind === 'remove') {
      const i = (r.slotIndex ?? -1) - first;
      if (i < 0 || i >= all.length || all[i] !== 'filled' || !removable.has(first + i)) continue;
      all[i] = 'empty';
      placed -= 1;
      today.delete(first + i);
      removable.delete(first + i);
    } else {
      // 이전 버전 위젯이 남긴 되돌리기 — 오늘 붙인 칸 중 마지막을 뗀다
      const last = [...today].filter((s) => s >= first && s < first + all.length).sort((a, b) => b - a)[0];
      if (last === undefined) continue;
      all[last - first] = 'empty';
      placed -= 1;
      today.delete(last);
      removable.delete(last);
    }
  }
  const placedToday = today.size > 0;
  const remaining = g.remaining == null ? null : g.remaining - (placed - g.placed);
  const lastSlot = remaining !== null && remaining <= 1;
  // 지금 묶음이 다 찼고 다음 묶음이 있으면 다음 묶음을 보인다
  const size = g.cells.length;
  const shift = all.length > size && !all.slice(0, size).includes('empty') ? size : 0;
  const cells = all.slice(shift, shift + size);
  const shown = first + shift; // 보이는 칸 i는 판 전체 shown + i번
  const nextEmpty = cells.indexOf('empty');
  const rows = [cells.slice(0, 5), cells.slice(5, 10)];

  const full = placed >= g.total;
  const happy = placedToday || full;
  const word = full ? 'Done!' : placedToday ? 'Nice!' : 'Ready?';
  const bubble = props.bubbles[pal];
  const pct = Math.floor((placed / Math.max(1, g.total)) * 100);

  // 칸마다 누르는 곳 (2026-10-07 결정): 빈칸은 다음 빈칸에 붙이고(마지막 칸이면 완성 확인 화면),
  // 오늘 붙였고 기록이 없는 칸은 그 칸을 떼고, 지난날 붙인 칸·기록이 있는 칸은 판 상세를 연다.
  // 위젯은 확인 창을 띄울 수 없어 지난 기록은 위젯에서 떼지 않는다.
  const tap = (i: number, label: React.ReactElement) => {
    const slot = shown + i;
    const filled = cells[i] === 'filled';
    if (!filled && (lastSlot || g.locked)) return <Link key={`t${i}`} destination={`chagok://goal/${g.id}?place=1`}>{label}</Link>;
    if (filled && !removable.has(slot)) return <Link key={`t${i}`} destination={`chagok://goal/${g.id}`}>{label}</Link>;
    return (
      <Button
        key={`t${i}`}
        target={`cell-${i}`}
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const now = new Date();
          const p2 = (n: number) => String(n).padStart(2, '0');
          const req = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            goalId: g.id,
            kind: filled ? 'remove' : 'add',
            at: now.getTime(),
            dateKey: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`,
            ...(filled ? { slotIndex: slot } : {}),
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
        <Text modifiers={[font({ family: F, size: 17 }), foregroundStyle(ink), lineLimit(2), frame({ maxWidth: 100, alignment: 'leading' })]}>
          {g.name}
        </Text>
      </VStack>
      <VStack spacing={4} modifiers={[frame({ maxHeight: 10000 }), padding({ trailing: 12, leading: 4 })]}>
        {rows.map((row, r) => (
          <HStack key={`r${r}`} spacing={4}>
            {row.map((state, c) => {
              const i = r * 5 + c;
              return tap(
                i,
                state === 'filled' ? (
                  <Image uiImage={g.sticker} modifiers={[resizable(), frame({ width: 22, height: 22 }), frame({ width: 26, height: 26 }), contentShape(shapes.rectangle())]} />
                ) : (
                  <ZStack modifiers={[frame({ width: 26, height: 26 }), contentShape(shapes.rectangle())]}>
                    <Text modifiers={[font({ family: F, size: 10 }), foregroundStyle(ink), opacity(0.7), frame({ width: 26, height: 26 })]}>
                      {String(shown + 1 + i)}
                    </Text>
                    {i === nextEmpty ? brackets(26, 26, 8, 2) : null}
                  </ZStack>
                ),
              );
            })}
          </HStack>
        ))}
      </VStack>
    </HStack>
  );
};

export default createWidget<TallyWidgetProps, Config>('ChagokTally', ChagokTally);
