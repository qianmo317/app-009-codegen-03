import type { SizingResult } from './calc';

export interface VersionMeta {
  name: string;
  revision: number;
  calculatedAt: number;
  fingerprint: string;
}

const pad = (s: string | number, n: number) => String(s).padEnd(n, '　');

function fmtNum(x: number): string {
  return Math.round(x * 100) / 100 + '';
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  const p = (v: number) => String(v).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 生成可抄写/打印的纯文本指引表，抬头带版本标识 */
export function formatResultText(result: SizingResult, meta: VersionMeta): string {
  if (result.errors.length > 0) {
    return `【${meta.name} v${meta.revision} · ${meta.fingerprint}】计算失败：\n${result.errors.map((e) => '· ' + e).join('\n')}`;
  }
  const { measurements: m, body: b, sleeve: s } = result;
  const lines: string[] = [];
  lines.push(`════════ 编织指引 · ${meta.name}（第 ${meta.revision} 版 / ${meta.fingerprint}）════════`);
  lines.push(`计算时间：${fmtTime(meta.calculatedAt)}`);
  lines.push(`密度：10cm = ${result.gauge.stsPer10cm} 针 × ${result.gauge.rowsPer10cm} 行（每 cm ${fmtNum(result.stsPerCm)} 针 / ${fmtNum(result.rowsPerCm)} 行）`);
  lines.push(`成品尺寸：胸围 ${m.bust}｜衣长 ${m.length}｜袖长 ${m.sleeveLength}｜挂肩高 ${fmtNum(m.armholeDepth)}｜肩宽 ${fmtNum(m.shoulderWidth)}｜袖肥 ${fmtNum(m.bicep)}｜袖口 ${fmtNum(m.cuff)}｜袖山高 ${fmtNum(m.capHeight)}（cm）`);
  lines.push('');

  lines.push('── 前片 / 后片（两片相同，从下摆起织）────────────');
  lines.push(`起针：${b.castOn} 针（单片实宽约 ${b.actualWidthCm} cm）`);
  lines.push(`下摆平织：${b.straightRows} 行，不加减`);
  lines.push(`总织 ${b.totalRows} 行；挂肩高 ${b.armholeRows} 行；肩部留 ${b.shoulderSts} 针`);
  lines.push(`挂肩每侧共减 ${b.armholeDecPerSide} 针（起始平收 ${b.initialBindOffPerSide} + 单针 ${b.armholeDecPerSide - b.initialBindOffPerSide}）`);
  if (b.singleSchedule) lines.push(`减针节奏：${b.singleSchedule.summary}`);
  lines.push('');
  lines.push('行号　　动作（整片，两侧同时）　　　　　动作后一侧针数');
  for (const ev of b.events) {
    lines.push(`${pad(`第${ev.row}行`, 8)}${pad(ev.note, 28)}${ev.runningStsPerSide} 针`);
  }
  lines.push(`第${b.totalRows}行　肩部 ${b.shoulderSts} 针平收/留针（前后片缝合）`);
  lines.push('');

  lines.push('── 袖片（两片，从袖口起织）─────────────────────');
  lines.push(`起针：${s.castOn} 针；袖身处加到 ${s.upperSts} 针`);
  lines.push(`腋下段 ${s.underarmRows} 行（${s.underarmLengthCm} cm），袖山 ${s.capRows} 行，全片共 ${s.totalRows} 行`);
  lines.push(`袖身每侧共加 ${s.taperIncPerSide} 针；袖山每侧共减 ${s.capDecPerSide} 针（起始平收 ${s.capBindOffPerSide} + 单针 ${s.capDecPerSide - s.capBindOffPerSide}），袖顶 ${s.topBindOff} 针一次平收`);
  if (s.taperSchedule) lines.push(`加针节奏：${s.taperSchedule.summary}`);
  if (s.capSchedule) lines.push(`袖山减针：${s.capSchedule.summary}`);
  lines.push('');
  lines.push('行号　　动作（整片，两侧同时）　　　　　动作后一侧针数');
  for (const ev of s.capEvents) {
    lines.push(`${pad(`第${ev.row}行`, 8)}${pad(ev.note, 28)}${ev.runningStsPerSide} 针`);
  }
  lines.push(`第${s.totalRows}行　袖顶 ${s.topBindOff} 针一次平收`);
  lines.push('');

  lines.push('── 就近取值说明（非整数如何取）──────────────────');
  for (const n of result.notes) {
    lines.push(`· ${n.target}：精确 ${fmtNum(n.exact)} ${n.unit} → 取 ${n.rounded} ${n.unit}（${n.direction}）`);
  }
  lines.push('');
  lines.push('── 假设 ──────────────────────────────────────');
  for (const a of result.assumptions) lines.push('· ' + a);
  lines.push('');
  lines.push(`（抄表请保留抬头：${meta.name} 第 ${meta.revision} 版 / 指纹 ${meta.fingerprint}）`);
  return lines.join('\n');
}
