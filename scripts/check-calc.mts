// 临时验证脚本：node --import tsx 不可用时改用 esbuild 直接转译运行。
import { calculateSizing, buildShapeSchedule, resolveMeasurements, shortHash } from './src/features/sizing/calc.ts';

let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('  ✗', msg); }
}

// 场景：胸围96 衣长66 袖长56，密度 18针/24行 per 10cm
const m = resolveMeasurements({ bust: 96, length: 66, sleeveLength: 56, armholeDepth: 0, shoulderWidth: 0, bicep: 0, cuff: 0, capHeight: 0 });
assert(Math.abs(m.armholeDepth - 18.6) < 1e-9, `挂肩默认 ${m.armholeDepth}`);
assert(Math.abs(m.shoulderWidth - 36.48) < 1e-9, `肩宽默认 ${m.shoulderWidth}`);

const r = calculateSizing({ bust: 96, length: 66, sleeveLength: 56, armholeDepth: 0, shoulderWidth: 0, bicep: 0, cuff: 0, capHeight: 0 }, { stsPer10cm: 18, rowsPer10cm: 24 });
assert(r.errors.length === 0, '默认参数无错误: ' + r.errors.join(';'));
// 单片宽 48cm × 1.8 = 86.4 → 四舍五入 86（偶数保持）
assert(r.body.castOn === 86, `后片起针应为86，实际 ${r.body.castOn}`);
// 衣长 66 × 2.4 = 158.4 → 158
assert(r.body.totalRows === 158, `衣长总行数 ${r.body.totalRows}`);
// 挂肩 18.6 × 2.4 = 44.64 → 45
assert(r.body.armholeRows === 45, `挂肩行数 ${r.body.armholeRows}`);
assert(r.body.straightRows === 113, `平织行 ${r.body.straightRows}`);
// 肩宽 36.48 × 1.8 = 65.664 → 66
assert(r.body.shoulderSts === 66, `肩部 ${r.body.shoulderSts}`);
// 每侧减 43-33 = 10；平收 min(2, floor10/2=5) = 2；单针 8
assert(r.body.armholeDecPerSide === 10, `挂肩每侧减 ${r.body.armholeDecPerSide}`);
assert(r.body.initialBindOffPerSide === 2, `平收 ${r.body.initialBindOffPerSide}`);
assert(r.body.singleSchedule.eventCount === 8, `单针次数 ${r.body.singleSchedule.eventCount}`);
// 最后一次单针减完一侧应剩肩部 33
const last = r.body.singleSchedule.events.at(-1);
assert(last.runningStsPerSide === 33, `减完一侧33，实际 ${last.runningStsPerSide}`);
// 所有事件行都在区间内且递增
const rows = r.body.events.map((e) => e.row);
assert(rows.every((x, i) => i === 0 || x > rows[i - 1]), '挂肩事件行严格递增');
assert(rows[0] === 114, `平收在第114行，实际 ${rows[0]}`);
assert(rows.at(-1) <= 158, '末次减针不超过总行数');
// 首个单针与末次之间行距差不超过1（均匀）
const singleRows = r.body.singleSchedule.events.map((e) => e.row);
const gaps = singleRows.slice(1).map((x, i) => x - singleRows[i]);
assert(Math.max(...gaps) - Math.min(...gaps) <= 1, '单针间隔差≤1: ' + gaps.join(','));

// 袖：袖口围 21.2cm，单片 10.6×1.8=19.08→19奇→20
assert(r.sleeve.castOn === 20, `袖口起针 ${r.sleeve.castOn}`);
// 袖肥 36.72，单片18.36×1.8=33.048→33奇→34
assert(r.sleeve.upperSts === 34, `袖肥 ${r.sleeve.upperSts}`);
// 每侧加 (34-20)/2=7
assert(r.sleeve.taperIncPerSide === 7, `加针 ${r.sleeve.taperIncPerSide}`);
// 袖山高 12.4 × 2.4 = 29.76 → 30
assert(r.sleeve.capRows === 30, `袖山行数 ${r.sleeve.capRows}`);
// 袖山每侧减 17-1=16；平收 min(4, max(1,round1.26=1), floor16/3=5)=1
assert(r.sleeve.capDecPerSide === 16, `袖山减 ${r.sleeve.capDecPerSide}`);
assert(r.sleeve.capBindOffPerSide === 1, `袖山平收 ${r.sleeve.capBindOffPerSide}`);
assert(r.sleeve.topBindOff === 2, `袖顶平收 ${r.sleeve.topBindOff}`);
assert(r.sleeve.totalRows === r.sleeve.underarmRows + r.sleeve.capRows, '袖长行数');

// 取整说明非空，且每条带方向说明
assert(r.notes.length >= 7, `取整说明条数 ${r.notes.length}`);
assert(r.notes.every((n) => n.direction.length > 0), '每条取整都有方向说明');

// 粗线版本：14×20
const r2 = calculateSizing({ bust: 96, length: 66, sleeveLength: 56, armholeDepth: 0, shoulderWidth: 0, bicep: 0, cuff: 0, capHeight: 0 }, { stsPer10cm: 14, rowsPer10cm: 20 });
// 48×1.4=67.2→67奇→68
assert(r2.body.castOn === 68, `粗线后片 ${r2.body.castOn}`);
// 66×2=132
assert(r2.body.totalRows === 132, `粗线行数 ${r2.body.totalRows}`);

// 奇数取偶：x.5 向上、奇数+1 的方向文案存在
const odd = calculateSizing({ bust: 90, length: 60, sleeveLength: 55, armholeDepth: 0, shoulderWidth: 0, bicep: 0, cuff: 0, capHeight: 0 }, { stsPer10cm: 20, rowsPer10cm: 28 });
// 单片45×2=90 偶
assert(odd.body.castOn % 2 === 0, '起针恒偶');

// 排布器：10个动作在 2..31（30行），首尾留白应大致对称
const sch = buildShapeSchedule({ kind: 'decrease', startRow: 2, endRow: 31, eventCount: 10, perSide: 1, totalPerSide: 10, initialStsPerSide: 20 });
assert(sch.events.length === 10, '排布动作数');
assert(sch.events[0].row >= 2 && sch.events.at(-1).row <= 31, '动作行在区间内');
assert(sch.events[0].row - 2 >= 0 && 31 - sch.events.at(-1).row >= 0, '首尾留白非负');

// 指纹稳定性
assert(shortHash(JSON.stringify([{ a: 1 }])) === shortHash(JSON.stringify([{ a: 1 }])), '指纹稳定');
assert(shortHash(JSON.stringify([{ a: 1 }])) !== shortHash(JSON.stringify([{ a: 2 }])), '指纹敏感');

// 错误输入
const bad = calculateSizing({ bust: 0, length: 66, sleeveLength: 56, armholeDepth: 0, shoulderWidth: 0, bicep: 0, cuff: 0, capHeight: 0 }, { stsPer10cm: 18, rowsPer10cm: 24 });
assert(bad.errors.length > 0, '胸围0报错');
const bad2 = calculateSizing({ bust: 96, length: 66, sleeveLength: 56, armholeDepth: 0, shoulderWidth: 60, bicep: 0, cuff: 0, capHeight: 0 }, { stsPer10cm: 18, rowsPer10cm: 24 });
assert(bad2.errors.some((e) => e.includes('肩宽')), '肩宽过大报错');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
