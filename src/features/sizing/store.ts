import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  calculateSizing,
  shortHash,
  type GaugeInput,
  type Measurements,
} from './calc';

export interface SizingVersion {
  id: string;
  /** 版本名，如「中粗羊毛」 */
  name: string;
  gauge: GaugeInput;
  /** 「重算」次数；每次重算 +1 */
  revision: number;
  calculatedAt: number;
  /** 参数指纹：改了尺寸或密度就变 */
  fingerprint: string;
}

interface SizingState {
  measurements: Measurements;
  versions: SizingVersion[];
  setMeasurements: (patch: Partial<Measurements>) => void;
  addVersion: (gauge: GaugeInput, name?: string) => string;
  removeVersion: (id: string) => void;
  renameVersion: (id: string, name: string) => void;
  updateGauge: (id: string, patch: Partial<GaugeInput>) => void;
  /** 用当前尺寸 + 该版本密度重新计算：revision+1、刷新时间与指纹 */
  recalc: (id: string) => void;
  duplicateVersion: (id: string) => string;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

export const DEFAULT_MEASUREMENTS: Measurements = {
  bust: 96,
  length: 66,
  sleeveLength: 56,
  armholeDepth: 0,
  shoulderWidth: 0,
  bicep: 0,
  cuff: 0,
  capHeight: 0,
};

export function makeFingerprint(measurements: Measurements, gauge: GaugeInput): string {
  const payload = JSON.stringify([measurements, gauge]);
  return shortHash(payload);
}

export function getResult(version: SizingVersion, measurements: Measurements) {
  return calculateSizing(measurements, version.gauge);
}

function stamp(v: Omit<SizingVersion, 'fingerprint'>, measurements: Measurements): SizingVersion {
  return {
    ...v,
    calculatedAt: Date.now(),
    fingerprint: makeFingerprint(measurements, v.gauge),
  };
}

export const useSizingStore = create<SizingState>()(
  persist(
    (set) => ({
      measurements: DEFAULT_MEASUREMENTS,
      versions: [
        stamp(
          {
            id: uid(),
            name: '中粗线 A',
            gauge: { stsPer10cm: 18, rowsPer10cm: 24 },
            revision: 1,
            calculatedAt: Date.now(),
          },
          DEFAULT_MEASUREMENTS,
        ),
        stamp(
          {
            id: uid(),
            name: '粗线 B',
            gauge: { stsPer10cm: 14, rowsPer10cm: 20 },
            revision: 1,
            calculatedAt: Date.now(),
          },
          DEFAULT_MEASUREMENTS,
        ),
      ],

      setMeasurements: (patch) =>
        set((state) => ({ measurements: { ...state.measurements, ...patch } })),

      addVersion: (gauge, name) => {
        const id = uid();
        const v: SizingVersion = {
          id,
          name: name?.trim() || `密度 ${gauge.stsPer10cm}×${gauge.rowsPer10cm}`,
          gauge,
          revision: 1,
          calculatedAt: Date.now(),
          fingerprint: '',
        };
        set((state) => ({ versions: [...state.versions, stamp(v, state.measurements)] }));
        return id;
      },

      removeVersion: (id) => set((state) => ({ versions: state.versions.filter((v) => v.id !== id) })),

      renameVersion: (id, name) =>
        set((state) => ({
          versions: state.versions.map((v) => (v.id === id ? { ...v, name } : v)),
        })),

      updateGauge: (id, patch) =>
        set((state) => ({
          versions: state.versions.map((v) =>
            v.id === id ? stamp({ ...v, gauge: { ...v.gauge, ...patch } }, state.measurements) : v,
          ),
        })),

      recalc: (id) =>
        set((state) => ({
          versions: state.versions.map((v) =>
            v.id === id
              ? stamp({ ...v, revision: v.revision + 1 }, state.measurements)
              : v,
          ),
        })),

      duplicateVersion: (id) => {
        const newId = uid();
        set((state) => {
          const src = state.versions.find((v) => v.id === id);
          if (!src) return state;
          const copy: SizingVersion = stamp(
            { ...src, id: newId, name: src.name + ' 副本', revision: 1 },
            state.measurements,
          );
          return { versions: [...state.versions, copy] };
        });
        return newId;
      },
    }),
    {
      name: 'knit-sizing-store-v1',
      version: 1,
    },
  ),
);
