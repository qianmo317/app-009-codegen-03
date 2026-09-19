/**
 * 尺寸换算核心引擎（纯函数）。
 *
 * 约定：本工具计算的是「片织缝合款」的基础版型（前片/后片相同），
 * 从下摆/袖口往上织；袖山部分做了简化（平收 + 均匀单针减针），
 * 领口、圆领挖领等细节不包含在计算内。
 *
 * 针数四舍五入时，为保证左右对称，所有「整片针数」都会就近取到偶数：
 * 出现半点时一律向上取整（宁大勿小，可在缝合时收掉半厘米余量）。
 * 行数为织片计数，一律就近取整为整数，半点向上取整。
 */

export interface Measurements {
  /** 成衣胸围（含松量的成品尺寸），cm */
  bust: number;
  /** 后中衣长，cm */
  length: number;
  /** 袖长：肩点到袖口（含袖山），cm */
  sleeveLength: number;
  /** 挂肩（袖窿）高度，cm；0 表示按胸围默认值（胸围/10+9） */
  armholeDepth: number;
  /** 肩宽，cm；0 表示按胸围默认值（胸围×0.38） */
  shoulderWidth: number;
  /** 上臂根（腋下袖肥）围度，cm；0 表示按胸围默认值（胸围×0.32+6） */
  bicep: number;
  /** 袖口围度，cm；0 表示按胸围默认值（胸围×0.2+2） */
  cuff: number;
  /** 袖山高度，cm；0 表示按挂肩默认值（挂肩×2/3） */
  capHeight: number;
}

export interface GaugeInput {
  /** 织片密度：10cm 内针数 */
  stsPer10cm: number;
  /** 织片密度：10cm 内行数 */
  rowsPer10cm: number;
}

export interface RoundingNote {
  /** 取整对象，如「后片起针」 */
  target: string;
  /** 换算出的精确值 */
  exact: number;
  /** 就近取定的值 */
  rounded: number;
  /** 单位 */
  unit: string;
  /** 取值方向说明 */
  direction: string;
}

export type ShapeKind = 'decrease' | 'increase';

export interface ShapeEvent {
  /** 该动作在本部位内的行号（从第 1 行起算） */
  row: number;
  /** 该行每侧（左右各）的针数；加针/减针均为正整数 */
  perSide: number;
  /** 动作后本部位一侧的累计针数（整片为其 2 倍） */
  runningStsPerSide: number;
  note: string;
}

export interface ShapeSchedule {
  kind: ShapeKind;
  /** 整个塑形区间的行数 */
  zoneRows: number;
  /** 区间起始行（本部位内行号） */
  startRow: number;
  /** 区间结束行（本部位内行号） */
  endRow: number;
  /** 每个动作每侧针数（单针减针 = 1） */
  perSide: number;
  /** 一侧总共需要变化的针数 */
  totalPerSide: number;
  /** 动作次数（每次落在一行上，两侧同时变化） */
  eventCount: number;
  /** 逐行动作表 */
  events: ShapeEvent[];
  /** 人类可读的间隔摘要，如「每 4 行减 1 针 ×8，再每 3 行减 1 针 ×1」 */
  summary: string;
}

export interface BodyResult {
  /** 整片起针数（偶数） */
  castOn: number;
  castOnNote?: RoundingNote;
  /** 起针对应的实际单片宽度 cm */
  actualWidthCm: number;
  /** 衣长总行数（下摆起算） */
  totalRows: number;
  totalRowsNote?: RoundingNote;
  /** 挂肩高度行数（腋下减针起算到肩部） */
  armholeRows: number;
  armholeRowsNote?: RoundingNote;
  /** 腋下平织行数（起针到开始减挂肩） */
  straightRows: number;
  /** 整片肩部留针（偶数） */
  shoulderSts: number;
  shoulderStsNote?: RoundingNote;
  /** 一侧的挂肩减针数（含起始平收） */
  armholeDecPerSide: number;
  /** 挂肩起始每侧平收针数 */
  initialBindOffPerSide: number;
  /** 挂肩单针减针计划 */
  singleSchedule?: ShapeSchedule;
  /** 挂肩减针逐行表（含起始平收行），行号按整片计 */
  events: ShapeEvent[];
}

