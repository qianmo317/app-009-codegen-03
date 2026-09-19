// 整件（片织套头衫：后片 / 前片 / 两片袖）的针行编排
import type {
  KnitInput,
  KnitResult,
  PieceBack,
  PieceFront,
  PieceSleeve,
  Rounded,
} from './types';
import {
  cmToRows,
  planShaping,
  roundEvenSts,
  roundRows,
  rowsToCm,
} from './calc';

export function computeGarment(input: KnitInput): KnitResult {
  const { gauge: g, m, p } = input;
  const notes: Rounded[] = [];
  const warnings: string[] = [];

  const pitchSt = 10 / g.sts;
  const pitchRow = 10 / g.rows;

  /* ---------------- 后片 ---------------- */
  const finishedBust = m.bust + p.ease;
  const bodyWidth = finishedBust / 2 + 1; // 半胸围 + 1cm 缝耗
  const castOn = roundEvenSts('起针（一片身片）', bodyWidth, g, notes);
  const castSts = castOn.value;

  const totalRows = roundRows('身片总行数（衣长）', m.length, g, notes, 4);
  const ribRows = roundRows('罗纹行数', p.ribHeight, g, notes, 0);

  // 袖窿折算行数：袖窿深 + 后肩斜度并入（平肩处理，挂肩全走竖直减针）
  const armRowsRaw = cmToRows(p.armholeDepth, g);
  const armRows = Math.max(2, Math.round(armRowsRaw));
  if (Math.abs(armRows - armRowsRaw) > 1e-9) {
    notes.push({
      label: '袖窿段行数',
      raw: armRowsRaw,
      value: armRows,
      unit: '行',
      dir: armRows > armRowsRaw ? 'up' : 'down',
      actualCm: rowsToCm(armRows, g),
      note: `袖窿深 ${p.armholeDepth}cm 折算 ${armRowsRaw.toFixed(2)} 行，就近取 ${armRows} 行（${
        armRows > armRowsRaw ? '向上' : '向下'
      }取，实际约 ${rowsToCm(armRows, g).toFixed(1)}cm）。`,
    });
  }

  const armholeStartRow = totalRows.value - armRows + 1;
  const straightRows = armholeStartRow - ribRows.value - 1;

  // 肩部与领窝
  const neckStsRaw = roundEvenSts('后领留针', p.neckWidth, g, notes);
  const neckSts = neckStsRaw.value;

  // 袖窿单侧减针 = (起针 - 肩宽针数) / 2；肩宽取肩缝间宽折算后偶针
  const shoulderAcrossStsR = roundEvenSts(
    '肩缝间总针数（后片挂肩上口）',
    m.shoulderAcross,
    g,
    notes,
  );
  const acrossSts = Math.min(shoulderAcrossStsR.value, castSts - 2);
  const armDecPerSide = Math.max(0, Math.round((castSts - acrossSts) / 2));
  const actualAcross = castSts - 2 * armDecPerSide;

  // 后领：领窝在最后 backNeckRows 行内收成；每侧减针 = (上口针数 - 领留针) / 2
  const backNeckDec = Math.max(0, (actualAcross - neckSts) / 2);
  const shoulderStsFinal = actualAcross / 2 - backNeckDec; // 单侧肩针

  const backNeckRows = Math.max(1, Math.round(cmToRows(p.backNeckDepth, g)));
  const backNeckStartRow = totalRows.value - backNeckRows + 1;

  const armhole = planShaping({
    kind: 'dec',
    name: '后片袖窿减针',
    perSide: true,
    totalSts: castSts,
    targetSts: actualAcross,
    rows: armRows,
    boFirst: Math.min(2, armDecPerSide),
    sectionStartAbs: armholeStartRow,
    g,
    notes,
  });
  if (armhole.fallback) warnings.push(armhole.intervalNote);

  // 后领窝（单侧视角）：半片起 actualAcross/2 针，中间留 neckSts/2，收到肩针
  const backNeck = planShaping({
    kind: 'dec',
    name: '后片领窝减针（单侧）',
    perSide: false,
    totalSts: actualAcross / 2,
    targetSts: shoulderStsFinal,
    rows: backNeckRows,
    centerHold: neckSts / 2,
    boFirst: backNeckRows <= 2 ? backNeckDec : 0,
    sectionStartAbs: backNeckStartRow,
    g,
    notes,
  });
  if (backNeck.fallback) warnings.push(backNeck.intervalNote);

  /* ---------------- 前片 ---------------- */
  // 前片针数、袖窿与后片对齐；前领更深
  const frontRaw = cmToRows(p.frontNeckDepth, g);
  const frontNeckRows = Math.max(backNeckRows + 1, Math.round(frontRaw));
  const frontDir =
    frontNeckRows === frontRaw ? 'exact' : frontNeckRows > frontRaw ? 'up' : 'down';
  notes.push({
    label: '前领窝行数',
    raw: frontRaw,
    value: frontNeckRows,
    unit: '行',
    dir: frontDir,
    actualCm: rowsToCm(frontNeckRows, g),
    note:
      frontNeckRows === Math.round(frontRaw)
        ? `前领深 ${p.frontNeckDepth}cm 折算 ${frontRaw.toFixed(2)} 行，就近取 ${frontNeckRows} 行（须深于后领 ${backNeckRows} 行）。`
        : `前领深 ${p.frontNeckDepth}cm 折算 ${frontRaw.toFixed(2)} 行，就近取 ${frontNeckRows} 行（${
            frontDir === 'up' ? '向上' : '向下'
          }取；且须深于后领 ${backNeckRows} 行，实际约 ${rowsToCm(frontNeckRows, g).toFixed(1)}cm）。`,
  });
  // 前领比后领宽 2cm、更深：前领中间留针更少，单侧减针更多
  const frontHold = Math.max(
    4,
    roundEvenSts('前领中间留针', Math.max(3, p.neckWidth - 2), g, notes).value,
  );
  const frontNeckStartRow = totalRows.value - frontNeckRows + 1;
  const frontNeckDecSide = Math.max(
    0,
    actualAcross / 2 - frontHold / 2 - shoulderStsFinal,
  );
  const frontNeck = planShaping({
    kind: 'dec',
    name: '前片领窝减针（单侧）',
    perSide: false,
    totalSts: actualAcross / 2,
    targetSts: shoulderStsFinal,
    rows: frontNeckRows,
    centerHold: frontHold / 2,
    sectionStartAbs: frontNeckStartRow,
    g,
    notes,
  });
  if (frontNeck.fallback) warnings.push(frontNeck.intervalNote);

  /* ---------------- 袖子 ---------------- */
  const cuffStsR = roundEvenSts('袖口起针（含罗纹）', p.cuffWidth, g, notes);
  const upperStsR = roundEvenSts('袖壮针数（袖山下口）', p.upperArm, g, notes);
  const cuffSts = cuffStsR.value;
  const upperSts = upperStsR.value;

  const sleeveTotalRows = roundRows('袖子总行数（袖长）', m.sleeve, g, notes, 4);
  const capRowsR = roundRows('袖山行数', p.capHeight, g, notes, 2);
  const capRows = capRowsR.value;
  const capStartRow = sleeveTotalRows.value - capRows + 1;

  // 袖身加针：罗纹结束后开始，沿直身段加到袖壮，第 capStartRow 行起织袖山
  const incPerSide = Math.max(0, Math.round((upperSts - cuffSts) / 2));
  const increase = planShaping({
    kind: 'inc',
    name: '袖身加针',
    perSide: true,
    totalSts: cuffSts,
    targetSts: cuffSts + 2 * incPerSide,
    rows: capStartRow - ribRows.value, // 本段从罗纹后第 1 行到袖山下口
    sectionStartAbs: ribRows.value + 1,
    g,
    notes,
  });
  if (increase.fallback) warnings.push(increase.intervalNote);

  // 袖山顶留针：取袖壮的 1/3 偶针（经验值，用于袖山与挂肩弧线）
  const capTopSts = Math.max(4, Math.round(upperSts / 6) * 2);
  const capBo = Math.min(3, Math.max(2, Math.round((upperSts - capTopSts) / 2 / 4)));
  const capDecPerSide = Math.max(
    0,
    Math.round((upperSts - capTopSts) / 2) - capBo,
  );
  const cap = planShaping({
    kind: 'dec',
    name: '袖山减针',
    perSide: true,
    totalSts: upperSts,
    targetSts: capTopSts,
    rows: capRows,
    boFirst: capBo,
    sectionStartAbs: capStartRow,
    g,
    notes,
  });
  if (cap.fallback) warnings.push(cap.intervalNote);

  const back: PieceBack = {
    castOn,
    totalRows,
    ribRows,
    straightRows,
    armholeStartRow,
    armholeDecPerSide: armDecPerSide,
    armhole,
    backNeck,
    backHoldSts: neckSts,
    shoulderSts: shoulderStsFinal,
    backNeckStartRow,
    backNeckRows,
  };

  const front: PieceFront = {
    castOnSts: castSts,
    totalRowsSts: totalRows.value,
    armholeStartRow,
    armhole,
    frontHoldSts: frontHold,
    neckDecPerSide: frontNeckDecSide,
    neckStartRow: frontNeckStartRow,
    neckRows: frontNeckRows,
    neck: frontNeck,
    shoulderSts: shoulderStsFinal,
  };

  const sleeve: PieceSleeve = {
    cuffCastOn: cuffStsR,
    upperSts: upperStsR,
    ribRows: ribRows.value,
    totalRows: sleeveTotalRows,
    increase,
    incPerSide,
    capStartRow,
    capRows: capRowsR,
    capTopSts,
    capBo,
    capDecPerSide,
    cap,
  };

  // 校验类警告
  if (2 * incPerSide !== upperSts - cuffSts)
    warnings.push(
      `袖壮(${upperSts}) − 袖口(${cuffSts}) = ${upperSts - cuffSts} 针为奇数，已就近取每侧加 ${incPerSide} 次（共 ${
        2 * incPerSide
      } 针），袖壮实际为 ${cuffSts + 2 * incPerSide} 针。`,
    );
  if (actualAcross >= castSts)
    warnings.push('挂肩上口针数 ≥ 起针数，袖窿无减针：请检查肩宽是否过宽。');
  if (shoulderStsFinal < 3)
    warnings.push(`单侧肩仅剩 ${shoulderStsFinal} 针，偏窄，建议加宽肩宽或收窄领宽。`);
  if (backNeck.fallback || frontNeck.fallback)
    warnings.push('领窝行数太少、减针太密，建议加深领深或换细线；表中已用同行多针兜底。');

  const plainText = buildText(input, {
    pitchSt,
    pitchRow,
    back,
    front,
    sleeve,
    notes,
    warnings,
  });

  return {
    pitchSt,
    pitchRow,
    back,
    front,
    sleeve,
    notes,
    warnings,
    plainText,
  };
}

