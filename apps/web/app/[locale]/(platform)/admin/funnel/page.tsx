"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { type inferRouterOutputs } from "@trpc/server";
import { type AppRouter } from "@gmq/api";
import { trpc } from "@/lib/trpc";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type FunnelRow = RouterOutputs["admin"]["heroFunnel"]["rows"][number];

const DAY_OPTIONS = [7, 30, 90] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

const COUNT_COLUMNS = [
  { key: "views", en: "Views", zh: "浏览" },
  { key: "guesses", en: "Guessed", zh: "猜测" },
  { key: "interactions", en: "Played", zh: "动手" },
  { key: "submits", en: "Answered", zh: "作答" },
  { key: "correctSubmits", en: "Correct", zh: "答对" },
  { key: "reveals", en: "Reveal", zh: "揭示" },
  { key: "extensionOpens", en: "Extension", zh: "延伸" },
  { key: "hintUsers", en: "Hints", zh: "用提示" },
  { key: "giveUps", en: "Gave up", zh: "放弃" },
  { key: "comments", en: "Comments", zh: "评论" },
] as const satisfies ReadonlyArray<{ key: keyof FunnelRow; en: string; zh: string }>;

const RATE_COLUMNS = [
  { key: "viewToGuess", en: "View→Guess", zh: "浏览→猜测" },
  { key: "guessToInteract", en: "Guess→Play", zh: "猜测→动手" },
  { key: "interactToSubmit", en: "Play→Answer", zh: "动手→作答" },
  { key: "submitToReveal", en: "Answer→Reveal", zh: "作答→揭示" },
  { key: "viewToReveal", en: "View→Reveal", zh: "浏览→揭示" },
] as const satisfies ReadonlyArray<{ key: keyof FunnelRow["rates"]; en: string; zh: string }>;

function formatRate(rate: number | null): string {
  return rate === null ? "–" : `${Math.round(rate * 100)}%`;
}