export interface SleeveResult {
  /** 袖口起针数（偶数） */
  castOn: number;
  castOnNote?: RoundingNote;
  /** 袖肥整片针数（偶数） */
  upperSts: number;
  upperStsNote?: RoundingNote;
  /** 腋下袖长 cm */
  underarmLengthCm: number;
  /** 腋下段行数（袖口到袖山开始） */
  underarmRows: number;
  /** 袖山高度行数 */
  capRows: number;
  capRowsNote?: RoundingNote;
  /** 整片总行数 */
  totalRows: number;
  /** 一侧的袖身加针数 */
  taperIncPerSide: number;
  /** 袖身加针计划（从袖口数，袖口起针后加针到袖肥） */
  taperSchedule?: ShapeSchedule;
  /** 一侧的袖山减针数（含起始平收） */
  capDecPerSide: number;
  /** 袖山起始每侧平收针数 */
  capBindOffPerSide: number;
  /** 袖顶最后一次性平收的针数（整片） */
  topBindOff: number;
  /** 袖山单针减针计划 */
  capSchedule?: ShapeSchedule;
  /** 袖山减针逐行表（行号按整片计） */
  capEvents: ShapeEvent[];
}

export interface SizingResult {
  measurements: Required<Measurements>;
  gauge: GaugeInput;
  /** 每厘米针数 / 行数（密度换算结果） */
  stsPerCm: number;
  rowsPerCm: number;
  body: BodyResult;
  sleeve: SleeveResult;
  /** 所有就近取值的说明 */
  notes: RoundingNote[];
  /** 计算过程中的假设/提示，如「袖山做了简化」 */
  assumptions: string[];
  errors: string[];
}

const STS = '针';
const ROWS = '行';

/** 四舍五入（半点向上）为整数 */
export function roundHalfUp(x: number): number {
  return Math.round(x + 1e-9);
}

/**
 * 把 cm 宽度换算成「整片」偶数针数。
 * 半点优先向上取整，再归到偶数（保证左右各一半针数相同）。
 */
function widthToEvenStitches(
  widthCm: number,
  stsPerCm: number,
  target: string,
  notes: RoundingNote[],
): { sts: number; exact: number; note: RoundingNote } {
  const exact = widthCm * stsPerCm;
  const nearest = roundHalfUp(exact);
  let sts = nearest;
  let direction: string;
  if (Math.abs(exact - nearest) <= 1e-6) {
    direction = '正好是整数';
  } else if (nearest > exact) {
    direction = `不是整数，就近四舍五入向上取到 ${nearest}`;
  } else {
    direction = `不是整数，就近四舍五入向下取到 ${nearest}`;
  }
  if (sts % 2 !== 0) {
    sts += 1;
    direction += `；${nearest} 为奇数，为保证左右两侧针数相同，再向上取到偶数 ${sts}（最终比精确值${sts >= exact ? '略大' : '略小'}，可在缝合时消化余量）`;
  }
  const note: RoundingNote = { target, exact, rounded: sts, unit: STS, direction };
  notes.push(note);
  return { sts, exact, note };
}

/** cm 长度换算为整数行数（半点向上） */
function lengthToRows(
  lengthCm: number,
  rowsPerCm: number,
  target: string,
  notes: RoundingNote[],
): { rows: number; exact: number; note: RoundingNote } {
  const exact = lengthCm * rowsPerCm;
  const rows = roundHalfUp(exact);
  const direction =
    Math.abs(exact - rows) < 1e-6
      ? '正好是整数行'
      : rows > exact
        ? '不是整数行，四舍五入向上靠'
        : '不是整数行，四舍五入向下靠';
  const note: RoundingNote = { target, exact, rounded: rows, unit: ROWS, direction };
  notes.push(note);
  return { rows, exact, note };
}

/**
 * 在 [startRow, endRow] 区间内均匀排布 eventCount 个动作行（两侧同时变化 perSide 针）。
 * 相邻动作的间距（行数）尽量相等：余数 r 个较长间隔放在最前面，
 * 使「先疏后密」——更接近实际挂肩/袖山的曲线；首尾各留出约半个间隔。
 */
