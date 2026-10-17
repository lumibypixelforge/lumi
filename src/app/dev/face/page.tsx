'use client';

/**
 * /dev/face — LUMI Face & Mood Tuning Lab
 *
 * Internal review route (noindex, disabled in production)
 * Displays all 8 moods at three distinct sizes (Small, Medium, Large)
 * with real-time interactive sliders for parametric tuning.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  renderLumiFace,
  MOOD_PRESETS,
  type LumiMood,
  type EyeParams,
  type EyeAnimationState,
} from '@/components/3d/eye-engine';

const MOODS: LumiMood[] = [
  'neutral',
  'happy',
  'excited',
  'sleep',
  'angry',
  'upset',
  'sad',
  'love',
];

function FacePreviewCanvas({
  params,
  width,
  height,
  lookX = 0,
  lookY = 0,
  openness = 1.0,
  label,
}: {
  params: EyeParams;
  width: number;
  height: number;
  lookX?: number;
  lookY?: number;
  openness?: number;
  label?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const state: EyeAnimationState = {
      mood: 'neutral',
      params,
      lookX,
      lookY,
      openness,
      scale: 1.0,
      twinklePhase: 0.5,
      time: 1.0,
    };

    renderLumiFace(ctx, canvas.width, canvas.height, state);
  }, [params, lookX, lookY, openness]);

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="rounded-xl overflow-hidden border border-border shadow-xs bg-[#050505]"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          width={1536}
          height={1371}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      {label && <span className="text-[11px] font-mono text-muted">{label}</span>}
    </div>
  );
}

export default function FaceReviewPage() {
  const [selectedMood, setSelectedMood] = useState<LumiMood>('happy');
  const [activeParams, setActiveParams] = useState<EyeParams>(MOOD_PRESETS['happy']);
  const [openness, setOpenness] = useState(1.0);
  const [lookX, setLookX] = useState(0);
  const [lookY, setLookY] = useState(0);

  // Sync preset when mood button clicked
  const selectMood = (m: LumiMood) => {
    setSelectedMood(m);
    setActiveParams({ ...MOOD_PRESETS[m] });
  };

  const updateParam = (key: keyof EyeParams, val: number) => {
    setActiveParams((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <div className="min-h-screen bg-ground text-ink p-6 sm:p-10 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-border gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="badge badge-accent">INTERNAL LAB</span>
              <span className="text-xs font-mono text-muted">/dev/face</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-2 text-ink">
              LUMI Parametric Eye System
            </h1>
            <p className="text-sm text-muted mt-1">
              Test and tune the 8 expressive moods across 3 screen sizes with real-time parametric eyelids.
            </p>
          </div>

          <a
            href="/"
            className="btn btn-secondary btn-sm self-start sm:self-auto no-underline"
          >
            ← Back to Site
          </a>
        </div>

        {/* 1. All 8 Moods Gallery (At Medium Size) */}
        <div className="mb-12">
          <h2 className="text-sm font-mono uppercase text-muted tracking-wider mb-4">
            All 8 Moods Gallery (Medium Size)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {MOODS.map((m) => {
              const isSelected = m === selectedMood;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => selectMood(m)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-accent bg-accent-light/30 shadow-sm ring-2 ring-accent/20'
                      : 'border-border bg-surface hover:border-border-strong'
                  }`}
                >
                  <FacePreviewCanvas
                    params={MOOD_PRESETS[m]}
                    width={220}
                    height={196}
                    label=""
                  />
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold capitalize text-ink">{m}</span>
                    {isSelected && (
                      <span className="text-[10px] font-mono text-accent font-semibold">EDITING</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Interactive Tuning Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start bg-surface border border-border rounded-2xl p-6 sm:p-8">
          {/* Left Column: Live Previews at 3 Sizes */}
          <div className="lg:col-span-5 flex flex-col items-center gap-6">
            <h3 className="text-xs font-mono uppercase text-muted tracking-wider self-start">
              Live Preview: <span className="text-accent font-bold capitalize">{selectedMood}</span>
            </h3>

            {/* Large (400px) */}
            <FacePreviewCanvas
              params={activeParams}
              width={380}
              height={340}
              lookX={lookX}
              lookY={lookY}
              openness={openness}
              label="Large View (400px)"
            />

            <div className="flex items-center gap-6 mt-2">
              {/* Medium (200px) */}
              <FacePreviewCanvas
                params={activeParams}
                width={190}
                height={170}
                lookX={lookX}
                lookY={lookY}
                openness={openness}
                label="Medium (190px)"
              />

              {/* Small (110px) */}
              <FacePreviewCanvas
                params={activeParams}
                width={110}
                height={98}
                lookX={lookX}
                lookY={lookY}
                openness={openness}
                label="Small (110px)"
              />
            </div>
          </div>

          {/* Right Column: Parametric Sliders */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-semibold text-ink">Eyelid & Face Parameters</h3>
              <button
                type="button"
                onClick={() => setActiveParams({ ...MOOD_PRESETS[selectedMood] })}
                className="text-xs font-mono text-accent hover:underline cursor-pointer bg-transparent border-none p-0"
              >
                Reset to Preset
              </button>
            </div>

            {/* Openness & Gaze */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Openness (Blink)</span>
                  <span>{openness.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={openness}
                  onChange={(e) => setOpenness(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Look X</span>
                  <span>{lookX.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={lookX}
                  onChange={(e) => setLookX(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Look Y</span>
                  <span>{lookY.toFixed(2)}</span>
                </label>
                <input
                  type="range"
                  min="-1"
                  max="1"
                  step="0.05"
                  value={lookY}
                  onChange={(e) => setLookY(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>
            </div>

            {/* Top Lid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Top Lid Coverage</span>
                  <span>{(activeParams.topLidCoverage * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.9"
                  step="0.02"
                  value={activeParams.topLidCoverage}
                  onChange={(e) => updateParam('topLidCoverage', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Top Lid Angle</span>
                  <span>{activeParams.topLidAngle.toFixed(0)}°</span>
                </label>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  step="1"
                  value={activeParams.topLidAngle}
                  onChange={(e) => updateParam('topLidAngle', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>
            </div>

            {/* Bottom Lid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Bottom Lid (Happy Arch)</span>
                  <span>{(activeParams.bottomLidCoverage * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.02"
                  value={activeParams.bottomLidCoverage}
                  onChange={(e) => updateParam('bottomLidCoverage', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Bottom Lid Curve</span>
                  <span>{(activeParams.bottomLidCurve * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeParams.bottomLidCurve}
                  onChange={(e) => updateParam('bottomLidCurve', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>
            </div>

            {/* Expressions & Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/60">
              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Smile Strength</span>
                  <span>{(activeParams.smileStrength * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeParams.smileStrength}
                  onChange={(e) => updateParam('smileStrength', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Highlights (Twinkle)</span>
                  <span>{(activeParams.highlightStrength * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={activeParams.highlightStrength}
                  onChange={(e) => updateParam('highlightStrength', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Heart Eyes</span>
                  <span>{(activeParams.heartWeight * 100).toFixed(0)}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={activeParams.heartWeight}
                  onChange={(e) => updateParam('heartWeight', parseFloat(e.target.value))}
                  className="w-full mt-1 accent-accent"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-muted flex justify-between">
                  <span>Arch Eyes (◠ ◠)</span>
                  <span>{activeParams.isArchEye ? 'ON' : 'OFF'}</span>
                </label>
                <button
                  type="button"
                  onClick={() => updateParam('isArchEye', (!activeParams.isArchEye) as unknown as number)}
                  className={`mt-1 w-full py-1.5 px-2 rounded text-xs font-mono font-semibold cursor-pointer border ${
                    activeParams.isArchEye ? 'bg-accent text-white border-accent' : 'bg-surface text-ink border-border'
                  }`}
                >
                  {activeParams.isArchEye ? 'Arch Eye Enabled' : 'Standard Eye'}
                </button>
              </div>
            </div>

            {/* Generated JSON Output */}
            <div className="pt-4 border-t border-border">
              <span className="text-[11px] font-mono text-muted block mb-1">
                Active Parametric JSON:
              </span>
              <pre className="p-3 bg-ground border border-border rounded-lg text-[10px] font-mono text-muted overflow-x-auto">
                {JSON.stringify(activeParams, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
