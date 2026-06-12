"use client";

import React, { useState, useEffect } from "react";
import HeatMap3D from "@/components/HeatMap3D";
import dynamic from "next/dynamic";
import { Sliders, Sparkles, Trees, Info, Activity, Thermometer, Droplets, Wind, Network, CheckCircle2, XCircle, Clock } from "lucide-react";
import "leaflet/dist/leaflet.css";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

function formatMarkdownText(text: string) {
  const lines = text.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: JSX.Element[] = [];

  const parseBold = (content: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts: (string | JSX.Element)[] = [];
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = boldRegex.exec(content)) !== null) {
      if (match.index > last) parts.push(content.substring(last, match.index));
      parts.push(
        <strong key={match.index} className="text-emerald-400 font-bold">{match[1]}</strong>
      );
      last = boldRegex.lastIndex;
    }
    if (last < content.length) parts.push(content.substring(last));
    return parts;
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    const listMatch = /^[*-]\s+(.+)/.exec(line);
    if (listMatch) {
      const parts = parseBold(listMatch[1]);
      listItems.push(<li key={idx}>{parts}</li>);
      return;
    }
    if (listItems.length) {
      elements.push(
        <ul key={`list-${idx}`} className="list-disc pl-5 mb-2">
          {listItems}
        </ul>
      );
      listItems = [];
    }
    if (line === '') {
      elements.push(<p key={idx} className="h-3"></p>);
    } else {
      const parts = parseBold(rawLine);
      elements.push(
        <p key={idx} className="mb-2 text-slate-300 font-sans text-sm leading-relaxed">
          {parts}
        </p>
      );
    }
  });

  if (listItems.length) {
    elements.push(
      <ul key="list-final" className="list-disc pl-5 mb-2">
        {listItems}
      </ul>
    );
  }

  return elements;
}


// ─── Network Response Inspector Component ────────────────────────────────────

type FieldType = "string" | "number" | "array" | "object" | "bool" | "null";

interface ResponseField {
  key: string;
  rawValue: unknown;
  preview: string;
  fullValue: string;
  type: FieldType;
  byteSize: number;
  children?: ResponseField[];
}

interface ParsedResponse {
  status: "success" | "error" | "empty";
  timestamp: string;
  latency?: number;
  rawSize: number;
  fields: ResponseField[];
  httpMethod: string;
  endpoint: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function inferType(v: unknown): FieldType {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  if (typeof v === "object") return "object";
  if (typeof v === "number") return "number";
  if (typeof v === "boolean") return "bool";
  return "string";
}

function byteSize(v: unknown): number {
  return new TextEncoder().encode(JSON.stringify(v)).length;
}

function buildField(key: string, v: unknown): ResponseField {
  const type = inferType(v);
  const full  = type === "string" ? String(v) : JSON.stringify(v, null, 2);
  const preview =
    type === "array"
      ? `Array(${(v as unknown[]).length})`
      : type === "object"
      ? `{${Object.keys(v as object)
          .slice(0, 3)
          .join(", ")}${Object.keys(v as object).length > 3 ? ", …" : ""}}`
      : type === "string"
      ? (String(v).length > 72 ? String(v).substring(0, 72) + "…" : String(v))
      : String(v);

  const children: ResponseField[] | undefined =
    (type === "object" || type === "array") && v !== null
      ? Object.entries(v as object).map(([k, child]) => buildField(k, child))
      : undefined;

  return { key, rawValue: v, preview, fullValue: full, type, byteSize: byteSize(v), children };
}

function parseRawDebug(raw: string, latency?: number): ParsedResponse {
  const timestamp = new Date().toISOString();
  if (!raw) return { status: "empty", timestamp, rawSize: 0, fields: [], httpMethod: "POST", endpoint: "/api/optimize" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      status: "error",
      timestamp,
      latency,
      rawSize: raw.length,
      fields: [buildField("raw_text", raw)],
      httpMethod: "POST",
      endpoint: "/api/optimize",
    };
  }

