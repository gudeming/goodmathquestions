"use client";

import { useLocale } from "next-intl";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  LEGACY_SCENE_TYPES,
  MODE_SAMPLES,
  NEW_SCENE_TYPES,
  SAMPLE_SCENE_CONFIGS,
  TRICK_SAMPLES,
  parseSceneConfig,
  type SceneConfigType,
  type SceneEvent,
  type ScenePhase,
} from "@gmq/animation-engine";
import { SceneHost } from "@/components/scenes/SceneHost";

// Admin-only (gated by admin/layout.tsx). Scene playground: pick a type, edit its JSON,
// see validation errors live, switch phases and watch the emitted events.

const PHASES: ScenePhase[] = ["hook", "explore", "reveal"];
const MAX_LOG = 200;

type Preset = { id: string; label: string; config: unknown };

const PRESETS: Preset[] = [
  ...NEW_SCENE_TYPES.map((t) => ({ id: t, label: t, config: SAMPLE_SCENE_CONFIGS[t] })),
  { id: "trick:mind-reading-five", label: "number_trick_stepper · D2 mind-reading (5)", config: TRICK_SAMPLES.mindReadingFive },
  { id: "trick:scramble-nine", label: "number_trick_stepper · D3 scramble (÷9)", config: TRICK_SAMPLES.scrambleNine },
  { id: "trick:kaprekar", label: "number_trick_stepper · D4 Kaprekar (6174)", config: TRICK_SAMPLES.kaprekar },
  { id: "mode:dice-product", label: "dice_lab · C6 product parity", config: MODE_SAMPLES.diceProduct },
  { id: "mode:dice-until-six", label: "dice_lab · C8 rolls until a six", config: MODE_SAMPLES.diceUntilSix },
  { id: "mode:birthday-match-me", label: "birthday_room · C9 matches me", config: MODE_SAMPLES.birthdayMatchMe },
  { id: "mode:balance-weights", label: "balance_lab · E10 weights 1-3-9-27", config: MODE_SAMPLES.balanceWeights },
  { id: "mode:knights-and-knaves", label: "illustration · F8 knights and knaves", config: MODE_SAMPLES.knightsAndKnaves },
  { id: "mode:scale-heartbeats", label: "scale_ladder · A5 billion heartbeats", config: MODE_SAMPLES.scaleHeartbeats },
  { id: "mode:scale-powers", label: "scale_ladder · A9 googol vs atoms", config: MODE_SAMPLES.scalePowers },
  { id: "mode:halving-thirds", label: "halving_bar · A10 extension 1/3 + 1/9 + …", config: MODE_SAMPLES.halvingThirds },
  { id: "mode:bridges-one-removed", label: "bridges_trace · B7 extension (one bridge removed)", config: MODE_SAMPLES.bridgesOneRemoved },
  { id: "mode:socks-two-pairs", label: "sock_drawer · C5 extension (two pairs)", config: MODE_SAMPLES.socksTwoPairs },
  ...LEGACY_SCENE_TYPES.map((t: SceneConfigType) => ({ id: t, label: `${t} (legacy)`, config: SAMPLE_SCENE_CONFIGS[t] })),
];

const pretty = (v: unknown) => JSON.stringify(v, null, 2);

interface LogEntry {
  id: number;
  at: string;
  name: string;
  props?: Record<string, unknown>;
}

