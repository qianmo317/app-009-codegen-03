import { useState } from 'react';
import type { SizingResult, ShapeEvent } from './calc';
import type { SizingVersion } from './store';
import { formatResultText } from './format';
import { NoteList } from './NoteList';

interface Props {
  version: SizingVersion;
  result: SizingResult;
  dirty: boolean;
  onRemove: () => void;
  onRename: (name: string) => void;
  onGauge: (patch: Partial<{ stsPer10cm: number; rowsPer10cm: number }>) => void;
  onRecalc: () => void;
  onDuplicate: () => void;
}

function ShapeTable({ rows, totalRows, empty }: { rows: ShapeEvent[]; totalRows: number; empty: string }) {
  if (rows.length === 0) return <p className="sizing-empty">{empty}</p>;
  return (
    <table className="sizing-table">
      <thead>
        <tr>
          <th style={{ width: 90 }}>行号</th>
          <th>动作（整片，左右两侧同时做）</th>
          <th style={{ width: 130 }}>每侧针数</th>
          <th style={{ width: 150 }}>动作后一侧剩/有</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((ev, i) => (
          <tr key={i}>
            <td>第 {ev.row} 行</td>
            <td>{ev.note}</td>
            <td>{ev.perSide} 针 ×2 侧</td>
            <td>{ev.runningStsPerSide} 针</td>
          </tr>
        ))}
        <tr className="sizing-table-end">
          <td>第 {totalRows} 行</td>
          <td>该部位织完</td>
          <td>—</td>
          <td>—</td>
        </tr>
      </tbody>
    </table>
  );
}

export function VersionCard({ version, result, dirty, onRemove, onRename, onGauge, onRecalc, onDuplicate }: Props) {
  const [copied, setCopied] = useState(false);
  const hasError = result.errors.length > 0;

  const copyTable = async () => {
    const text = formatResultText(result, {
      name: version.name,
      revision: version.revision,
      calculatedAt: version.calculatedAt,
      fingerprint: version.fingerprint,
    });
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const time = new Date(version.calculatedAt);
  const timeStr = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`;

  return (
    <section className={`sizing-card ${hasError ? 'sizing-card-error' : ''}`}>
      <header className="sizing-card-head">
        <input
          className="sizing-name-input"
          value={version.name}
          onChange={(e) => onRename(e.target.value)}
          aria-label="版本名称"
        />
        <span className="sizing-badge" title="版本号：每点一次重算 +1">
          第 {version.revision} 版
        </span>
        <span className="sizing-badge sizing-badge-hash" title="参数指纹：尺寸或密度不同则指纹不同">
          #{version.fingerprint}
        </span>
        {dirty && <span className="sizing-badge sizing-badge-dirty">尺寸已改 · 待重算</span>}
        <div className="sizing-card-actions">
          <button className="sizing-btn sizing-btn-primary" onClick={onRecalc}>
            重算
          </button>
          <button className="sizing-btn" onClick={onDuplicate}>
            复制版本
          </button>
          <button className="sizing-btn sizing-btn-danger" onClick={onRemove}>
            删除
          </button>
        </div>
      </header>

      <div className="sizing-gauge-row">
        <label>
          密度：10cm
          <input
            type="number"
            min={1}
            step={0.5}
            value={version.gauge.stsPer10cm}
            onChange={(e) => onGauge({ stsPer10cm: Number(e.target.value) })}
          />
          针
        </label>
        <label>
          ×
          <input
            type="number"
            min={1}
            step={0.5}
            value={version.gauge.rowsPer10cm}
            onChange={(e) => onGauge({ rowsPer10cm: Number(e.target.value) })}
          />
          行
        </label>
        <span className="sizing-card-time">算于 {timeStr}</span>
        <button className="sizing-btn sizing-btn-small" onClick={copyTable}>
          {copied ? '已复制 ✓' : '复制抄写表'}
        </button>
      </div>

      {hasError ? (
        <ul className="sizing-errors">
          {result.errors.map((e, i) => (
            <li key={i}>⚠️ {e}</li>
          ))}
        </ul>
      ) : (
        <>
          <div className="sizing-figgrid">
            <figure>
              <figcaption>前/后片起针</figcaption>
              <div className="sizing-fig">{result.body.castOn} 针</div>
              <small>实宽约 {result.body.actualWidthCm} cm / 片</small>
            </figure>
            <figure>
              <figcaption>衣长总行数</figcaption>
              <div className="sizing-fig">{result.body.totalRows} 行</div>
              <small>下摆平织 {result.body.straightRows} 行后减挂肩</small>
            </figure>
            <figure>
              <figcaption>挂肩（每侧）</figcaption>
              <div className="sizing-fig">{result.body.armholeDecPerSide} 针</div>
              <small>
                平收 {result.body.initialBindOffPerSide} + 单针{' '}
                {result.body.armholeDecPerSide - result.body.initialBindOffPerSide}，共{' '}
                {result.body.armholeRows} 行
              </small>
            </figure>
            <figure>
              <figcaption>肩部留针</figcaption>
              <div className="sizing-fig">{result.body.shoulderSts} 针</div>
              <small>前后片缝合用</small>
            </figure>
            <figure>
              <figcaption>袖口起针</figcaption>
              <div className="sizing-fig">{result.sleeve.castOn} 针</div>
              <small>袖身加到 {result.sleeve.upperSts} 针</small>
            </figure>
            <figure>
              <figcaption>袖长总行数</figcaption>
              <div className="sizing-fig">{result.sleeve.totalRows} 行</div>
              <small>
                腋下 {result.sleeve.underarmRows} 行 + 袖山 {result.sleeve.capRows} 行
              </small>
            </figure>
            <figure>
              <figcaption>袖身加针（每侧）</figcaption>
              <div className="sizing-fig">{result.sleeve.taperIncPerSide} 针</div>
              <small>{result.sleeve.taperSchedule?.summary ?? '无需加针'}</small>
            </figure>
            <figure>
              <figcaption>袖山减针（每侧）</figcaption>
              <div className="sizing-fig">{result.sleeve.capDecPerSide} 针</div>
              <small>
                平收 {result.sleeve.capBindOffPerSide} + 单针{' '}
                {result.sleeve.capDecPerSide - result.sleeve.capBindOffPerSide}，顶收{' '}
                {result.sleeve.topBindOff}
              </small>
            </figure>
          </div>

          <h4 className="sizing-sub">挂肩减针行号表（前片/后片通用，行号从下摆起算）</h4>
          <ShapeTable
            rows={result.body.events}
            totalRows={result.body.totalRows}
            empty="本尺寸下挂肩无需减针。"
          />

          <h4 className="sizing-sub">袖山减针行号表（行号从袖口起算）</h4>
          <ShapeTable
            rows={result.sleeve.capEvents}
            totalRows={result.sleeve.totalRows}
            empty="袖山行数过少，无减针。"
          />

          {result.sleeve.taperSchedule && result.sleeve.taperSchedule.events.length > 0 && (
            <>
              <h4 className="sizing-sub">袖身加针行号表（行号从袖口起算）</h4>
              <ShapeTable
                rows={result.sleeve.taperSchedule.events}
                totalRows={result.sleeve.underarmRows}
                empty=""
              />
            </>
          )}

          <details className="sizing-details">
            <summary>就近取值说明（{result.notes.length} 项）与计算假设</summary>
            <NoteList result={result} />
            <ul className="sizing-assumptions">
              {result.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </details>
        </>
      )}
    </section>
  );
}
