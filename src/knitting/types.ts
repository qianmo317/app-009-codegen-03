// 尺寸换算编织指引：类型定义

/** 织片密度：10cm 内的针数 / 行数 */
export interface Gauge {
  sts: number;
  rows: number;
}

/** 身材尺寸（净尺寸，cm） */
export interface Measurements {
  bust: number; // 净胸围
  length: number; // 衣长（后中长，含罗纹）
  sleeve: number; // 袖长（肩线到袖口，含罗纹）
  shoulderAcross: number; // 肩宽（左肩缝到右肩缝）
}

/** 款式参数（cm，均有推荐值，可调） */
export interface KnitParams {
  ease: number; // 胸围放松量
  ribHeight: number; // 底摆 / 袖口罗纹高
  neckWidth: number; // 领宽
  backNeckDepth: number; // 后领深
  frontNeckDepth: number; // 前领深
  armholeDepth: number; // 袖窿（挂肩）深
  cuffWidth: number; // 袖口宽（围）
  upperArm: number; // 上臂围（含放松量）
  capHeight: number; // 袖山高
}

export interface KnitInput {
  yarnName: string;
  gauge: Gauge;
  m: Measurements;
  p: KnitParams;
}

export type Dir = 'exact' | 'up' | 'down';

/** 一次「折算 → 就近取值」的说明 */
export interface Rounded {
  label: string; // 项目名
  raw: number; // 折算原始值
  value: number; // 最终采用值
  unit: string; // 针 / 行 / cm
  dir: Dir; // 往哪边取
  actualCm?: number; // 该取值对应的实际尺寸
  note: string; // 完整说明
}

export type ShapingKind = 'inc' | 'dec';

/** 减/加针表中的一行（一次操作） */
export interface ShapingEvent {
  no: number; // 第几次
  rowAbs: number; // 从第 1 行（起针行）起算的绝对行号
  rowInSection: number; // 本段内行号
  gap: number; // 距上一次操作几行（第一次为距起手行）
  off: number; // 每侧一次几针
  pieceTotalAfter: number | null; // 操作后整片针数
  sideAfter: number | null; // 操作后单侧针数（领窝用）
}

/** 一段塑形（袖窿 / 领窝 / 袖身加针 / 袖山）的完整排布 */
export interface ShapingPlan {
  kind: ShapingKind;
  name: string;
  perSide: boolean; // 是否两侧对称
  bo: number; // 第 1 行每侧平收针数（0 表示无）
  centerHold: number; // 第 1 行中间留针数（领窝用）
  events: ShapingEvent[];
  tailRows: number; // 末次操作后平织行数
  sectionRows: number;
  sectionStartAbs: number;
  gaps: number[]; // 实际间隔
  intervalRaw: number; // 平均间隔折算值（行）
  intervalNote: string;
  summary: string;
  fallback: boolean; // 是否触发了针数太密的兜底
}

export interface PieceBack {
  castOn: Rounded;
  totalRows: Rounded;
  ribRows: Rounded;
  straightRows: number;
  armholeStartRow: number;
  armholeDecPerSide: number;
  armhole: ShapingPlan;
  backNeck: ShapingPlan;
  backHoldSts: number;
  shoulderSts: number;
  backNeckStartRow: number;
  backNeckRows: number;
}

export interface PieceFront {
  castOnSts: number;
  totalRowsSts: number;
  armholeStartRow: number;
  armhole: ShapingPlan;
  frontHoldSts: number;
  neckDecPerSide: number;
  neckStartRow: number;
  neckRows: number;
  neck: ShapingPlan;
  shoulderSts: number;
}

export interface PieceSleeve {
  cuffCastOn: Rounded;
  upperSts: Rounded;
  ribRows: number;
  totalRows: Rounded;
  increase: ShapingPlan;
  incPerSide: number;
  capStartRow: number;
  capRows: Rounded;
  capTopSts: number;
  capBo: number;
  capDecPerSide: number;
  cap: ShapingPlan;
}

export interface KnitResult {
  pitchSt: number; // 一针宽 cm
  pitchRow: number; // 一行高 cm
  back: PieceBack;
  front: PieceFront;
  sleeve: PieceSleeve;
  notes: Rounded[]; // 所有就近取值说明
  warnings: string[];
  plainText: string;
}

export interface SavedVersion {
  id: string;
  name: string; // v1 / v2 ...
  createdAt: number;
  input: KnitInput;
  result: KnitResult;
}
