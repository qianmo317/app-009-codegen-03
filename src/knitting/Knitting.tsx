import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useKnitStore } from '../store/knitStore';
import { computeGarment } from './garment';
import InputPanel from './InputPanel';
import VersionList from './VersionList';
import CompareView from './CompareView';
import ResultBody, { MetricsBar, NotesBlock, ShapingTables } from './ResultView';
import './knitting.css';

type Tab = 'preview' | 'saved' | 'compare';

function VersionStamp({
  name,
  yarn,
  ts,
  extra,
}: {
  name: string;
  yarn: string;
  ts?: number;
  extra?: string;
}) {
  return (
    <div className="kg-result-head">
      <span className="kg-ver-name">{name}</span>
      <span className="kg-ver-meta">{yarn}</span>
      {ts && (
        <span className="kg-ver-meta">
          计算于 {new Date(ts).toLocaleString('zh-CN', { hour12: false })}
        </span>
      )}
      {extra && <span className="kg-ver-meta">{extra}</span>}
    </div>
  );
}

export default function Knitting() {
  const draft = useKnitStore((s) => s.draft);
  const versions = useKnitStore((s) => s.versions);
  const editId = useKnitStore((s) => s.editId);
  const [tab, setTab] = useState<Tab>('preview');
  const [openId, setOpenId] = useState<string | null>(null);

  const live = useMemo(() => computeGarment(draft), [draft]);
  const saved = versions.find((v) => v.id === openId) ?? null;
  const dirty =
    editId != null &&
    (() => {
      const v = versions.find((x) => x.id === editId);
      return v ? JSON.stringify(v.input) !== JSON.stringify(draft) : false;
    })();

  return (
    <div className="kg-wrap">
      <div className="kg-head">
        <h1>尺寸换算编织指引</h1>
        <span className="sub">量身材、量织片 → 算起针与减针行号表</span>
        <span className="kg-nav" style={{ marginLeft: 'auto' }}>
          <Link to="/">← 回到图解列表</Link>
        </span>
      </div>

      <div className="kg-layout">
        <div className="kg-sidebar">
          <InputPanel />
          <VersionList />
        </div>

        <div>
          <div className="kg-tabs">
            <button
              className={`kg-tab ${tab === 'preview' ? 'active' : ''}`}
              onClick={() => setTab('preview')}
            >
              当前输入预览{dirty ? '（有改动，待重算）' : ''}
            </button>
            <button
              className={`kg-tab ${tab === 'saved' ? 'active' : ''}`}
              onClick={() => setTab('saved')}
            >
              已存版本明细表
            </button>
            <button
              className={`kg-tab ${tab === 'compare' ? 'active' : ''}`}
              onClick={() => setTab('compare')}
            >
              多版本对比
            </button>
          </div>

          {tab === 'preview' && (
            <div className="kg-card">
              <VersionStamp
                name={
                  editId
                    ? `编辑自 ${versions.find((v) => v.id === editId)?.name ?? ''}（草稿）`
                    : '未保存草稿'
                }
                yarn={`${draft.yarnName || '未命名线材'} · ${draft.gauge.sts}针 × ${draft.gauge.rows}行 /10cm`}
                extra={dirty ? '⚠ 与已存版本不一致，点左侧「重算并更新」' : '随输入即时更新，尚未存档'}
              />
              <p className="kg-hint" style={{ marginTop: -4 }}>
                密度：一针宽 {live.pitchSt.toFixed(2)}cm，一行高 {live.pitchRow.toFixed(2)}
                cm。下表绝对行号从起针行（第 1 行）起算。
              </p>
              <ResultBody r={live} />
              <details>
                <summary className="kg-hint" style={{ cursor: 'pointer' }}>
                  展开可抄写的纯文本稿
                </summary>
                <pre className="kg-preview">{live.plainText}</pre>
              </details>
            </div>
          )}

          {tab === 'saved' && (
            <div>
              {versions.length === 0 && (
                <div className="kg-card">
                  <p className="kg-hint">还没有已存版本。</p>
                </div>
              )}
              <div className="kg-actions" style={{ marginBottom: 10 }}>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    className={`kg-btn small ${openId === v.id ? '' : 'ghost'}`}
                    onClick={() => setOpenId(v.id)}
                  >
                    {v.name} · {v.input.gauge.sts}针
                  </button>
                ))}
              </div>
              {saved && (
                <div className="kg-card">
                  <VersionStamp
                    name={saved.name}
                    yarn={`${saved.input.yarnName || '未命名线材'} · ${saved.input.gauge.sts}针 × ${saved.input.gauge.rows}行 /10cm`}
                    ts={saved.createdAt}
                    extra={`净尺寸 胸${saved.input.m.bust} 长${saved.input.m.length} 袖${saved.input.m.sleeve}`}
                  />
                  <MetricsBar r={saved.result} />
                  <ShapingTables r={saved.result} />
                  <NotesBlock r={saved.result} />
                  <details open>
                    <summary className="kg-hint" style={{ cursor: 'pointer' }}>
                      抄写稿（抬头已标版本与计算时间）
                    </summary>
                    <pre className="kg-preview">
{`【版本 ${saved.name} · 计算于 ${new Date(saved.createdAt).toLocaleString(
                        'zh-CN',
                        { hour12: false },
                      )}】
${saved.result.plainText}`}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}

          {tab === 'compare' && <CompareView />}
        </div>
      </div>
    </div>
  );
}
