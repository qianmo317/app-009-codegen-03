import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KnitInput, SavedVersion } from '../knitting/types';
import { computeGarment } from '../knitting/garment';
import { defaultInput } from '../knitting/defaults';

function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

interface KnitState {
  versions: SavedVersion[];
  /** 当前编辑中的输入（未保存） */
  draft: KnitInput;
  selected: string[]; // 勾选参与对比的版本 id
  editId: string | null; // 正在编辑的版本（改过尺寸后重算）
  setDraft: (patch: Partial<KnitInput>) => void;
  patchMeasure: (k: keyof KnitInput['m'], v: number) => void;
  patchParam: (k: keyof KnitInput['p'], v: number) => void;
  patchGauge: (k: keyof KnitInput['gauge'], v: number) => void;
  loadDraft: (id: string) => void;
  resetDraft: () => void;
  /** 用当前 draft 重算并存版；editId 存在则覆盖该版（版本名保留，时间更新） */
  saveVersion: () => string;
  /** 无论当前是否在编辑某版，都把 draft 另存为一个新版本 */
  saveAsNewVersion: () => string;
  deleteVersion: (id: string) => void;
  toggleSelect: (id: string) => void;
  clearAll: () => void;
}

export const useKnitStore = create<KnitState>()(
  persist(
    (set, get) => ({
      versions: [],
      draft: defaultInput(),
      selected: [],
      editId: null,

      setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      patchMeasure: (k, v) =>
        set((s) => ({ draft: { ...s.draft, m: { ...s.draft.m, [k]: v } } })),
      patchParam: (k, v) =>
        set((s) => ({ draft: { ...s.draft, p: { ...s.draft.p, [k]: v } } })),
      patchGauge: (k, v) =>
        set((s) => ({ draft: { ...s.draft, gauge: { ...s.draft.gauge, [k]: v } } })),

      loadDraft: (id) => {
        const v = get().versions.find((x) => x.id === id);
        if (v) set({ draft: structuredClone(v.input), editId: id });
      },
      resetDraft: () =>
        set({ draft: defaultInput(), editId: null }),

      saveVersion: () => {
        const { draft, editId, versions } = get();
        const result = computeGarment(draft);
        if (editId) {
          const idx = versions.findIndex((x) => x.id === editId);
          if (idx >= 0) {
            const updated: SavedVersion = {
              ...versions[idx],
              input: structuredClone(draft),
              result,
              createdAt: Date.now(),
            };
            const next = [...versions];
            next[idx] = updated;
            set({ versions: next });
            return editId;
          }
        }
        return get().saveAsNewVersion();
      },

      saveAsNewVersion: () => {
        const { draft, versions, selected } = get();
        const id = uid();
        // 名字按现存最大编号 +1，避免删过/覆盖过之后重号
        const maxNo = versions.reduce((mx, v) => {
          const n = /^v(\d+)$/.exec(v.name);
          return n ? Math.max(mx, Number(n[1])) : mx;
        }, 0);
        const saved: SavedVersion = {
          id,
          name: `v${maxNo + 1}`,
          createdAt: Date.now(),
          input: structuredClone(draft),
          result: computeGarment(draft),
        };
        // 新存的版本自动加入对比集合；用户可在列表里手动取消勾选
        const nextSelected = selected.includes(id) ? selected : [...selected, id];
        set({ versions: [...versions, saved], selected: nextSelected, editId: id });
        return id;
      },

      deleteVersion: (id) =>
        set((s) => ({
          versions: s.versions.filter((x) => x.id !== id),
          selected: s.selected.filter((x) => x !== id),
          editId: s.editId === id ? null : s.editId,
        })),

      toggleSelect: (id) =>
        set((s) => ({
          selected: s.selected.includes(id)
            ? s.selected.filter((x) => x !== id)
            : [...s.selected, id],
        })),

      clearAll: () => set({ versions: [], selected: [], editId: null }),
    }),
    { name: 'knit-guide-versions' },
  ),
);