export function buildShapeSchedule(params: {
  kind: ShapeKind;
  startRow: number;
  endRow: number;
  eventCount: number;
  perSide: number;
  totalPerSide: number;
  initialStsPerSide: number;
}): ShapeSchedule {
  const { kind, startRow, endRow, eventCount, perSide, totalPerSide, initialStsPerSide } = params;
  const zoneRows = Math.max(0, endRow - startRow + 1);
  const events: ShapeEvent[] = [];

  if (eventCount <= 0 || zoneRows <= 0) {
    return {
      kind,
      zoneRows,
      startRow,
      endRow,
      perSide,
      totalPerSide,
      eventCount: 0,
      events,
      summary: '无需单针变化',
    };
  }

  // 间隔：eventCount 个动作把区间分成 eventCount+1 个段，首/尾为半段留白
  const innerSpan = zoneRows - 1; // 第一个动作到最后一个动作可用跨度
  // 动作行之间共 eventCount-1 个整间隔；首尾各一个半间隔
  // 直接按「位置 = 起始 + 半间隔 + k×间隔」取整
  const step = eventCount > 1 ? innerSpan / eventCount : 0;
  const halfLead = eventCount > 1 ? step / 2 : innerSpan / 2;

  const gaps: number[] = [];
  let prev = 0;
  let running = initialStsPerSide;
  for (let k = 0; k < eventCount; k++) {
    const offset = eventCount === 1 ? roundHalfUp(halfLead) : Math.floor(halfLead + k * step + 1e-9);
    const row = startRow + offset;
    running += kind === 'increase' ? perSide : -perSide;
    events.push({
      row,
      perSide,
      runningStsPerSide: running,
      note:
        kind === 'decrease'
          ? `两侧各减 ${perSide} 针（单针减针），一侧剩 ${running} 针`
          : `两侧各加 ${perSide} 针，一侧为 ${running} 针`,
    });
    if (k > 0) gaps.push(row - prev);
    prev = row;
  }

  // 动作间隔分组（从疏到密）；习惯说法「每 G 行减 1 针 × 次数」里的次数
  // 包含该组首个动作，所以间隔数 +1 算在第一个（最疏的）组上。
  gaps.sort((a, b) => b - a);
  const groupCounts = new Map<number, number>();
  for (const g of gaps) groupCounts.set(g, (groupCounts.get(g) ?? 0) + 1);
  const verb = kind === 'decrease' ? '减' : '加';
  const sortedGroups = [...groupCounts.entries()].sort((a, b) => b[0] - a[0]);
  if (sortedGroups.length > 0) {
    const [firstGap, firstCount] = sortedGroups[0];
    sortedGroups[0] = [firstGap, firstCount + 1];
  }
  const parts = sortedGroups.map(([gap, count]) => `每 ${gap} 行${verb} ${perSide} 针 ×${count}`);
  const leadGap = events[0].row - (startRow - 1);
  const tailGap = endRow + 1 - events[events.length - 1].row;
  const summary =
    eventCount === 1
      ? `第 ${events[0].row} 行${verb} ${perSide} 针（前后各留 ${leadGap}/${tailGap} 行）`
      : `${parts.join('，再')}（首个动作在第 ${events[0].row} 行，共 ${eventCount} 次）`;

  return {
    kind,
    zoneRows,
    startRow,
    endRow,
    perSide,
    totalPerSide,
    eventCount,
    events,
    summary,
  };
}

/** 根据动作次数与可用行数，生成「平均每 n 行一针」式描述（供文本指引使用） */
export function describeEvenRate(totalPerSide: number, spanRows: number, kind: ShapeKind): string {
  if (totalPerSide <= 0) return '无需减针';
  const n = spanRows / totalPerSide;
  const nRound = Math.round(n * 10) / 10;
  const verb = kind === 'decrease' ? '减' : '加';
  return `平均每 ${nRound} 行${verb} 1 针（共 ${totalPerSide} 次）`;
}

export const DEFAULT_MARKERS = {
  armholeDepth: (bust: number) => bust / 10 + 9,
  shoulderWidth: (bust: number) => bust * 0.38,
  bicep: (bust: number) => bust * 0.32 + 6,
  cuff: (bust: number) => bust * 0.2 + 2,
} as const;

