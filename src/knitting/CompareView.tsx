import { useKnitStore } from '../store/knitStore';
import type { SavedVersion } from './types';

function fmtTime(ts: number) {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes(),
  )}`;
}

type Row =
  | { sec: string }
  | { name: string; get: (v: SavedVersion) => string | number };

const ROWS: Row[] = [
  { sec: '密度与尺寸' },
  { name: '针 / 行（10cm）', get: (v) => `${v.input.gauge.sts} × ${v.input.gauge.rows}` },
  { name: '净胸围 / 衣长 / 袖长', get: (v) => `${v.input.m.bust} / ${v.input.m.length} / ${v.input.m.sleeve}` },
  { sec: '后片 / 前片' },
  { name: '身片起针（针）', get: (v) => v.result.back.castOn.value },
  { name: '身片总行数（行）', get: (v) => v.result.back.totalRows.value },
  { name: '罗纹行数', get: (v) => v.result.back.ribRows.value },
  { name: '挂肩起始行号', get: (v) => v.result.back.armholeStartRow },
  { name: '袖窿每侧减针', get: (v) => v.result.back.armholeDecPerSide },
  { name: '袖窿节奏', get: (v) => v.result.back.armhole.intervalNote.replace(/^.*?：/, '') },
  { name: '后领留针 / 肩针', get: (v) => `${v.result.back.backHoldSts} / ${v.result.back.shoulderSts}` },
  { name: '前领起始行号', get: (v) => v.result.front.neckStartRow },
  { name: '前领单侧减针', get: (v) => v.result.front.neckDecPerSide },
  { name: '前领节奏', get: (v) => v.result.front.neck.intervalNote.replace(/^.*?：/, '') },
  { sec: '袖子' },
  { name: '袖口起针（针）', get: (v) => v.result.sleeve.cuffCastOn.value },
  { name: '袖壮针数（针）', get: (v) => v.result.sleeve.upperSts.value },
  { name: '袖身每侧加针', get: (v) => v.result.sleeve.incPerSide },
  { name: '加针节奏', get: (v) => v.result.sleeve.increase.intervalNote.replace(/^.*?：/, '') },
  { name: '袖山起始行号', get: (v) => v.result.sleeve.capStartRow },
  { name: '袖山行数', get: (v) => v.result.sleeve.capRows.value },
  { name: '袖山每侧减针', get: (v) => v.result.sleeve.capDecPerSide + v.result.sleeve.capBo },
  { name: '袖山顶留针', get: (v) => v.result.sleeve.capTopSts },
];

export default function CompareView() {
  const versions = useKnitStore((s) => s.versions);
  const selected = useKnitStore((s) => s.selected);
  const picked = versions.filter((v) => selected.includes(v.id));

  if (picked.length === 0) {
    return (
      <div className="kg-card">
        <p className="kg-hint">在左侧勾选要比较的版本（比如中细线一版、粗线一版），关键针数行数会并排放在这里。</p>
      </div>
    );
  }

  return (
    <div className="kg-card">
      <h2>版本对比</h2>
      <table className="kg-compare">
        <thead>
          <tr>
            <th className="rowname">项目</th>
            {picked.map((v) => (
              <th key={v.id}>
                <span className="kg-ver-name">{v.name}</span>
                <div style={{ fontWeight: 400, fontSize: 11, color: '#999', marginTop: 2 }}>
                  {v.input.yarnName || '未命名'}
                </div>
                <div style={{ fontWeight: 400, fontSize: 11, color: '#bbb' }}>
                  {fmtTime(v.createdAt)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r, i) =>
            'sec' in r ? (
              <tr key={i} className="section">
                <td colSpan={picked.length + 1}>{r.sec}</td>
              </tr>
            ) : (
              <tr key={i}>
                <td className="rowname">{r.name}</td>
                {picked.map((v) => (
                  <td key={v.id}>{r.get(v)}</td>
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
      <p className="kg-hint">
        每列顶上的 v1 / v2 标签就是该列数据的计算版本；复制行号表时请连同版本标签一起抄走。
      </p>
    </div>
  );
}
