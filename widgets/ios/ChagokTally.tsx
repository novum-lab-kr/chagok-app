// 「적립판」 위젯(중간 크기) — PRD 4.10. 10칸(5×2)을 누르면 다음 빈칸에 붙이고 떼며, 마지막 칸이면 앱을 연다.
import { Button, HStack, Image, Link, Spacer, Text, VStack, ZStack } from '@expo/ui/swift-ui';
import {
  background,
  border,
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
  const day = env.date ? new Date(env.date) : new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const todayKey = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
  const mine = (props.requests ?? []).filter((r) => r.goalId === g.id).sort((a, b) => a.at - b.at);
  let net = 0;
  let todayState: boolean | null = null; // 오늘 날짜 요청의 마지막 결과: true 붙임, false 뗌
  for (const r of mine) {
    net += r.kind === 'add' ? 1 : -1;
    if (r.dateKey === todayKey) todayState = r.kind === 'add';
  }
  const placedToday = todayState ?? g.placedToday;
  const undoable = todayState ?? g.undoable;
  const placed = Math.max(0, g.placed + net);
  const remaining = g.remaining == null ? null : g.remaining - net;
  const lastSlot = remaining !== null && remaining <= 1;
  // 칸 위치는 어림이다(앱이 열리면 맞춘다). 처리 안 된 요청만큼 앞의 빈 칸을 채우고, 음수면 뒤의 찬 칸을 비운다.
  const cells = g.cells.slice();
  for (let k = 0; k < Math.abs(net); k++) {
    if (net > 0) {
      const i = cells.indexOf('empty');
      if (i >= 0) cells[i] = 'filled';
    } else {
      const i = cells.lastIndexOf('filled');
      if (i >= 0) cells[i] = 'empty';
    }
  }
  const nextEmpty = cells.indexOf('empty');
  const rows = [cells.slice(0, 5), cells.slice(5, 10)];

  const full = placed >= g.total;
  const happy = placedToday || full;
  const word = full ? 'Done!' : placedToday ? 'Nice!' : 'Ready?';
  const bubble = props.bubbles[pal];
  const pct = Math.floor((placed / Math.max(1, g.total)) * 100);

  // 누르는 곳: 마지막 칸은 완성 확인 화면, 기록이 있으면 판 상세, 그 밖에는 위젯 안에서 붙이고 뗀다.
  const tap = (label: React.ReactElement) => {
    if (lastSlot && !placedToday) return <Link destination={`chagok://goal/${g.id}?place=1`}>{label}</Link>;
    if (placedToday && !undoable) return <Link destination={`chagok://goal/${g.id}`}>{label}</Link>;
    return (
      <Button
        target="place"
        modifiers={[buttonStyle('plain')]}
        onPress={() => {
          const kind = placedToday ? 'undo' : 'add';
          const now = new Date();
          const p2 = (n: number) => String(n).padStart(2, '0');
          const req = {
            id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
            goalId: g.id,
            kind,
            at: now.getTime(),
            dateKey: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`,
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
      {tap(
        <VStack spacing={4} modifiers={[frame({ maxHeight: 10000 }), contentShape(shapes.rectangle()), padding({ trailing: 12, leading: 4 })]}>
          {rows.map((row, r) => (
            <HStack key={`r${r}`} spacing={4}>
              {row.map((state, c) => {
                const i = r * 5 + c;
                return state === 'filled' ? (
                  <Image key={`t${i}`} uiImage={g.sticker} modifiers={[resizable(), frame({ width: 22, height: 22 }), frame({ width: 26, height: 26 })]} />
                ) : (
                  <Text
                    key={`t${i}`}
                    modifiers={[
                      font({ family: F, size: 10 }),
                      foregroundStyle(ink),
                      opacity(0.7),
                      frame({ width: 26, height: 26 }),
                      ...(i === nextEmpty ? [border({ color: '#FD855F', width: 2 })] : []),
                    ]}>
                    {String(g.from + i)}
                  </Text>
                );
              })}
            </HStack>
          ))}
        </VStack>,
      )}
    </HStack>
  );
};

export default createWidget<TallyWidgetProps, Config>('ChagokTally', ChagokTally);
