import type { PropsWithChildren, ReactNode } from 'react';
import { useFonts } from 'expo-font';

/** Mount once above native screens. Never expose a fallback font as finished UI. */
export function RetroFontProvider({ children, loading = null }: PropsWithChildren<{ loading?: ReactNode }>) {
  const [loaded, error] = useFonts({
    NeoDunggeunmo: require('./assets/neodgm-1.601.ttf'),
  });
  if (error) throw error;
  return loaded ? children : loading;
}