export function defaultMeasurements(bust: number): Required<Measurements> {
  return {
    bust,
    length: bust * 0.66 + 2,
    sleeveLength: bust * 0.44 + 8,
    armholeDepth: DEFAULT_MARKERS.armholeDepth(bust),
    shoulderWidth: DEFAULT_MARKERS.shoulderWidth(bust),
    bicep: DEFAULT_MARKERS.bicep(bust),
    cuff: DEFAULT_MARKERS.cuff(bust),
    capHeight: 0,
  };
}

/** 把用户输入（可含 0 = 默认）解析为完整尺寸 */
export function resolveMeasurements(input: Measurements): Required<Measurements> {
  const bust = input.bust;
  const d = defaultMeasurements(bust);
  const armholeDepth = input.armholeDepth > 0 ? input.armholeDepth : d.armholeDepth;
  return {
    bust,
    length: input.length,
    sleeveLength: input.sleeveLength,
    armholeDepth,
    shoulderWidth: input.shoulderWidth > 0 ? input.shoulderWidth : d.shoulderWidth,
    bicep: input.bicep > 0 ? input.bicep : d.bicep,
    cuff: input.cuff > 0 ? input.cuff : d.cuff,
    // 袖山高默认取「实际」挂肩高的 2/3（用户自定义挂肩时也要跟着变）
    capHeight: input.capHeight > 0 ? input.capHeight : armholeDepth * (2 / 3),
  };
}