export default function AdminScenesPage() {
  const isZh = useLocale() === "zh";
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [text, setText] = useState(() => pretty(PRESETS[0].config));
  const [phase, setPhase] = useState<ScenePhase>("explore");
  const [sceneLocale, setSceneLocale] = useState<"en" | "zh">(isZh ? "zh" : "en");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [mountKey, setMountKey] = useState(0);
  const nextId = useRef(0);

  // JSON errors and schema errors are both shown live; the preview keeps the last valid config.
  const { config, jsonError } = useMemo(() => {
    try {
      return { config: JSON.parse(text) as unknown, jsonError: null as string | null };
    } catch (e) {
      return { config: undefined, jsonError: (e as Error).message };
    }
  }, [text]);
  const validation = useMemo(() => (jsonError ? null : parseSceneConfig(config)), [config, jsonError]);

  const push = (name: string, props?: Record<string, unknown>) =>
    setLog((prev) => [{ id: nextId.current++, at: new Date().toLocaleTimeString(), name, props }, ...prev].slice(0, MAX_LOG));

  const choosePreset = (id: string) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    setText(pretty(preset.config));
    setMountKey((k) => k + 1);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-heading font-bold text-gray-800">{isZh ? "场景实验室" : "Scene Playground"} 🎬</h1>
        <Link href="/admin" className="text-sm text-primary-600 hover:underline">
          ← {isZh ? "返回管理后台" : "Back to dashboard"}
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <section className="space-y-3">
          <label className="block text-sm font-heading text-gray-600">
            {isZh ? "场景类型 / 样例" : "Scene type / sample"}
            <select value={presetId} onChange={(e) => choosePreset(e.target.value)} className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm">
              {PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-heading text-gray-600">
            {isZh ? "配置 JSON" : "Config JSON"}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              spellCheck={false}
              rows={16}
              className={`mt-1 block w-full rounded-lg border bg-white p-3 font-mono text-xs ${jsonError || (validation && !validation.ok) ? "border-fun-red" : "border-gray-200"}`}
            />
          </label>

          <div role="status" className={`rounded-lg p-3 text-xs font-mono ${jsonError || (validation && !validation.ok) ? "bg-fun-red/10 text-red-700" : "bg-fun-green/15 text-green-700"}`}>
            {jsonError ? `JSON: ${jsonError}` : validation && !validation.ok ? validation.error : isZh ? "✓ 配置合法" : "✓ Valid config"}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {PHASES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPhase(p);
                  push(`[host] phase → ${p}`);
                }}
                aria-pressed={phase === p}
                className={`min-h-[44px] rounded-full px-4 text-sm font-heading font-bold ${phase === p ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"}`}
              >
                {p}
              </button>
            ))}
            <button type="button" onClick={() => setSceneLocale((l) => (l === "en" ? "zh" : "en"))} className="min-h-[44px] rounded-full bg-gray-100 px-4 text-sm font-heading text-gray-600">
              {sceneLocale === "en" ? "EN → 中文" : "中文 → EN"}
            </button>
            <button type="button" onClick={() => setMountKey((k) => k + 1)} className="min-h-[44px] rounded-full bg-gray-100 px-4 text-sm font-heading text-gray-600">
              {isZh ? "重新挂载" : "Remount"}
            </button>
          </div>

          <div className="rounded-card border-2 border-primary-100 bg-white p-3 shadow-sm">
            {jsonError ? (
              <p className="py-24 text-center text-sm text-gray-400">{isZh ? "JSON 无法解析" : "JSON does not parse"}</p>
            ) : (
              <SceneHost
                key={mountKey}
                config={config}
                phase={phase}
                locale={sceneLocale}
                onEvent={(e: SceneEvent) => push(e.name, e.props)}
                onProposeAnswer={(v) => push("[onProposeAnswer]", { value: v })}
              />
            )}
            {!jsonError && validation && !validation.ok && <p className="py-6 text-center text-sm text-gray-400">{isZh ? "配置不合法：场景渲染为空（与线上一致）" : "Invalid config: the scene renders nothing (same as production)"}</p>}
          </div>

          <div className="rounded-card border border-gray-100 bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-heading font-bold text-gray-700">{isZh ? "事件日志" : "Event log"}</h2>
              <button type="button" onClick={() => setLog([])} className="text-xs text-gray-500 hover:underline">
                {isZh ? "清空" : "Clear"}
              </button>
            </div>
            <ol className="max-h-56 space-y-1 overflow-y-auto font-mono text-xs" aria-live="polite">
              {log.length === 0 && <li className="text-gray-400">{isZh ? "还没有事件" : "No events yet"}</li>}
              {log.map((l) => (
                <li key={l.id} className="flex gap-2">
                  <span className="shrink-0 text-gray-400">{l.at}</span>
                  <span className={`shrink-0 font-bold ${l.name.startsWith("scene_") ? "text-red-600" : l.name.startsWith("[") ? "text-gray-500" : "text-primary-700"}`}>{l.name}</span>
                  {l.props && <span className="break-all text-gray-600">{JSON.stringify(l.props)}</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}
