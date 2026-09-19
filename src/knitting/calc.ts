// 尺寸 → 针/行 折算与塑形排布
import type {
  Gauge,
  Rounded,
  ShapingEvent,
  ShapingPlan,
} from './types';

/* ---------------- 基础折算 ---------------- */

/** cm → 针数（原始折算值） */
export function cmToSts(cm: number, g: Gauge): number {
  return (cm * g.sts) / 10;
}
/** cm → 行数（原始折算值） */
export function cmToRows(cm: number, g: Gauge): number {
  return (cm * g.rows) / 10;
}
/** 针数 → cm */
export function stsToCm(sts: number, g: Gauge): number {
  return (sts * 10) / g.sts;
}
/** 行数 → cm */
export function rowsToCm(rows: number, g: Gauge): number {
  return (rows * 10) / g.rows;
}

/** 就近取到偶数针（缝合两片对称，针数宜偶），记录往哪边取 */
export function roundEvenSts(
  label: string,
  rawCm: number,
  g: Gauge,
  notes: Rounded[],
): Rounded {
  const raw = cmToSts(rawCm, g);
  const value = Math.max(2, Math.round(raw / 2) * 2);
  const dir: Rounded['dir'] =
    Math.abs(value - raw) < 1e-9 ? 'exact' : value > raw ? 'up' : 'down';
  const actualCm = stsToCm(value, g);
  const diff = value - raw;
  const note =
    dir === 'exact'
      ? `${label}：${rawCm}cm × ${g.sts}针/10cm = ${raw.toFixed(2)} 针，正好是偶数，取 ${value} 针。`
      : `${label}：${rawCm}cm 折算 ${raw.toFixed(2)} 针，就近取偶数 ${value} 针（${
          dir === 'up' ? '向上' : '向下'
        }取，${diff > 0 ? '+' : ''}${diff.toFixed(2)} 针，实际约 ${actualCm.toFixed(1)}cm）。`;
  const r: Rounded = {
    label,
    raw,
    value,
    unit: '针',
    dir,
    actualCm,
    note,
  };
  notes.push(r);
  return r;
}

/** 就近取整数行 */
export function roundRows(
  label: string,
  rawCm: number,
  g: Gauge,
  notes: Rounded[],
  min = 0,
): Rounded {
  const raw = cmToRows(rawCm, g);
  const value = Math.max(min, Math.round(raw));
  const dir: Rounded['dir'] =
    value === raw ? 'exact' : value > raw ? 'up' : 'down';
  const actualCm = rowsToCm(value, g);
  const note =
    dir === 'exact'
      ? `${label}：${rawCm}cm × ${g.rows}行/10cm = ${raw} 行，整数照取。`
      : `${label}：折算 ${raw.toFixed(2)} 行，就近取 ${value} 行（${
          dir === 'up' ? '向上' : '向下'
        }取，实际约 ${actualCm.toFixed(1)}cm）。`;
  const r: Rounded = { label, raw, value, unit: '行', dir, actualCm, note };
  notes.push(r);
  return r;
}

/* ---------------- 塑形排布 ---------------- */

export interface ShapeArgs {
  kind: 'inc' | 'dec';
  name: string;
  perSide: boolean; // 两侧对称时每侧操作；false 为单侧（如前领窝）
  totalSts: number; // 起始整片针数
  targetSts: number; // 结束整片针数（加针时 > totalSts）
  rows: number; // 本段总行数
  boFirst?: number; // 第 1 行每侧平收
  centerHold?: number; // 第 1 行中间留针
  sectionStartAbs?: number; // 本段在整件中的起始绝对行号
  g: Gauge;
  notes: Rounded[];
}

/**
 * 排布「每 X 行收/加 1 针，共 N 次」。
 * 尽量让 X 为整数；不是整数时在 floor / ceil 间隔之间交替，并记录取整说明。
 */