function formatSeconds(seconds: number | null, isZh: boolean): string {
  if (seconds === null) return "–";
  if (seconds < 60) return isZh ? `${seconds} 秒` : `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return isZh ? `${m} 分 ${s} 秒` : `${m}m ${s}s`;
}

/** Green at/above the README §3 target, amber below it, plain when there is no target. */
function rateClass(rate: number | null, target: number | undefined): string {
  if (rate === null || target === undefined) return "text-gray-700";
  return rate >= target ? "text-green-700 font-semibold" : "text-amber-700 font-semibold";
}

export default function AdminFunnelPage() {
  const locale = useLocale();
  const isZh = locale === "zh";
  const [days, setDays] = useState<DayOption>(7);
  const { data, isLoading, error, refetch, isFetching } = trpc.admin.heroFunnel.useQuery({ days });

  const targets: Partial<Record<keyof FunnelRow["rates"], number>> = data
    ? { viewToGuess: data.targets.viewToGuess, viewToReveal: data.targets.viewToReveal }
    : {};
  const rows: FunnelRow[] = data?.rows ?? [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-800">
            {isZh ? "题目漏斗" : "Question Funnel"} 📉
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isZh
              ? "每道亮眼题：浏览 → 猜测 → 动手 → 作答 → 揭示"
              : "Each hero question: view → guess → play → answer → reveal"}
          </p>
        </div>
        <div role="group" aria-label={isZh ? "时间范围" : "Date range"} className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={days === d}
              onClick={() => setDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                days === d ? "bg-primary-500 text-white border-primary-500" : "bg-white text-gray-700 border-gray-200 hover:border-primary-300"
              }`}
            >
              {isZh ? `${d} 天` : `${d} days`}
            </button>
          ))}
        </div>
      </div>

      <details className="card-fun mb-6 text-sm text-gray-600">
        <summary className="cursor-pointer font-semibold text-gray-800">{isZh ? "怎么看这张表" : "How to read this table"}</summary>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          {isZh ? (
            <>
              <li>每一列都是「不同的人」：登录用户按账号，游客按匿名 ID。同一个人刷新多次只算一次（另附总浏览次数）。游客中途登录会算成两个人。</li>
              <li>转化率是相邻两步之比。有的题没有可操作的场景，或者孩子跳过了某一步，所以某一步的比例可能超过 100%。</li>
              <li>目标（README §3）：浏览→猜测 ≥ 60%，浏览→揭示 ≥ 40%。达标为绿色，未达标为橙色。</li>
              <li>「放弃」= 看到了揭示，但在这段时间内没有一次答对。「到揭示的中位用时」= 每个人从第一次浏览到第一次揭示的时间的中位数。</li>
              <li>评论数包括所有审核状态。数据最多延迟 60 秒。</li>
            </>
          ) : (
            <>
              <li>Every column counts distinct people: signed-in users by account, guests by anonymous id. Refreshing does not add more (total page views are shown too). A guest who signs in midway counts twice.</li>
              <li>Each rate is one step over the step before. Some questions have no playable scene, and kids can skip steps, so a step can exceed 100%.</li>
              <li>Targets (README §3): view→guess ≥ 60%, view→reveal ≥ 40%. Green meets the target, amber does not.</li>
              <li>&quot;Gave up&quot; = saw the reveal without a correct answer in the window. &quot;Median to reveal&quot; = median time from a person&apos;s first view to their first reveal.</li>
              <li>Comments include every moderation state. Numbers can be up to 60 seconds old.</li>
            </>
          )}
        </ul>
      </details>

      {isLoading ? (
        <div className="card-fun text-center text-gray-500 py-12" role="status">
          {isZh ? "加载中…" : "Loading…"}
        </div>
      ) : error ? (
        <div className="card-fun text-center py-12" role="alert">
          <p className="text-red-600 font-semibold">{isZh ? "加载失败" : "Could not load the funnel"}</p>
          <p className="text-gray-500 text-sm mt-1">{error.message}</p>
          <button type="button" onClick={() => refetch()} className="btn-primary mt-4">
            {isZh ? "重试" : "Retry"}
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="card-fun text-center text-gray-500 py-12">
          {isZh ? "还没有已发布的亮眼题。" : "No published hero questions yet."}
        </div>
      ) : (
        <div className="card-fun p-0 overflow-x-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">
              {isZh ? `最近 ${days} 天的题目漏斗，按浏览人数排序` : `Question funnel for the last ${days} days, sorted by views`}
            </caption>
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th scope="col" className="text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50">
                  {isZh ? "题目" : "Question"}
                </th>
                {COUNT_COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className="text-right px-3 py-2 font-semibold whitespace-nowrap">
                    {isZh ? c.zh : c.en}
                  </th>
                ))}
                <th scope="col" className="text-right px-3 py-2 font-semibold whitespace-nowrap">
                  {isZh ? "到揭示中位用时" : "Median to reveal"}
                </th>
                {RATE_COLUMNS.map((c) => (
                  <th key={c.key} scope="col" className="text-right px-3 py-2 font-semibold whitespace-nowrap">
                    {isZh ? c.zh : c.en}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.questionId} className="border-t border-gray-100 hover:bg-gray-50">
                  <th scope="row" className="text-left px-3 py-2 font-normal sticky left-0 bg-white">
                    <Link
                      href={`/${locale}/questions/${row.slug ?? row.questionId}`}
                      className="font-semibold text-primary-600 hover:underline"
                    >
                      {isZh ? row.titleZh || row.titleEn : row.titleEn || row.titleZh}
                    </Link>
                    <div className="text-xs text-gray-400">
                      {row.slug ?? row.questionId} · {row.ageGroup.replace("AGE_", "").replace("_", "–")} · {row.kind}
                      {` · ${isZh ? "浏览次数" : "page views"} ${row.viewEvents}`}
                    </div>
                  </th>
                  {COUNT_COLUMNS.map((c) => (
                    <td key={c.key} className="text-right px-3 py-2 tabular-nums">
                      {row[c.key]}
                    </td>
                  ))}
                  <td className="text-right px-3 py-2 tabular-nums whitespace-nowrap">
                    {formatSeconds(row.medianSecondsToReveal, isZh)}
                  </td>
                  {RATE_COLUMNS.map((c) => (
                    <td key={c.key} className={`text-right px-3 py-2 tabular-nums ${rateClass(row.rates[c.key], targets[c.key])}`}>
                      {formatRate(row.rates[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p className="text-xs text-gray-400 mt-3">
          {isZh ? "数据生成于 " : "Generated "}
          {new Date(data.generatedAt).toLocaleString(isZh ? "zh-CN" : "en-US")}
          {isFetching ? (isZh ? " · 刷新中…" : " · refreshing…") : ""}
        </p>
      )}
    </div>
  );
}
