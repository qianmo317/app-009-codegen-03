import type { KnitInput, KnitParams, Measurements, Gauge } from './types';

export const DEFAULT_PARAMS: KnitParams = {
  ease: 8, // 胸围放松量 cm（套头衫常用 6~10）
  ribHeight: 5, // 罗纹高
  neckWidth: 18, // 领宽
  backNeckDepth: 2, // 后领深
  frontNeckDepth: 7, // 前领深
  armholeDepth: 20, // 袖窿深
  cuffWidth: 20, // 袖口围
  upperArm: 32, // 上臂围（含松量）
  capHeight: 13, // 袖山高
};

export const DEFAULT_MEASUREMENTS: Measurements = {
  bust: 90,
  length: 60,
  sleeve: 56,
  shoulderAcross: 38,
};

/** 常见线材密度预设（10cm） */
export const YARN_PRESETS: { name: string; gauge: Gauge }[] = [
  { name: '细羊毛 / 中细线（3.0mm 针）', gauge: { sts: 26, rows: 34 } },
  { name: '普通中粗线（4.0mm 针）', gauge: { sts: 20, rows: 28 } },
  { name: '粗毛线（5.0mm 针）', gauge: { sts: 15, rows: 20 } },
  { name: '超粗线（6.0mm 针）', gauge: { sts: 11, rows: 15 } },
];

let seq = 1;
export function defaultInput(): KnitInput {
  return {
    yarnName: `方案 ${seq++}（普通中粗线）`,
    gauge: { ...YARN_PRESETS[1].gauge },
    m: { ...DEFAULT_MEASUREMENTS },
    p: { ...DEFAULT_PARAMS },
  };
}