  const fields = Object.entries(parsed as object).map(([k, v]) => buildField(k, v));
  return { status: "success", timestamp, latency, rawSize: raw.length, fields, httpMethod: "POST", endpoint: "/api/optimize" };
}

// ── Sub-components ────────────────────────────────────────────────────────────

const TYPE_PILL: Record<FieldType, string> = {
  string: "bg-sky-500/15 text-sky-300 border-sky-500/25",
  number: "bg-violet-500/15 text-violet-300 border-violet-500/25",
  array:  "bg-orange-500/15 text-orange-300 border-orange-500/25",
  object: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
  bool:   "bg-pink-500/15 text-pink-300 border-pink-500/25",
  null:   "bg-slate-500/15 text-slate-400 border-slate-500/25",
};
const TYPE_VALUE: Record<FieldType, string> = {
  string: "text-emerald-300",
  number: "text-violet-300",
  array:  "text-orange-300",
  object: "text-yellow-200",
  bool:   "text-pink-300",
  null:   "text-slate-500",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500 bg-slate-900"
    >
      {copied ? "✓" : "copy"}
    </button>
  );
}

function FieldRow({ field, depth = 0 }: { field: ResponseField; depth?: number }) {
  const [open, setOpen] = React.useState(depth === 0);
  const hasChildren = field.children && field.children.length > 0;
  const indent = depth * 12;

  return (
    <div className="w-full">
      <div
        className="flex items-start gap-2 px-2 py-[5px] rounded-lg hover:bg-slate-800/60 transition-colors group cursor-default"
        style={{ paddingLeft: `${8 + indent}px` }}
        onClick={() => hasChildren && setOpen((p) => !p)}
      >
        {/* Expand arrow */}
        <span className={`shrink-0 mt-0.5 w-3 text-[9px] text-slate-600 ${hasChildren ? "cursor-pointer" : ""}`}>
          {hasChildren ? (open ? "▾" : "▸") : ""}
        </span>

        {/* Type badge */}
        <span className={`shrink-0 mt-[1px] text-[8px] font-black uppercase tracking-wider px-1.5 py-[2px] rounded-sm border font-mono ${TYPE_PILL[field.type]}`}>
          {field.type === "array" ? `arr[${(field.rawValue as unknown[]).length}]` : field.type}
        </span>

        {/* Key */}
        <span className="shrink-0 text-[11px] font-mono font-semibold text-slate-200 min-w-[72px] max-w-[100px] truncate">
          {field.key}
        </span>

        {/* Separator */}
        <span className="shrink-0 text-slate-600 text-[11px] font-mono">:</span>

        {/* Value preview */}
        <span className={`text-[11px] font-mono break-all leading-[1.5] min-w-0 flex-1 ${TYPE_VALUE[field.type]}`}>
          {field.preview}
        </span>

        {/* Byte size */}
        <span className="shrink-0 text-[9px] text-slate-700 font-mono ml-1 mt-0.5">
          {field.byteSize > 1024 ? `${(field.byteSize / 1024).toFixed(1)}kb` : `${field.byteSize}b`}
        </span>

        {/* Copy */}
        <CopyButton text={field.fullValue} />
      </div>

      {/* Children (expanded) */}
      {hasChildren && open && (
        <div className="border-l border-slate-800/60 ml-[19px]">
          {field.children!.map((child) => (
            <FieldRow key={child.key} field={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: ParsedResponse["status"] }) {
  const cfg = {
    success: "bg-emerald-400 shadow-emerald-400/50",
    error:   "bg-red-400 shadow-red-400/50",
    empty:   "bg-slate-600",
  }[status];
  const pulse = status !== "empty";
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full shadow-sm ${cfg} ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

function StreamLines() {
  return (
    <div className="flex flex-col gap-[3px] py-3 px-2">
      {[
        { w: "w-3/4", label: "POST /api/optimize", color: "bg-emerald-500/30" },
        { w: "w-1/2", label: "", color: "bg-slate-700/40" },
        { w: "w-5/6", label: "", color: "bg-slate-700/30" },
        { w: "w-2/3", label: "", color: "bg-slate-700/40" },
      ].map((line, i) => (
        <div
          key={i}
          className={`h-[6px] rounded-full ${line.w} ${line.color} animate-pulse`}
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function NetworkInspector({
  raw,
  isLoading,
  isOpen,
  onToggle,
}: {
  raw: string;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [tab, setTab] = React.useState<"parsed" | "raw">("parsed");
  const [latency, setLatency] = React.useState<number | undefined>();
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (isLoading) {
      startRef.current = performance.now();
    } else if (startRef.current !== null) {
      setLatency(Math.round(performance.now() - startRef.current));
      startRef.current = null;
    }
  }, [isLoading]);

  const parsed = React.useMemo(() => parseRawDebug(raw, latency), [raw, latency]);

  const borderColor =
    parsed.status === "success" ? "border-emerald-500/20" :
    parsed.status === "error"   ? "border-red-500/30" :
                                   "border-slate-800/50";

  const statusLabel =
    parsed.status === "success" ? "200 OK" :
    parsed.status === "error"   ? "Error" :
                                   "Idle";

  const statusLabelColor =
    parsed.status === "success" ? "text-emerald-400" :
    parsed.status === "error"   ? "text-red-400" :
                                   "text-slate-500";

  const formattedTime = new Date(parsed.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });

  return (
    <div className={`mt-4 rounded-xl border ${borderColor} bg-[#0a0f1a] overflow-hidden shadow-2xl`}>

      {/* ── Title bar ── */}
      <div
        className="flex items-center gap-0 border-b border-slate-800/60 bg-slate-900/70 cursor-pointer hover:bg-slate-800/50 transition-colors"
        onClick={onToggle}
      >
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-r border-slate-800/60">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
        </div>

        {/* URL bar */}
        <div
          className="flex-1 flex items-center gap-2 px-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Network className="w-3 h-3 text-slate-500 shrink-0" />
          <span className="text-[10px] font-mono text-slate-500">
            <span className="text-violet-400 font-bold">{parsed.httpMethod}</span>
            {" "}
            <span className="text-slate-400">{parsed.endpoint}</span>
          </span>
        </div>

        {/* Status + meta */}
        <div className="flex items-center gap-3 px-3 py-2.5">
          {isLoading && (
            <span className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
              pending
            </span>
          )}
          {!isLoading && raw && (
            <>
              {latency !== undefined && (
                <span className="text-[10px] font-mono text-slate-500">
                  <span className={latency < 500 ? "text-emerald-400" : latency < 1500 ? "text-yellow-400" : "text-red-400"}>
                    {latency}ms
                  </span>
                </span>
              )}
              <span className="text-[10px] font-mono text-slate-500">
                {(parsed.rawSize / 1024).toFixed(1)} KB
              </span>
              <span className={`flex items-center gap-1 text-[10px] font-mono font-bold ${statusLabelColor}`}>
                <StatusDot status={parsed.status} />
                {statusLabel}
              </span>
            </>
          )}
          {/* Collapse toggle */}
          <button
            onClick={(e) => e.stopPropagation()}
            className="text-slate-600 hover:text-slate-400 transition-colors ml-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                className={`transition-transform duration-200 ${isOpen ? "rotate-0" : "rotate-180"}`} />
            </svg>
          </button>
        </div>
      </div>

      {isOpen && (
        <>
          {/* ── Tab bar ── */}
          {raw && !isLoading && (
            <div className="flex border-b border-slate-800/60 bg-slate-900/40">
              {(["parsed", "raw"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest transition-all border-b-2 ${
                    tab === t
                      ? "border-emerald-500 text-emerald-400 bg-emerald-500/5"
                      : "border-transparent text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {t === "parsed" ? "⬡ Parsed" : "{ } Raw"}
                </button>
              ))}
              <div className="ml-auto flex items-center px-3 gap-2">
                <span className="text-[9px] font-mono text-slate-700">{formattedTime}</span>
                <span className="text-[9px] font-mono text-slate-700">{parsed.fields.length} fields</span>
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div className="max-h-[260px] overflow-y-auto custom-scrollbar">

            {/* Empty state */}
            {parsed.status === "empty" && !isLoading && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                  <Network className="w-5 h-5 text-slate-700" />
                </div>
                <div className="text-center">
                  <p className="text-[11px] text-slate-500 font-mono font-semibold">Awaiting request</p>
                  <p className="text-[10px] text-slate-700 font-mono mt-0.5">
                    Run AI Optimization to capture a response
                  </p>
                </div>
              </div>
            )}

            {/* Loading */}
            {isLoading && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-[10px] font-mono text-amber-400/70">Waiting for response…</span>
                </div>
                <StreamLines />
                {[72, 55, 85, 48, 65].map((w, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="h-[18px] w-10 rounded-sm bg-slate-800/80 animate-pulse shrink-0" />
                    <div className="h-[18px] w-16 rounded-sm bg-slate-800/60 animate-pulse shrink-0" />
                    <div
                      className="h-[18px] rounded-sm bg-slate-800/50 animate-pulse"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Parsed tab */}
            {!isLoading && tab === "parsed" && parsed.fields.length > 0 && (
              <div className="py-1.5 px-1">
                {parsed.fields.map((field) => (
                  <FieldRow key={field.key} field={field} depth={0} />
                ))}
              </div>
            )}

            {/* Raw tab */}
            {!isLoading && tab === "raw" && raw && (
              <div className="relative group/raw">
                <pre className="p-4 text-[10.5px] font-mono text-slate-400 leading-relaxed whitespace-pre-wrap break-all">
                  {raw}
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(raw)}
                  className="absolute top-2 right-2 opacity-0 group-hover/raw:opacity-100 transition-opacity px-2 py-1 rounded text-[9px] font-mono font-bold border border-slate-700 text-slate-500 hover:text-slate-300 bg-slate-900"
                >
                  copy all
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [location, setLocation] = useState<[number, number] | null>([22.5726, 88.3639]);
  const [canopyCoverage, setCanopyCoverage] = useState(50);
  const [concreteRatio, setConcreteRatio] = useState(30);
  const [analysis, setAnalysis] = useState<string>("");
  const [matches, setMatches] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; humidity: number; wind: number } | null>(null);
  const [rawDebug, setRawDebug] = useState<string>("");
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  const fetchLocalWeather = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
      );
      if (response.ok) {
        const data = await response.json();
        setWeather({
          temp: data.current?.temperature_2m ?? 0,
          humidity: data.current?.relative_humidity_2m ?? 0,
          wind: data.current?.wind_speed_10m ?? 0,
        });
      }
    } catch (e) {
      console.error("Weather fetch error:", e);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          setLocation([22.5726, 88.3639]);
          fetchLocalWeather(22.5726, 88.3639);
        }
      );
    } else {
      setLocation([22.5726, 88.3639]);
      fetchLocalWeather(22.5726, 88.3639);
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchLocalWeather(location[0], location[1]);
    }
  }, [location]);

  const triggerOptimization = async (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    setIsLoading(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canopyCoverage,
          concreteRatio,
          ...(location ? { lat: location[0], lng: location[1] } : {}),
          ...(weather ? { weather } : {}),
        }),
      });

      const text = await response.text();
      setRawDebug(text);
      setIsInspectorOpen(true);

      if (!response.ok) {
        let errData;
        try {
          errData = JSON.parse(text);
        } catch (_) {
          errData = { error: text };
        }
        console.error("Optimization error:", errData);
        setAnalysis(`Error: ${errData.error || "Unexpected error occurred during simulation."}`);
        setMatches([]);
        return;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        throw new Error('Server returned invalid JSON: ' + text.substring(0, 50));
      }

      const finalAnalysis =
        typeof data.analysis === 'string'
          ? data.analysis
          : data.analysis?.content || JSON.stringify(data.analysis) || "No analysis text returned.";

      let cleanedAnalysis = finalAnalysis;
      try {
        cleanedAnalysis = JSON.parse(`"${finalAnalysis.replace(/"/g, '\\"')}"`);
      } catch (e) {
        cleanedAnalysis = finalAnalysis
          .replace(/\\\\n/g, "\n")
          .replace(/\\n/g, "\n")
          .replace(/\\\\t/g, "\t")
          .replace(/\\t/g, "\t")
          .replace(/\\\*/g, "*");
      }

      setAnalysis(cleanedAnalysis);

      let finalMatches: any[] = [];
      if (Array.isArray(data.matches) && data.matches.length > 0) {
        finalMatches = data.matches;
      } else if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        finalMatches = data.recommendations;
      } else {
        finalMatches = [
          {
            id: "fallback-neem",
            metadata: {
              name: "Azadirachta indica (Neem)",
              category: "Native / Resilient",
              coolingEfficiency: 9,
              droughtResistance: "High",
            },
            text: "Fallback generated because backend match array was empty.",
          },
        ];
      }
      setMatches(finalMatches);
    } catch (e) {
      console.error(e);
      setAnalysis(`Execution Failure: ${e instanceof Error ? e.message : String(e)}`);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#030712] text-gray-100 font-sans">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Sidebar */}
      <aside className="w-[400px] bg-slate-900/40 backdrop-blur-md border-r border-slate-800/60 flex flex-col h-full shadow-2xl z-10 transition-all duration-300 hover:border-slate-700/60">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md flex-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shadow-lg shadow-emerald-500/20">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">EcoCompute</h1>
              <p className="text-xs text-slate-400 font-medium">Urban Heat Island Optimizer</p>
            </div>
          </div>
        </div>

        {/* Configuration Panel */}
        <div className="p-6 border-b border-slate-800/60 space-y-6 flex-none max-h-[450px] overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Simulation Parameters</span>
          </div>

          {/* Live Climate Telemetry */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Trees className="w-4 h-4 text-sky-400" />
              <span>Live Climate Telemetry</span>
            </div>

            {weather ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-3 text-center transition-all duration-300 hover:scale-[1.02]">
                  <div className="w-8 h-8 mx-auto mb-1.5 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Thermometer className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Temp</div>
                  <div className="text-lg font-bold text-red-300">{weather.temp}°C</div>
                </div>

                <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-3 text-center transition-all duration-300 hover:scale-[1.02]">
                  <div className="w-8 h-8 mx-auto mb-1.5 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Droplets className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Humidity</div>
                  <div className="text-lg font-bold text-blue-300">{weather.humidity}%</div>
                </div>

                <div className="bg-gradient-to-br from-cyan-500/20 to-teal-600/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-3 text-center transition-all duration-300 hover:scale-[1.02]">
                  <div className="w-8 h-8 mx-auto mb-1.5 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <Wind className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Wind</div>
                  <div className="text-lg font-bold text-cyan-300">{weather.wind} km/h</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500">● Keyless Telemetry Stream Active</div>
            )}
          </div>

          {/* Canopy Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Canopy Coverage</div>
              <span className="text-emerald-400 font-bold text-lg">{canopyCoverage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={canopyCoverage}
              onChange={(e) => setCanopyCoverage(Number(e.target.value))}
              className="w-full h-2 bg-slate-800/50 rounded-full appearance-none cursor-pointer transition-all duration-300"
              style={{
                background: `linear-gradient(to right, rgba(20,184,166,0.3), rgba(16,185,129,0.6) ${canopyCoverage}%, rgba(24,25,28,0.5) ${canopyCoverage}%, rgba(24,25,28,0.5))`,
              }}
            />
          </div>

          {/* Concrete Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">Concrete Ratio</div>
              <span className="text-orange-400 font-bold text-lg">{concreteRatio}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={concreteRatio}
              onChange={(e) => setConcreteRatio(Number(e.target.value))}
              className="w-full h-2 bg-slate-800/50 rounded-full appearance-none cursor-pointer transition-all duration-300"
              style={{
                background: `linear-gradient(to right, rgba(255,107,107,0.3), rgba(252,165,165,0.6) ${concreteRatio}%, rgba(24,25,28,0.5) ${concreteRatio}%, rgba(24,25,28,0.5))`,
              }}
            />
          </div>

          {/* Run Button */}
          <button
            onClick={(e) => triggerOptimization(e)}
            disabled={isLoading}
            className="w-full mt-4 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-5 h-5" />
            {isLoading ? "Analyzing Metrics..." : "Run AI Optimization"}
          </button>

          {/* Network Response Inspector */}
          <NetworkInspector
              raw={rawDebug}
              isLoading={isLoading}
              isOpen={isInspectorOpen}
              onToggle={() => setIsInspectorOpen((p) => !p)}
            />
        </div>

        {/* Analytics Feed */}
        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {isLoading && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Querying cloud vector matrix...</span>
              </div>
              <div className="space-y-3">
                <div className="h-28 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl animate-pulse"></div>
                <div
                  className="h-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl animate-pulse"
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          )}

          {analysis && !isLoading && (
            <div className="space-y-3 fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Targeted Adaptation Plan</span>
              </div>
              <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-xl p-5 text-slate-300 leading-relaxed text-sm font-mono whitespace-pre-wrap shadow-inner">
                {formatMarkdownText(analysis)}
              </div>
            </div>
          )}

          {matches.length > 0 && !isLoading && (
            <div className="space-y-4 fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <Trees className="w-3.5 h-3.5 text-teal-400" />
                <span>Optimized Forestry Matches</span>
              </div>
              <div className="space-y-3">
                {matches.map((m) => {
                  const name = m.metadata?.name || m.name || m.id.replace('tree-', '').toUpperCase();
                  const drought = m.metadata?.droughtResistance || m.droughtResistance || 'Medium';
                  const cooling = m.metadata?.coolingEfficiency || m.coolingEfficiency || '8';
                  const category = m.metadata?.category || m.category || 'native';

                  const accentColors: Record<string, string> = {
                    native: 'border-l-emerald-400',
                    fruit: 'border-l-orange-400',
                    shade: 'border-l-blue-400',
                    hedge: 'border-l-purple-400',
                    default: 'border-l-teal-400',
                  };
                  const accentBorder = accentColors[category] ?? accentColors.default;

                  return (
                    <div
                      key={m.id}
                      className={`p-4 bg-slate-900/40 backdrop-blur-md border ${accentBorder} rounded-xl hover:bg-slate-800/50 transition-all duration-300 shadow-lg shadow-black/20`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-semibold text-white tracking-wide">{name}</h4>
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            drought === 'High'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {drought} Water Res
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed mb-3">{m.text}</p>
                      <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-medium border-t border-slate-700/50">
                        <span>
                          Cooling Index: <strong className="text-emerald-400 font-bold">{cooling}/10</strong>
                        </span>
                        <span>
                          ID: <code className="text-slate-400 bg-slate-800/50 px-1.5 py-0.5 rounded">{m.id}</code>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Primary Visualization Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-2rem)]">
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/60 overflow-hidden">
          <MapPicker
            center={location ?? undefined}
            onLocationSelect={(lat: number, lng: number) => setLocation([lat, lng])}
            onZoneClick={(canopy, concrete) => {
              setCanopyCoverage(canopy);
              setConcreteRatio(concrete);
            }}
          />
        </div>
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/60 rounded-2xl shadow-2xl transition-all duration-300 hover:border-slate-700/60 overflow-hidden">
          <HeatMap3D canopyCoverage={canopyCoverage} concreteRatio={concreteRatio} weather={weather} />
        </div>
      </div>
    </div>
  );
}