export function calculateSizing(input: Measurements, gauge: GaugeInput): SizingResult {
  const notes: RoundingNote[] = [];
  const assumptions: string[] = [];
  const errors: string[] = [];

  const m = resolveMeasurements(input);
  const { stsPer10cm, rowsPer10cm } = gauge;

  if (!(m.bust > 0)) errors.push('胸围必须为正数');
  if (!(m.length > 0)) errors.push('衣长必须为正数');
  if (!(m.sleeveLength > 0)) errors.push('袖长必须为正数');
  if (!(stsPer10cm > 0 && rowsPer10cm > 0)) errors.push('密度（10cm 针数/行数）必须为正数');
  if (m.shoulderWidth >= m.bust / 2) errors.push('肩宽不能大于或等于半身围，请检查尺寸');
  if (m.bicep / 2 > m.bust / 4 + 8) errors.push('上臂根围偏大，袖片可能比衣片还宽，请核对尺寸');
  if (m.capHeight >= m.sleeveLength) errors.push('袖山高度不能大于袖长');
  if (errors.length > 0) {
    return {
      measurements: m,
      gauge,
      stsPerCm: stsPer10cm / 10,
      rowsPerCm: rowsPer10cm / 10,
      body: emptyBody(),
      sleeve: emptySleeve(),
      notes,
      assumptions,
      errors,
    };
  }

  const stsPerCm = stsPer10cm / 10;
  const rowsPerCm = rowsPer10cm / 10;

  /* ---------------- 后片/前片 ---------------- */
  const halfBodyCm = m.bust / 2;
  const bodyCast = widthToEvenStitches(halfBodyCm, stsPerCm, '前/后片起针（单片）', notes);

  const totalRowsInfo = lengthToRows(m.length, rowsPerCm, '衣长总行数', notes);
  const armholeInfo = lengthToRows(m.armholeDepth, rowsPerCm, '挂肩高度行数', notes);
  const straightRows = Math.max(0, totalRowsInfo.rows - armholeInfo.rows);

  // 肩部：肩宽对应整片留针（偶数）
  const shoulderCast = widthToEvenStitches(m.shoulderWidth, stsPerCm, '肩部留针（整片）', notes);
  const shoulderStsPerSide = shoulderCast.sts / 2;
  const bodyStsPerSide = bodyCast.sts / 2;
  const armholeDecPerSide = bodyStsPerSide - shoulderStsPerSide;
  if (armholeDecPerSide < 0) {
    errors.push('肩宽针数大于半身针数，无法减出挂肩');
  }

  // 挂肩起始平收：约密度 1cm 的针数，夹在 2~5 针之间，且不超过减针量一半
  let initialBindOffPerSide = 0;
  if (armholeDecPerSide > 2) {
    const want = Math.min(5, Math.max(2, roundHalfUp(stsPerCm)));
    initialBindOffPerSide = Math.min(want, Math.floor(armholeDecPerSide / 2));
  }
  const singlesPerSide = Math.max(0, armholeDecPerSide - initialBindOffPerSide);

  const bodyEvents: ShapeEvent[] = [];
  let singleSchedule: ShapeSchedule | undefined;
  if (initialBindOffPerSide > 0) {
    bodyEvents.push({
      row: straightRows + 1,
      perSide: initialBindOffPerSide,
      runningStsPerSide: bodyStsPerSide - initialBindOffPerSide,
      note: `挂肩开始：两侧各平收 ${initialBindOffPerSide} 针`,
    });
  }
  if (singlesPerSide > 0 && armholeInfo.rows >= 2) {
    const zoneStart = straightRows + 2;
    const zoneEnd = totalRowsInfo.rows;
    singleSchedule = buildShapeSchedule({
      kind: 'decrease',
      startRow: zoneStart,
      endRow: zoneEnd,
      eventCount: singlesPerSide,
      perSide: 1,
      totalPerSide: singlesPerSide,
      initialStsPerSide: bodyStsPerSide - initialBindOffPerSide,
    });
    bodyEvents.push(...singleSchedule.events);
  } else if (singlesPerSide > 0) {
    errors.push('挂肩行数太少，无法排布减针，请增大挂肩高度或换用更细的针');
  }

  const body: BodyResult = {
    castOn: bodyCast.sts,
    castOnNote: bodyCast.note,
    actualWidthCm: Math.round((bodyCast.sts / stsPerCm) * 10) / 10,
    totalRows: totalRowsInfo.rows,
    totalRowsNote: totalRowsInfo.note,
    armholeRows: armholeInfo.rows,
    armholeRowsNote: armholeInfo.note,
    straightRows,
    shoulderSts: shoulderCast.sts,
    shoulderStsNote: shoulderCast.note,
    armholeDecPerSide: Math.max(0, armholeDecPerSide),
    initialBindOffPerSide,
    singleSchedule,
    events: bodyEvents.sort((a, b) => a.row - b.row),
  };

  /* ---------------- 袖片 ---------------- */
  const underarmLengthCm = Math.max(0, m.sleeveLength - m.capHeight);
  const underarmInfo = lengthToRows(underarmLengthCm, rowsPerCm, '腋下袖长行数', notes);
  const capInfo = lengthToRows(m.capHeight, rowsPerCm, '袖山高度行数', notes);
  const sleeveTotalRows = underarmInfo.rows + capInfo.rows;

  const cuffCast = widthToEvenStitches(m.cuff / 2, stsPerCm, '袖口起针（单片）', notes);
  const upperCast = widthToEvenStitches(m.bicep / 2, stsPerCm, '袖肥针数（单片）', notes);

  if (upperCast.sts < cuffCast.sts) {
    errors.push('袖肥针数小于袖口针数，请检查上臂根/袖口尺寸');
  }
  const taperPerSide = Math.max(0, (upperCast.sts - cuffCast.sts) / 2);
  let taperSchedule: ShapeSchedule | undefined;
  if (taperPerSide > 0) {
    // 袖口起针后留约 3cm 罗纹/平织余量，再均匀加针
    const cuffRibRows = Math.min(underarmInfo.rows, Math.max(2, roundHalfUp(rowsPerCm * 3)));
    const zoneStart = cuffRibRows + 1;
    const zoneEnd = underarmInfo.rows;
    if (zoneEnd - zoneStart + 1 < taperPerSide) {
      errors.push('腋下段行数不足，无法每行加一针地放针；请加长袖长或核对密度');
    } else {
      taperSchedule = buildShapeSchedule({
        kind: 'increase',
        startRow: zoneStart,
        endRow: zoneEnd,
        eventCount: taperPerSide,
        perSide: 1,
        totalPerSide: taperPerSide,
        initialStsPerSide: cuffCast.sts / 2,
      });
    }
  }

  // 袖山：起始平收（比挂肩平收略少），剩余单针匀减，最后一次性平收袖顶
  let capBindOffPerSide = 0;
  const capDecPerSide = Math.max(0, upperCast.sts / 2 - 1); // 袖顶至少留 2 针
  if (capDecPerSide > 2 && capInfo.rows >= 2) {
    const want = Math.min(4, Math.max(1, roundHalfUp(stsPerCm * 0.7)));
    capBindOffPerSide = Math.min(want, Math.floor(capDecPerSide / 3));
  }
  const capSingles = Math.max(0, capDecPerSide - capBindOffPerSide);

  const capEvents: ShapeEvent[] = [];
  let capSchedule: ShapeSchedule | undefined;
  const capStartRow = underarmInfo.rows + 1;
  if (capBindOffPerSide > 0) {
    capEvents.push({
      row: capStartRow,
      perSide: capBindOffPerSide,
      runningStsPerSide: upperCast.sts / 2 - capBindOffPerSide,
      note: `袖山开始：两侧各平收 ${capBindOffPerSide} 针`,
    });
  }
  if (capSingles > 0) {
    if (capInfo.rows < 2) {
      errors.push('袖山行数太少，无法减针');
    } else {
      capSchedule = buildShapeSchedule({
        kind: 'decrease',
        startRow: underarmInfo.rows + 2,
        endRow: sleeveTotalRows,
        eventCount: capSingles,
        perSide: 1,
        totalPerSide: capSingles,
        initialStsPerSide: upperCast.sts / 2 - capBindOffPerSide,
      });
      capEvents.push(...capSchedule.events);
    }
  }
  const runningAfterSingles = upperCast.sts / 2 - capBindOffPerSide - capSingles;
  const topBindOff = Math.max(0, runningAfterSingles * 2);

  const sleeve: SleeveResult = {
    castOn: cuffCast.sts,
    castOnNote: cuffCast.note,
    upperSts: upperCast.sts,
    upperStsNote: upperCast.note,
    underarmLengthCm: Math.round(underarmLengthCm * 10) / 10,
    underarmRows: underarmInfo.rows,
    capRows: capInfo.rows,
    capRowsNote: capInfo.note,
    totalRows: sleeveTotalRows,
    taperIncPerSide: taperPerSide,
    taperSchedule,
    capDecPerSide,
    capBindOffPerSide,
    topBindOff,
    capSchedule,
    capEvents: capEvents.sort((a, b) => a.row - b.row),
  };

  assumptions.push('按「片织缝合、前后片相同」的基础版型计算，从下往上织。');
  assumptions.push('挂肩/袖山均采用「起始平收 + 均匀单针减针」的简化曲线，实际可按花型微调。');
  if (singlesPerSide > 0) {
    assumptions.push(
      `挂肩单针段（约 ${Math.max(1, armholeInfo.rows - 1)} 行）：${describeEvenRate(singlesPerSide, Math.max(1, armholeInfo.rows - 1), 'decrease')}。`,
    );
  }
  if (taperPerSide > 0 && taperSchedule && taperSchedule.eventCount >= 2) {
    const rows0 = taperSchedule.events[0].row;
    const rows1 = taperSchedule.events[1].row;
    assumptions.push(`袖身加针节奏：首个动作在第 ${rows0} 行，之后每约 ${rows1 - rows0} 行两侧各加 1 针，共 ${taperPerSide} 次。`);
  }
  assumptions.push('领口挖领、罗纹弹性回缩、缝份耗针未计入；起针数已按宁大勿小取偶。');

  return {
    measurements: m,
    gauge,
    stsPerCm,
    rowsPerCm,
    body,
    sleeve,
    notes,
    assumptions,
    errors,
  };
}

function emptyBody(): BodyResult {
  return {
    castOn: 0,
    totalRows: 0,
    armholeRows: 0,
    straightRows: 0,
    shoulderSts: 0,
    armholeDecPerSide: 0,
    initialBindOffPerSide: 0,
    events: [],
    actualWidthCm: 0,
  };
}

function emptySleeve(): SleeveResult {
  return {
    castOn: 0,
    upperSts: 0,
    underarmLengthCm: 0,
    underarmRows: 0,
    capRows: 0,
    totalRows: 0,
    taperIncPerSide: 0,
    capDecPerSide: 0,
    capBindOffPerSide: 0,
    topBindOff: 0,
    capEvents: [],
  };
}

/** 短指纹（cyrb53），用于在抄写表上标识「这一版」用的什么参数 */
export function shortHash(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(36).slice(0, 6).toUpperCase();
}