/* ---------------- 文本稿 ---------------- */

function fmtPlan(planName: string, p: import('./types').ShapingPlan): string {
  const lines: string[] = [];
  lines.push(`【${planName}】${p.summary}`);
  if (p.events.length === 0) {
    lines.push('  （无操作行）');
    return lines.join('\n');
  }
  const stCol = p.perSide ? '操作后整片针数' : '操作后单侧针数';
  lines.push(`  次号 | 绝对行号 | 本段行号 | 间隔 | 操作(每侧) | ${stCol}`);
  for (const e of p.events) {
    const act =
      e.no === 0
        ? p.bo > 0
          ? p.centerHold > 0
            ? `平收${p.bo}/留${p.centerHold}`
            : `平收 ${p.bo}`
          : p.centerHold > 0
            ? `留 ${p.centerHold}`
            : '—'
        : `${p.kind === 'dec' ? '收' : '加'} ${e.off}`;
    lines.push(
      `  ${String(e.no).padStart(2)}   | ${String(e.rowAbs).padStart(4)}    | ${String(
        e.rowInSection,
      ).padStart(4)}     | ${e.gap === 0 ? '—' : String(e.gap).padStart(3)}  | ${act.padEnd(
        9,
        ' ',
      )} | ${p.perSide ? (e.pieceTotalAfter ?? '—') : (e.sideAfter ?? '—')}`,
    );
  }
  if (p.tailRows > 0) lines.push(`  之后平织 ${p.tailRows} 行到段末。`);
  return lines.join('\n');
}

