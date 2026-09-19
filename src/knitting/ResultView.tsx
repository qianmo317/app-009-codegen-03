import type { KnitResult, Rounded, ShapingPlan } from './types';

function DirBadge({ dir }: { dir: Rounded['dir'] }) {
  if (dir === 'exact')
    return <span className="kg-badge exact">正好</span>;
  return (
    <span className={`kg-badge ${dir}`}>
      {dir === 'up' ? '↑向上取' : '↓向下取'}
    </span>
  );
}

function PlanTable({
  title,
  p,
  showSideCol,
}: {
  title: string;
  p: ShapingPlan;
  showSideCol: boolean;
}) {
  return (
    <>
      <tr className="sec-title">
        <td colSpan={6}>{title}</td>
      </tr>
      <tr>
        <th>次号</th>
        <th>绝对行号</th>
        <th>本段行号</th>
        <th>与上次间隔</th>
        <th>操作</th>
        <th>{showSideCol ? '操作后单侧针数' : '操作后整片针数'}</th>
      </tr>
      {p.events.length === 0 && (
        <tr>
          <td colSpan={6} style={{ color: '#999' }}>
            （无操作行，全程平织）
          </td>
        </tr>
      )}
      {p.events.map((e) => {
        const op =
          e.no === 0
            ? p.bo > 0
              ? p.centerHold > 0
                ? `第 1 行：每侧平收 ${p.bo} 针，中间留 ${p.centerHold} 针`
                : `第 1 行：每侧平收 ${p.bo} 针`
              : p.centerHold > 0
                ? `第 1 行：中间留 ${p.centerHold} 针（不织，另穿线）`
                : '第 1 行'
            : `每 ${e.gap} 行${p.kind === 'dec' ? '收' : '加'} ${e.off} 针${
                p.perSide ? '/侧' : ''
              }`;
        const after = showSideCol ? e.sideAfter : e.pieceTotalAfter;
        return (
          <tr key={e.no}>
            <td>{e.no === 0 ? '起' : e.no}</td>
            <td>
              <strong>{e.rowAbs}</strong>
            </td>
            <td>{e.rowInSection}</td>
            <td>{e.gap === 0 ? '—' : e.gap}</td>
            <td className="op">{op}</td>
            <td>{after ?? '—'}</td>
          </tr>
        );
      })}
      {p.tailRows > 0 && (
        <tr>
          <td colSpan={6} style={{ textAlign: 'left', color: '#7a756b' }}>
            之后平织 {p.tailRows} 行到本段结束。
          </td>
        </tr>
      )}
    </>
  );
}

export function MetricsBar({ r }: { r: KnitResult }) {
  const items: { k: string; v: number; unit: string }[] = [
    { k: '身片起针', v: r.back.castOn.value, unit: '针' },
    { k: '身片总行数', v: r.back.totalRows.value, unit: '行' },
    { k: '袖窿每侧减', v: r.back.armholeDecPerSide, unit: '针' },
    { k: '单侧肩针', v: r.back.shoulderSts, unit: '针' },
    { k: '袖口起针', v: r.sleeve.cuffCastOn.value, unit: '针' },
    { k: '袖壮针数', v: r.sleeve.upperSts.value, unit: '针' },
    { k: '袖身每侧加', v: r.sleeve.incPerSide, unit: '针' },
    { k: '袖山顶余', v: r.sleeve.capTopSts, unit: '针' },
  ];
  return (
    <div className="kg-metric-grid">
      {items.map((it) => (
        <div className="kg-metric" key={it.k}>
          <div className="k">{it.k}</div>
          <div className="v">
            {it.v} <small>{it.unit}</small>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ShapingTables({ r }: { r: KnitResult }) {
  return (
    <table className="kg-table">
      <PlanTable
        title={`后片 · 袖窿（第 ${r.back.armholeStartRow} 行起，共 ${r.back.armhole.sectionRows} 行，每侧减 ${r.back.armholeDecPerSide} 针）`}
        p={r.back.armhole}
        showSideCol={false}
      />
      <PlanTable
        title={`后片 · 领窝（第 ${r.back.backNeckStartRow} 行起，中间留 ${r.back.backHoldSts} 针）`}
        p={r.back.backNeck}
        showSideCol
      />
      <PlanTable
        title={`前片 · 袖窿（同后片，第 ${r.front.armholeStartRow} 行起）`}
        p={r.front.armhole}
        showSideCol={false}
      />
      <PlanTable
        title={`前片 · 领窝（第 ${r.front.neckStartRow} 行起 ${r.front.neckRows} 行，中间留 ${r.front.frontHoldSts} 针，单侧减 ${r.front.neckDecPerSide} 针）`}
        p={r.front.neck}
        showSideCol
      />
      <PlanTable
        title={`袖子 · 袖身加针（罗纹 ${r.sleeve.ribRows} 行后开始，到 ${r.sleeve.upperSts.value} 针，每侧加 ${r.sleeve.incPerSide} 针）`}
        p={r.sleeve.increase}
        showSideCol={false}
      />
      <PlanTable
        title={`袖子 · 袖山（第 ${r.sleeve.capStartRow} 行起 ${r.sleeve.capRows.value} 行，余 ${r.sleeve.capTopSts} 针平收）`}
        p={r.sleeve.cap}
        showSideCol={false}
      />
    </table>
  );
}

export function NotesBlock({ r }: { r: KnitResult }) {
  return (
    <div>
      <div className="kg-notes">
        <strong>就近取值说明</strong>
        <ul>
          {r.notes.map((n, i) => (
            <li key={i}>
              {n.note} <DirBadge dir={n.dir} />
            </li>
          ))}
        </ul>
      </div>
      {r.warnings.length > 0 && (
        <div className="kg-notes kg-warn">
          <strong>需要注意</strong>
          <ul>
            {r.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ResultBody({ r }: { r: KnitResult }) {
  return (
    <div>
      <MetricsBar r={r} />
      <ShapingTables r={r} />
      <NotesBlock r={r} />
    </div>
  );
}
