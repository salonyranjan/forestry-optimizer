"use client";

import { useState, useEffect } from "react";
import HeatMap3D from "@/components/HeatMap3D";
import dynamic from "next/dynamic";
const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });
import { Sliders, Sparkles, Trees, Info, Activity, Thermometer, Droplets, Wind } from "lucide-react";
import "leaflet/dist/leaflet.css";

export default function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  // Slider states
  const [canopyCoverage, setCanopyCoverage] = useState(50);
  const [concreteRatio, setConcreteRatio] = useState(30);

  // Result handling states
  const [analysis, setAnalysis] = useState<string>("");
  const [matches, setMatches] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Weather state for live meteorological telemetry
  const [weather, setWeather] = useState<{ temp: number; humidity: number; wind: number } | null>(null);

  // Fetch live weather data from Open-Meteo API
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

  // Fetch weather on initial mount with default coordinates
  useEffect(() => {
    // Default to New York City coordinates for initial display
    fetchLocalWeather(40.7128, -74.0060);
  }, []);

  // Trigger AI optimization
  const triggerOptimization = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canopyCoverage,
          concreteRatio,
          ...(location ? { lat: location.lat, lng: location.lng } : {}),
          // Include live weather telemetry in optimization payload
          ...(weather ? { weather } : {})
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Optimization error:", err);
        setAnalysis(`Error: ${err.error || "Unexpected error occurred during simulation."}`);
        setMatches([]);
      } else {
        const data = await response.json();
        setAnalysis(data.analysis ?? "");
        setMatches(data.matches ?? []);
      }
    } catch (e) {
      console.error(e);
      setAnalysis(`Operational Error: Unable to establish connection to the optimization backend.`);
      setMatches([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
      
      {/* Premium Expanded Sidebar Dashboard */}
      <aside className="w-96 bg-gray-900 border-r border-gray-800 flex flex-col h-full shadow-2xl z-10">
        
        {/* Header Block */}
        <div className="p-6 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Trees className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">EcoCompute</h1>
              <p className="text-xs text-gray-400">Urban Heat Island Optimizer</p>
            </div>
          </div>
        </div>

        {/* Configuration Sliders Panel */}
        <div className="p-6 border-b border-gray-800 space-y-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <Sliders className="w-3.5 h-3.5" />
            <span>Simulation Parameters</span>
          </div>

          {/* Live Climate Telemetry Dashboard */}
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            <div className="flex items-center gap-2">
              <Trees className="w-4 h-4 text-sky-400" />
              <span>Live Climate Telemetry</span>
            </div>
            {weather && (
              <>
                <div className="flex-1 space-x-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-red-400" />
                    <span className="flex-1">{weather.temp}°C</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-400" />
                    <span className="flex-1">{weather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-gray-300" />
                    <span className="flex-1">{weather.wind} km/h</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  ● Keyless Telemetry Stream Active
                </div>
              </>
            )}
          </div>

          {/* Canopy Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300 font-medium">Canopy Coverage</span>
              <span className="text-emerald-400 font-bold">{canopyCoverage}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={canopyCoverage}
              onChange={(e) => setCanopyCoverage(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 transition-all"
            />
          </div>

          {/* Concrete Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-300 font-medium">Concrete Ratio</span>
              <span className="text-orange-400 font-bold">{concreteRatio}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={concreteRatio}
              onChange={(e) => setConcreteRatio(Number(e.target.value))}
              className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500 transition-all"
            />
          </div>

          {/* Action Execution Button */}
          <button
            onClick={triggerOptimization}
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-medium text-sm rounded-xl shadow-lg shadow-emerald-900/20 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isLoading ? "Analyzing Metrics..." : "Run AI Optimization"}
          </button>
        </div>

        {/* Dynamic Analytics Feed Space */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Loading Animation Card */}
          {isLoading && (
            <div className="space-y-4 animate-pulse py-4">
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Activity className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Querying cloud vector matrix...</span>
              </div>
              <div className="h-32 bg-gray-800 rounded-xl"></div>
              <div className="h-20 bg-gray-800 rounded-xl"></div>
            </div>
          )}

          {/* Generated Plan Output Block */}
          {analysis && !isLoading && (
            <div className="space-y-2 fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Targeted Adaptation Plan</span>
              </div>
              <div className="bg-gray-800/40 border border-gray-800 p-4 rounded-xl text-sm text-gray-300 leading-relaxed font-mono whitespace-pre-wrap">
                {analysis}
              </div>
            </div>
          )}

          {/* Structured Semantic Document Results */}
          {matches.length > 0 && !isLoading && (
            <div className="space-y-3 fade-in">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <Trees className="w-3.5 h-3.5 text-teal-400" />
                <span>Optimized Forestry Matches</span>
              </div>
              <div className="space-y-3">
                {matches.map((m) => {
                  // Fallbacks to safely read fields whether flat or nested inside metadata
                  const name = m.metadata?.name || m.name || m.id.replace('tree-', '').toUpperCase();
                  const drought = m.metadata?.droughtResistance || m.droughtResistance || 'Medium';
                  const cooling = m.metadata?.coolingEfficiency || m.coolingEfficiency || '8';
                  
                  return (
                    <div 
                      key={m.id} 
                      className="p-4 bg-gray-800/30 border border-gray-800/80 rounded-xl hover:border-gray-700/60 transition-colors space-y-2"
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-semibold text-white tracking-wide">{name}</h4>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          drought === 'High' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {drought} Water Res
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        {m.text}
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                        <span>Cooling Index: <strong className="text-emerald-400">{cooling}/10</strong></span>
                        <span>ID: <code className="text-gray-400">{m.id}</code></span>
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
      <div className="flex-1 flex">
        <div className="w-1/2 h-full">
          <MapPicker
            onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
            onZoneClick={(canopy, concrete) => {
              setCanopyCoverage(canopy);
              setConcreteRatio(concrete);
            }}
          />
        </div>
        <div className="w-1/2 h-full">
          <HeatMap3D canopyCoverage={canopyCoverage} concreteRatio={concreteRatio} />
        </div>
      </div>
    </div>
  );
}