export function buildText(
  input: KnitInput,
  r: Omit<KnitResult, 'plainText'>,
): string {
  const L: string[] = [];
  L.push(`========== 编织指引（${input.yarnName || '未命名线材'}） ==========`);
  L.push(
    `密度：${input.gauge.sts} 针 × ${input.gauge.rows} 行 / 10cm（一针宽 ${r.pitchSt.toFixed(
      2,
    )}cm，一行高 ${r.pitchRow.toFixed(2)}cm）`,
  );
  L.push(
    `净尺寸：胸围${input.m.bust} 衣长${input.m.length} 袖长${input.m.sleeve} 肩宽${input.m.shoulderAcross}（cm）`,
  );
  L.push('');
  L.push('—— 后片 ——');
  L.push(
    `起 ${r.back.castOn.value} 针；罗纹 ${r.back.ribRows.value} 行，平织 ${r.back.straightRows} 行，第 ${r.back.armholeStartRow} 行起挂肩。`,
  );
  L.push(fmtPlan('袖窿', r.back.armhole));
  L.push(
    `第 ${r.back.backNeckStartRow} 行起开后领，中间留 ${r.back.backHoldSts} 针、单侧肩 ${r.back.shoulderSts} 针。`,
  );
  L.push(fmtPlan('后领窝（单侧）', r.back.backNeck));
  L.push('');
  L.push('—— 前片 ——');
  L.push(
    `针数与挂肩同后片；第 ${r.front.neckStartRow} 行起开前领，中间留 ${r.front.frontHoldSts} 针。`,
  );
  L.push(fmtPlan('前领窝（单侧）', r.front.neck));
  L.push('');
  L.push('—— 袖子（两片）——');
  L.push(
    `袖口起 ${r.sleeve.cuffCastOn.value} 针，罗纹 ${r.sleeve.ribRows} 行后开始加针，到 ${r.sleeve.upperSts.value} 针；第 ${r.sleeve.capStartRow} 行起织袖山。`,
  );
  L.push(fmtPlan('袖身加针', r.sleeve.increase));
  L.push(fmtPlan('袖山减针', r.sleeve.cap));
  L.push(`袖山顶余 ${r.sleeve.capTopSts} 针平收，与挂肩缝合。`);
  L.push('');
  L.push('—— 就近取值说明 ——');
  for (const n of r.notes) L.push('· ' + n.note);
  if (r.warnings.length) {
    L.push('');
    L.push('—— 警告 ——');
    for (const w of r.warnings) L.push('! ' + w);
  }
  return L.join('\n');
}