export function planShaping(a: ShapeArgs): ShapingPlan {
  const {
    kind,
    name,
    perSide,
    totalSts,
    targetSts,
    rows,
    notes,
  } = a;
  const bo = Math.max(0, a.boFirst ?? 0);
  const centerHold = Math.max(0, a.centerHold ?? 0);
  const startAbs = a.sectionStartAbs ?? 1;

  // 第一次平收（每侧）后剩余整片针数
  const afterBo = totalSts - (perSide ? 2 : 1) * bo - centerHold;
  // 渐进部分单侧还要变化的针数
  const perSideDelta = perSide
    ? Math.abs(afterBo - targetSts) / 2
    : Math.abs(afterBo - targetSts);
  const times = Math.round(perSideDelta);

  const events: ShapingEvent[] = [];
  const gaps: number[] = [];
  let fallback = false;

  // 剩余可排布的行：第 1 行已用于平收/留针，则从第 2 行起到段末
  const firstRowUsed = bo > 0 || centerHold > 0;
  const usableRows = firstRowUsed ? rows - 1 : rows;
  const intervalRaw = times > 0 ? usableRows / times : 0;

  if (times > 0 && intervalRaw < 1) {
    // 针数太多、行数太少：一行收多针兜底
    fallback = true;
  }

  // 记录第 0 次操作所占的行（平收/留针在本段第 1 行）
  let pieceSts = totalSts;
  let sideSts: number | null = null;
  if (firstRowUsed) {
    pieceSts = afterBo;
    if (!perSide) {
      // 单侧领窝（半片）：操作侧起始针数 = 半片 - 该侧分摊留针 - 平收
      sideSts = totalSts - centerHold - bo;
    }
    events.push({
      no: 0,
      rowAbs: startAbs,
      rowInSection: 1,
      gap: 0,
      off: bo,
      pieceTotalAfter: pieceSts,
      sideAfter: sideSts,
    });
  }

  if (times > 0) {
    if (fallback) {
      // 全挤在一行收完，每侧多针
      const off = times;
      const rowInSection = firstRowUsed ? 2 : 1;
      if (perSide) pieceSts -= 2 * off;
      else pieceSts -= off;
      gaps.push(rowInSection - (events[events.length - 1]?.rowInSection ?? 0));
      events.push({
        no: 1,
        rowAbs: startAbs + rowInSection - 1,
        rowInSection,
        gap: gaps[gaps.length - 1],
        off,
        pieceTotalAfter: pieceSts,
        sideAfter: perSide ? null : sideSts !== null ? sideSts - off : null,
      });
    } else {
      // 均匀分配：第 i 次操作的累计位置 = round(i × 总行程 / 次数)，
      // 间隔自然在 floor / ceil 之间就近交替
      const base = firstRowUsed ? 1 : 0;
      let prevRow = base;
      let side = perSide ? afterBo / 2 : sideSts;
      for (let i = 1; i <= times; i++) {
        const rowInSection = base + Math.round((i * usableRows) / times);
        const gap = rowInSection - prevRow;
        gaps.push(gap);
        const off = 1;
        if (kind === 'dec') {
          pieceSts -= perSide ? 2 : 1;
          if (side !== null) side -= 1;
        } else {
          pieceSts += perSide ? 2 : 1;
          if (side !== null) side += 1;
        }
        prevRow = rowInSection;
        events.push({
          no: i,
          rowAbs: startAbs + rowInSection - 1,
          rowInSection,
          gap,
          off,
          pieceTotalAfter: pieceSts,
          sideAfter: perSide ? null : side,
        });
      }
    }
  }

  const lastGradual = events.filter((e) => e.no > 0).slice(-1)[0];
  const tailRows = lastGradual
    ? Math.max(0, rows - lastGradual.rowInSection)
    : rows - (firstRowUsed ? 1 : 0);

  // 间隔取整说明
  let intervalNote: string;
  const verb = kind === 'dec' ? '收' : '加';
  if (times === 0) {
    intervalNote = `${name}：无需渐进收放针。`;
  } else if (fallback) {
    intervalNote = `${name}：折算平均每 ${intervalRaw.toFixed(
      2,
    )} 行收一次，不足 1 行，无法逐行${verb} 1 针；改为在同一行${
      perSide ? '每侧' : ''
    }一次${verb} ${times} 针兜底，建议加深本段高度或换细线。`;
    notes.push({
      label: `${name} · 排布兜底`,
      raw: intervalRaw,
      value: 1,
      unit: '行',
      dir: 'up',
      note: intervalNote,
    });
  } else if (Math.abs(intervalRaw - Math.round(intervalRaw)) < 1e-9) {
    intervalNote = `${name}：每 ${Math.round(intervalRaw)} 行${verb} 1 针、共 ${times} 次，间隔为整数照取。`;
  } else {
    const uniq = [...new Set(gaps)].sort((a, b) => a - b);
    intervalNote = `${name}：平均每 ${intervalRaw.toFixed(
      2,
    )} 行一次，非整数；按「${uniq
      .map((x) => `${x} 行${verb} 1 针`)
      .join('」与「')}」交替就近排布，共 ${times} 次，${verb}完后平织 ${tailRows} 行。`;
    notes.push({
      label: `${name} · 间隔取整`,
      raw: intervalRaw,
      value: gaps[0],
      unit: '行',
      dir: 'down',
      note: intervalNote,
    });
  }

  const boText =
    bo > 0
      ? perSide
        ? `第 1 行每侧平收 ${bo} 针${centerHold ? `、中间留 ${centerHold} 针` : ''}，`
        : `第 1 行平收 ${bo} 针、中间留 ${centerHold} 针，`
      : centerHold
        ? perSide
          ? `第 1 行中间留 ${centerHold} 针，`
          : `第 1 行中间留 ${centerHold} 针（单侧视角），`
        : '';
  const summary = fallback
    ? `${name}：${boText}余下 ${times * (perSide ? 2 : 1)} 针在同一行收完（见警告）。`
    : times === 0
      ? `${name}：${boText}无渐进变化。`
      : `${name}：${boText}之后${intervalNote.replace(`${name}：`, '')}${
          perSide ? '（两侧对称，每次共 2 针）' : '（单侧）'
        }。`;

  return {
    kind,
    name,
    perSide,
    bo,
    centerHold,
    events,
    tailRows,
    sectionRows: rows,
    sectionStartAbs: startAbs,
    gaps,
    intervalRaw,
    intervalNote,
    summary,
    fallback,
  };
}
