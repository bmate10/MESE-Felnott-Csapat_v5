import type { CSSProperties } from 'react';
import clayCourt from '../assets/clay-court.svg';

// Top-down clay court under a dark terracotta tint so white text stays readable.
export const heroBackground: CSSProperties = {
  backgroundImage: `linear-gradient(135deg, rgb(60 21 10 / 0.72), rgb(60 21 10 / 0.30) 55%, rgb(60 21 10 / 0.62)), url("${clayCourt}")`,
};
