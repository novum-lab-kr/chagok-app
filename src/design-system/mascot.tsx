import React from 'react';
import { Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import source from '../../docs/design/character/character-data.json';
import { retro } from './tokens';

// docs/design/character/character-data.json is the only source of the drawings.
export type MascotFace = keyof typeof source.faces;
export type MascotVariant = keyof typeof source.variants;
export type MascotBlocks = keyof typeof source.blockStates;
export type MascotPose = MascotFace | MascotVariant | MascotBlocks;

export const mascotFaces = Object.keys(source.faces) as MascotFace[];
export const mascotVariants = Object.keys(source.variants) as MascotVariant[];
export const mascotBlockStates = Object.keys(source.blockStates) as MascotBlocks[];

const art: Record<MascotPose, readonly string[]> = { ...source.faces, ...source.variants, ...source.blockStates };

const cellColor: Record<string, string> = {
  '#': retro.color.ink,
  g: retro.color.lcd,
  o: retro.color.primary,
  w: retro.color.secondary,
  m: retro.color.screen,
};

/** One path per colour; horizontal runs of the same cell become one rectangle. */
export function mascotPaths(rows: readonly string[]): { color: string; d: string }[] {
  const byCell = new Map<string, string[]>();
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const cell = row[x];
      let end = x + 1;
      while (row[end] === cell) end += 1;
      if (cell !== '.') {
        if (!cellColor[cell]) throw new Error(`Unknown mascot cell "${cell}" at row ${y}`);
        byCell.set(cell, [...(byCell.get(cell) ?? []), `M${x} ${y}H${end}V${y + 1}H${x}Z`]);
      }
      x = end;
    }
  });
  return [...byCell].map(([cell, rects]) => ({ color: cellColor[cell], d: rects.join(' ') }));
}

const pathsByPose = new Map<MascotPose, ReturnType<typeof mascotPaths>>();
function posePaths(pose: MascotPose) {
  let paths = pathsByPose.get(pose);
  if (!paths) {
    paths = mascotPaths(art[pose]);
    pathsByPose.set(pose, paths);
  }
  return paths;
}

/** Main character 「차곡이」. Decorative unless a label is given. */
export function Mascot({ pose = 'basic', size = 96, label }: { pose?: MascotPose; size?: number; label?: string }) {
  const a11y = label
    ? Platform.OS === 'web'
      ? { role: 'img' as const, 'aria-label': label }
      : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: label }
    : Platform.OS === 'web'
      ? { 'aria-hidden': true }
      : { accessible: false };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" {...a11y}>
      {posePaths(pose).map(p => <Path key={p.color} d={p.d} fill={p.color} />)}
    </Svg>
  );
}
