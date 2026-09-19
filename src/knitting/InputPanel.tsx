import { useKnitStore } from '../store/knitStore';
import { YARN_PRESETS } from './defaults';
import type { KnitParams, Measurements } from './types';

const M_FIELDS: { k: keyof Measurements; label: string }[] = [
  { k: 'bust', label: '净胸围' },
  { k: 'length', label: '衣长（后中长）' },
  { k: 'sleeve', label: '袖长（肩到袖口）' },
  { k: 'shoulderAcross', label: '肩宽（肩缝间）' },
];

const P_FIELDS: { k: keyof KnitParams; label: string; hint?: string }[] = [
  { k: 'ease', label: '胸围放松量' },
  { k: 'ribHeight', label: '罗纹高度（摆/袖口）' },
  { k: 'armholeDepth', label: '袖窿（挂肩）深' },
  { k: 'neckWidth', label: '领宽' },
  { k: 'backNeckDepth', label: '后领深' },
  { k: 'frontNeckDepth', label: '前领深' },
  { k: 'cuffWidth', label: '袖口围（宽）' },
  { k: 'upperArm', label: '上臂围（含松量）' },
  { k: 'capHeight', label: '袖山高' },
];

export default function InputPanel() {
  const draft = useKnitStore((s) => s.draft);
  const editId = useKnitStore((s) => s.editId);
  const setDraft = useKnitStore((s) => s.setDraft);
  const patchMeasure = useKnitStore((s) => s.patchMeasure);
  const patchParam = useKnitStore((s) => s.patchParam);
  const patchGauge = useKnitStore((s) => s.patchGauge);
  const saveVersion = useKnitStore((s) => s.saveVersion);
  const saveAsNewVersion = useKnitStore((s) => s.saveAsNewVersion);
  const resetDraft = useKnitStore((s) => s.resetDraft);

  const num = (v: number) => Number.isFinite(v) ? v : 0;

  return (
    <div>
      <div className="kg-card">
        <h2>① 线材与织片密度</h2>
        <input
          className="kg-name-input"
          value={draft.yarnName}
          onChange={(e) => setDraft({ yarnName: e.target.value })}
          placeholder="方案名 / 线材名称，如：驼色中粗羊毛"
        />
        <div className="kg-field">
          <select
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (idx >= 0) {
                const pre = YARN_PRESETS[idx];
                setDraft({ gauge: { ...pre.gauge }, yarnName: pre.name });
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              套用常见密度预设…
            </option>
            {YARN_PRESETS.map((p, i) => (
              <option key={p.name} value={i}>
                {p.name}（{p.gauge.sts}针×{p.gauge.rows}行）
              </option>
            ))}
          </select>
        </div>
        <div className="kg-row2">
          <div className="kg-field">
            <label>10cm 针数</label>
            <input
              type="number"
              min={1}
              value={num(draft.gauge.sts)}
              onChange={(e) => patchGauge('sts', Number(e.target.value))}
            />
          </div>
          <div className="kg-field">
            <label>10cm 行数</label>
            <input
              type="number"
              min={1}
              value={num(draft.gauge.rows)}
              onChange={(e) => patchGauge('rows', Number(e.target.value))}
            />
          </div>
        </div>
        <p className="kg-hint">先量洗后织片：10cm 宽里多少针、10cm 高里多少行。</p>
      </div>

      <div className="kg-card">
        <h2>② 身材尺寸（cm）</h2>
        {M_FIELDS.map((f) => (
          <div className="kg-field" key={f.k}>
            <label>{f.label}</label>
            <input
              type="number"
              min={1}
              step="0.5"
              value={num(draft.m[f.k])}
              onChange={(e) => patchMeasure(f.k, Number(e.target.value))}
            />
            <span className="unit">cm</span>
          </div>
        ))}
      </div>

      <div className="kg-card">
        <h2>③ 款式参数（cm，可用默认值）</h2>
        {P_FIELDS.map((f) => (
          <div className="kg-field" key={f.k}>
            <label>{f.label}</label>
            <input
              type="number"
              min={0}
              step="0.5"
              value={num(draft.p[f.k])}
              onChange={(e) => patchParam(f.k, Number(e.target.value))}
            />
            <span className="unit">cm</span>
          </div>
        ))}
      </div>

      <div className="kg-actions">
        {editId ? (
          <>
            <button className="kg-btn" onClick={() => saveVersion()}>
              改后重算 · 更新此版
            </button>
            <button className="kg-btn ghost" onClick={() => saveAsNewVersion()}>
              另存为新版本
            </button>
          </>
        ) : (
          <button className="kg-btn" onClick={() => saveAsNewVersion()}>
            计算并存为新版本
          </button>
        )}
        <button className="kg-btn danger" onClick={resetDraft}>
          清空重填
        </button>
      </div>
      <p className="kg-hint">
        {editId
          ? '当前载入了已存版本：改尺寸后点「更新此版」会原地重算（版本名不变、时间刷新）；若想把新粗线方案单独留一版，点「另存为新版本」。'
          : '右侧随输入即时预览；点「存为新版本」后，再换一种粗线密度另存一版，就能并排对比。'}
      </p>
    </div>
  );
}
