/**
 * LUMI Expressive Eye Engine — Revision 3 (Refined)
 *
 * Implements:
 * - Iconic, large, luminous robot eyes: Happy arches (◠ ◠), Neutral pills, Excited twinkle,
 *   Sleep calm slits, Angry brows, Upset worried brows, Sad with tear, Love hearts.
 * - Canvas 2D at 1536 x 1371, kept strictly in central 70%.
 * - Two-pass rendering: soft glow pass (36px blur) + crisp pass on top.
 * - Radiant cyan palette (#E6FEFF core to #5FF3FF primary to #18C8E6 edge), pink for love.
 * - Static diagonal optical sheen in top-left corner (~6% opacity).
 * - Natural blink transitions when changing moods (Disney/Pixar style: eyes blink and open with new mood).
 * - Random blinks every 3-6s (10% double blinks), micro-saccades, and gentle breathing.
 */

export type LumiMood = 'neutral' | 'happy' | 'excited' | 'sleep' | 'angry' | 'upset' | 'sad' | 'love';

export interface EyeParams {
  width: number;           // Fraction of canvas width (e.g. 0.17)
  height: number;          // Fraction of canvas height (e.g. 0.26)
  cornerRadius: number;    // Radius fraction or px
  topLidCoverage: number;  // 0 to 1
  topLidAngle: number;     // In degrees
  bottomLidCoverage: number; // 0 to 1
  bottomLidCurve: number;  // 0 to 1
  highlightStrength: number; // 0 to 1 (twinkle dots)
  tearProgress: number;    // 0 to 1
  smileStrength: number;   // 0 (none) to 1 (wide smile)
  heartWeight: number;     // 0 (eyes) to 1 (hearts)
  brightness: number;      // 0 to 1
  isArchEye?: boolean;     // True for iconic happy upward arches ◠ ◠
  isSleepEye?: boolean;    // True for peaceful sleeping slits — —
}

export interface EyeAnimationState {
  mood: LumiMood;
  params: EyeParams;
  lookX: number;           // -1 to +1 (gaze horizontal)
  lookY: number;           // -1 to +1 (gaze vertical)
  openness: number;        // 0 (closed blink) to 1 (open)
  scale: number;           // Breathing & pulse scale multiplier (e.g. 1.0 to 1.05)
  twinklePhase: number;    // For excited highlights
  time: number;
}

// ─── Default Parameters per Mood ─────────────────────────────────────

export const MOOD_PRESETS: Record<LumiMood, EyeParams> = {
  happy: {
    width: 0.175,
    height: 0.23,
    cornerRadius: 0.5,
    topLidCoverage: 0.0,
    topLidAngle: 0.0,
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.0,
    smileStrength: 0.75,     // Cheerful gentle smile
    heartWeight: 0.0,
    brightness: 1.0,
    isArchEye: true,         // Iconic thick upward glowing arches ◠ ◠
    isSleepEye: false,
  },
  neutral: {
    width: 0.165,
    height: 0.26,
    cornerRadius: 0.5,       // Full pill rounded rectangle
    topLidCoverage: 0.0,
    topLidAngle: 0.0,
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.0,
    smileStrength: 0.0,
    heartWeight: 0.0,
    brightness: 1.0,
    isArchEye: false,
    isSleepEye: false,
  },
  excited: {
    width: 0.19,             // 15% larger eyes
    height: 0.29,
    cornerRadius: 0.5,
    topLidCoverage: 0.0,
    topLidAngle: 0.0,
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 1.0,  // Two white twinkling star dots
    tearProgress: 0.0,
    smileStrength: 1.0,      // Wide cheerful smile
    heartWeight: 0.0,
    brightness: 1.0,
    isArchEye: false,
    isSleepEye: false,
  },
  sleep: {
    width: 0.17,
    height: 0.24,
    cornerRadius: 0.5,
    topLidCoverage: 0.0,
    topLidAngle: 0.0,
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.0,
    smileStrength: 0.0,
    heartWeight: 0.0,
    brightness: 0.65,        // Dimmer calm glow
    isArchEye: false,
    isSleepEye: true,        // Clean, peaceful horizontal sleep eyes
  },
  angry: {
    width: 0.165,
    height: 0.25,
    cornerRadius: 0.40,
    topLidCoverage: 0.38,
    topLidAngle: 24.0,       // POSITIVE: Slanted down toward nose (\ /) - fierce, focused angry brow
    bottomLidCoverage: 0.14, // Tensed lower eyelid cut
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.0,
    smileStrength: -0.30,    // Stern grimace/tight mouth
    heartWeight: 0.0,
    brightness: 1.0,
    isArchEye: false,
    isSleepEye: false,
  },
  upset: {
    width: 0.155,            // Slightly smaller worried eyes
    height: 0.24,
    cornerRadius: 0.45,
    topLidCoverage: 0.28,
    topLidAngle: -16.0,      // NEGATIVE: Slanted up toward nose (/ \) - worried, distressed brow
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.0,
    smileStrength: -0.22,    // Small worried mouth
    heartWeight: 0.0,
    brightness: 0.95,
    isArchEye: false,
    isSleepEye: false,
  },
  sad: {
    width: 0.150,            // Smaller drooping sorrowful eyes
    height: 0.23,
    cornerRadius: 0.45,
    topLidCoverage: 0.34,
    topLidAngle: -22.0,      // NEGATIVE: Deep drooping outer slope (/ \) - heartbroken, sad brow
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.0,
    tearProgress: 0.85,      // Flowing luminous cyan teardrop
    smileStrength: -0.55,    // Sad downturned frown mouth
    heartWeight: 0.0,
    brightness: 0.85,        // Melancholic glow
    isArchEye: false,
    isSleepEye: false,
  },
  love: {
    width: 0.17,
    height: 0.26,
    cornerRadius: 0.5,
    topLidCoverage: 0.0,
    topLidAngle: 0.0,
    bottomLidCoverage: 0.0,
    bottomLidCurve: 0.0,
    highlightStrength: 0.2,
    tearProgress: 0.0,
    smileStrength: 0.85,
    heartWeight: 1.0,        // Full bezier hearts
    brightness: 1.0,
    isArchEye: false,
  },
};

// ─── Interpolate Eye Parameters ──────────────────────────────────────

export function interpolateEyeParams(a: EyeParams, b: EyeParams, t: number): EyeParams {
  const u = Math.min(Math.max(t, 0), 1);
  return {
    width: a.width + (b.width - a.width) * u,
    height: a.height + (b.height - a.height) * u,
    cornerRadius: a.cornerRadius + (b.cornerRadius - a.cornerRadius) * u,
    topLidCoverage: a.topLidCoverage + (b.topLidCoverage - a.topLidCoverage) * u,
    topLidAngle: a.topLidAngle + (b.topLidAngle - a.topLidAngle) * u,
    bottomLidCoverage: a.bottomLidCoverage + (b.bottomLidCoverage - a.bottomLidCoverage) * u,
    bottomLidCurve: a.bottomLidCurve + (b.bottomLidCurve - a.bottomLidCurve) * u,
    highlightStrength: a.highlightStrength + (b.highlightStrength - a.highlightStrength) * u,
    tearProgress: a.tearProgress + (b.tearProgress - a.tearProgress) * u,
    smileStrength: a.smileStrength + (b.smileStrength - a.smileStrength) * u,
    heartWeight: a.heartWeight + (b.heartWeight - a.heartWeight) * u,
    brightness: a.brightness + (b.brightness - a.brightness) * u,
    isArchEye: u > 0.5 ? b.isArchEye : a.isArchEye,
    isSleepEye: u > 0.5 ? b.isSleepEye : a.isSleepEye,
  };
}

// ─── Draw Happy Arch Eye (◠) ──────────────────────────────────────────

function drawHappyArchEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  openness: number,
  isGlowPass: boolean,
  brightness = 1.0
) {
  const spanX = w * 0.44;
  const archHeight = w * 0.46;
  const baselineY = cy + archHeight * 0.22;
  const strokeW = Math.max(16, 36 * Math.min(openness * 1.2 + 0.1, 1.0));
  const apexRise = archHeight * 1.25 * Math.max(openness, 0.05);

  ctx.save();

  const alpha = (isGlowPass ? 0.92 : 1.0) * brightness;
  ctx.strokeStyle = `rgba(95, 243, 255, ${alpha})`;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isGlowPass) {
    ctx.shadowColor = 'rgba(95, 243, 255, 0.95)';
    ctx.shadowBlur = 36;
  }

  // Smooth upward cubic bezier arch
  ctx.beginPath();
  ctx.moveTo(cx - spanX, baselineY);
  ctx.bezierCurveTo(
    cx - spanX * 0.52,
    baselineY - apexRise,
    cx + spanX * 0.52,
    baselineY - apexRise,
    cx + spanX,
    baselineY
  );
  ctx.stroke();

  // Intense crisp white-cyan core line on crisp pass
  if (!isGlowPass && openness > 0.25) {
    ctx.save();
    ctx.strokeStyle = `rgba(235, 254, 255, ${0.98 * brightness})`;
    ctx.lineWidth = Math.max(8, strokeW * 0.42);
    ctx.shadowColor = 'rgba(235, 254, 255, 0.85)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx - spanX, baselineY);
    ctx.bezierCurveTo(
      cx - spanX * 0.52,
      baselineY - apexRise,
      cx + spanX * 0.52,
      baselineY - apexRise,
      cx + spanX,
      baselineY
    );
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Draw Sleep Eye (— —) ────────────────────────────────────────────

function drawSleepEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  openness: number,
  isGlowPass: boolean,
  brightness = 0.65
) {
  const spanX = w * 0.44;
  const strokeW = Math.max(14, 26 * Math.min(openness * 1.2 + 0.1, 1.0));
  const dipY = 3.5; // gentle, peaceful resting curve

  ctx.save();
  const alpha = (isGlowPass ? 0.85 : 1.0) * brightness;
  ctx.strokeStyle = `rgba(95, 243, 255, ${alpha})`;
  ctx.lineWidth = strokeW;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isGlowPass) {
    ctx.shadowColor = 'rgba(95, 243, 255, 0.9)';
    ctx.shadowBlur = 28;
  }

  ctx.beginPath();
  ctx.moveTo(cx - spanX, cy);
  ctx.quadraticCurveTo(cx, cy + dipY, cx + spanX, cy);
  ctx.stroke();

  // Crisp glowing core line
  if (!isGlowPass) {
    ctx.save();
    ctx.strokeStyle = `rgba(230, 254, 255, ${0.95 * brightness})`;
    ctx.lineWidth = Math.max(6, strokeW * 0.42);
    ctx.shadowColor = 'rgba(230, 254, 255, 0.85)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Draw Parametric Rounded Eye ─────────────────────────────────────

function drawSingleEye(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  isRightEye: boolean,
  params: EyeParams,
  openness: number,
  isGlowPass: boolean
) {
  const rad = Math.min(w, h) * params.cornerRadius;
  const effectiveH = Math.max(h * openness, 4);
  const eyeCenterY = cy;

  ctx.save();

  // 1. Radiant Gradient Fill (#E6FEFF center to #5FF3FF to #28CDE6)
  const grad = ctx.createRadialGradient(
    cx,
    eyeCenterY,
    w * 0.08,
    cx,
    eyeCenterY,
    w * 0.72
  );

  const alpha = (isGlowPass ? 0.92 : 1.0) * params.brightness;
  grad.addColorStop(0.0, `rgba(230, 254, 255, ${alpha})`);   // #E6FEFF bright core
  grad.addColorStop(0.55, `rgba(95, 243, 255, ${alpha})`);   // #5FF3FF primary
  grad.addColorStop(1.0, `rgba(40, 205, 230, ${alpha * 0.95})`);

  ctx.fillStyle = grad;
  if (isGlowPass) {
    ctx.shadowColor = 'rgba(95, 243, 255, 0.95)';
    ctx.shadowBlur = 36;
  }

  // 2. Base eye path (Rounded Rectangle filled directly so shadow glows outward)
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(cx - w / 2, eyeCenterY - effectiveH / 2, w, effectiveH, rad);
  } else {
    const x0 = cx - w / 2;
    const y0 = eyeCenterY - effectiveH / 2;
    ctx.moveTo(x0 + rad, y0);
    ctx.arcTo(x0 + w, y0, x0 + w, y0 + effectiveH, rad);
    ctx.arcTo(x0 + w, y0 + effectiveH, x0, y0 + effectiveH, rad);
    ctx.arcTo(x0, y0 + effectiveH, x0, y0, rad);
    ctx.arcTo(x0, y0, x0 + w, y0, rad);
    ctx.closePath();
  }
  ctx.fill();

  // 3. Eyelids using solid background erasing (no shadow)
  const bgFill = '#050505';

  // Top Lid (Angled for Angry/Upset/Sad, or deep for Sleep)
  if (params.topLidCoverage > 0.01) {
    const lidHeight = effectiveH * params.topLidCoverage;
    const angleRad = ((isRightEye ? -params.topLidAngle : params.topLidAngle) * Math.PI) / 180;
    const lidY = eyeCenterY - effectiveH / 2 + lidHeight;

    ctx.save();
    ctx.fillStyle = bgFill;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    const xLeft = cx - w * 0.8;
    const xRight = cx + w * 0.8;
    const yLeft = lidY - Math.tan(angleRad) * (w * 0.8);
    const yRight = lidY + Math.tan(angleRad) * (w * 0.8);

    ctx.moveTo(xLeft, eyeCenterY - effectiveH * 1.2);
    ctx.lineTo(xRight, eyeCenterY - effectiveH * 1.2);
    ctx.lineTo(xRight, yRight);
    ctx.lineTo(xLeft, yLeft);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Bottom Lid (Tensed for Angry or squinting)
  if (params.bottomLidCoverage > 0.01) {
    const botHeight = effectiveH * params.bottomLidCoverage;
    const botY = eyeCenterY + effectiveH / 2 - botHeight;

    ctx.save();
    ctx.fillStyle = bgFill;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.rect(cx - w * 0.9, botY, w * 1.8, effectiveH * 0.8);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

// ─── Draw Single Bezier Heart ────────────────────────────────────────

function drawSingleHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  isGlowPass: boolean,
  alpha = 1.0
) {
  ctx.save();
  ctx.beginPath();
  const topCurveHeight = size * 0.32;
  ctx.moveTo(cx, cy + size * 0.35);
  ctx.bezierCurveTo(cx, cy + topCurveHeight * 0.3, cx - size * 0.52, cy - topCurveHeight * 0.85, cx - size * 0.52, cy - topCurveHeight * 0.2);
  ctx.bezierCurveTo(cx - size * 0.52, cy + topCurveHeight * 0.6, cx, cy + size * 0.8, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size * 0.8, cx + size * 0.52, cy + topCurveHeight * 0.6, cx + size * 0.52, cy - topCurveHeight * 0.2);
  ctx.bezierCurveTo(cx + size * 0.52, cy - topCurveHeight * 0.85, cx, cy + topCurveHeight * 0.3, cx, cy + size * 0.35);
  ctx.closePath();

  const heartGrad = ctx.createRadialGradient(cx, cy + size * 0.2, size * 0.08, cx, cy + size * 0.3, size * 0.65);
  const passAlpha = (isGlowPass ? 0.9 : 1.0) * alpha;
  heartGrad.addColorStop(0.0, `rgba(255, 235, 242, ${passAlpha})`); // #FFEBF2
  heartGrad.addColorStop(0.55, `rgba(255, 140, 185, ${passAlpha})`);
  heartGrad.addColorStop(1.0, `rgba(255, 95, 150, ${passAlpha * 0.95})`); // #FF5F96

  ctx.fillStyle = heartGrad;
  ctx.fill();
  ctx.restore();
}

// ─── Main Render Function ────────────────────────────────────────────

export function renderLumiFace(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  state: EyeAnimationState
) {
  const { params, lookX, lookY, openness, scale, twinklePhase, time } = state;

  ctx.save();

  // 1. Deep solid black OLED screen background
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, width, height);

  // 2. Static optical diagonal sheen highlight in top-left corner (~6% opacity)
  const sheen = ctx.createLinearGradient(0, 0, width * 0.45, height * 0.45);
  sheen.addColorStop(0.0, 'rgba(255, 255, 255, 0.06)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
  sheen.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, width, height);

  // 3. Central 70% Layout & Gaze Offsets
  const centerX = width * 0.5;
  const centerY = height * 0.45; // Centered on screen glass

  // Gaze offsets (eyes lead head slightly)
  const glanceOffsetX = lookX * 52;
  const glanceOffsetY = lookY * 32;

  // 44% center-to-center eye spacing
  const eyeSpacing = width * 0.22;
  const leftEyeX = centerX - eyeSpacing + glanceOffsetX;
  const rightEyeX = centerX + eyeSpacing + glanceOffsetX;
  const eyeCenterY = centerY + glanceOffsetY;

  // Eye Dimensions (Prominent, large, readable at yaw)
  const eyeW = width * params.width * scale;
  const eyeH = height * params.height * scale;

  // When blinking near zero, draw sleek horizontal shut-eye line with soft glow
  if (openness < 0.12 && params.heartWeight < 0.5) {
    const shutLineWidth = eyeW * 0.88;
    ctx.strokeStyle = '#5FF3FF';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(95, 243, 255, 0.9)';
    ctx.shadowBlur = 28;

    ctx.beginPath();
    ctx.moveTo(leftEyeX - shutLineWidth / 2, eyeCenterY);
    ctx.lineTo(leftEyeX + shutLineWidth / 2, eyeCenterY);
    ctx.moveTo(rightEyeX - shutLineWidth / 2, eyeCenterY);
    ctx.lineTo(rightEyeX + shutLineWidth / 2, eyeCenterY);
    ctx.stroke();

    ctx.restore();
    return;
  }

  // Two-pass rendering:
  // Pass 1: Soft rich neon glow pass (36px blur)
  // Pass 2: Crisp razor-sharp pass
  const passes = [
    { isGlow: true, blur: 36 },
    { isGlow: false, blur: 0 },
  ];

  for (const pass of passes) {
    ctx.save();
    if (pass.isGlow) {
      const isLove = params.heartWeight > 0.5;
      ctx.shadowColor = isLove ? 'rgba(255, 115, 165, 0.95)' : 'rgba(95, 243, 255, 0.95)';
      ctx.shadowBlur = pass.blur;
    }

    // A. Happy Arch Eyes (◠ ◠)
    if (params.isArchEye && params.heartWeight < 0.5) {
      drawHappyArchEye(ctx, leftEyeX, eyeCenterY, eyeW, eyeH, openness, pass.isGlow, params.brightness);
      drawHappyArchEye(ctx, rightEyeX, eyeCenterY, eyeW, eyeH, openness, pass.isGlow, params.brightness);
    }
    // B. Sleep Eyes (peaceful calm slits — —)
    else if (params.isSleepEye && params.heartWeight < 0.5) {
      drawSleepEye(ctx, leftEyeX, eyeCenterY, eyeW, eyeH, openness, pass.isGlow, params.brightness);
      drawSleepEye(ctx, rightEyeX, eyeCenterY, eyeW, eyeH, openness, pass.isGlow, params.brightness);
    }
    // C. Parametric Rounded Eyes (Neutral, Excited, Angry, Upset, Sad)
    else if (params.heartWeight < 0.98) {
      const eyeAlpha = 1.0 - params.heartWeight;
      ctx.globalAlpha = eyeAlpha;
      drawSingleEye(ctx, leftEyeX, eyeCenterY, eyeW, eyeH, false, params, openness, pass.isGlow);
      drawSingleEye(ctx, rightEyeX, eyeCenterY, eyeW, eyeH, true, params, openness, pass.isGlow);
    }

    // C. Love Hearts (crossfading)
    if (params.heartWeight > 0.02) {
      const heartSize = eyeW * 1.15;
      const heartY = eyeCenterY - heartSize * 0.42;
      ctx.globalAlpha = params.heartWeight;
      drawSingleHeart(ctx, leftEyeX, heartY, heartSize, pass.isGlow, params.heartWeight);
      drawSingleHeart(ctx, rightEyeX, heartY, heartSize, pass.isGlow, params.heartWeight);
    }

    ctx.restore();
  }

  // 4. White Twinkle Highlights for Excited Look
  if (params.highlightStrength > 0.05 && openness > 0.5) {
    const twinkle = 1.0 + Math.sin(twinklePhase * 6.28) * 0.22;
    const dotAlpha = params.highlightStrength;
    ctx.save();
    ctx.fillStyle = `rgba(255, 255, 255, ${dotAlpha})`;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
    ctx.shadowBlur = 14;

    [leftEyeX, rightEyeX].forEach((ex) => {
      // Primary star highlight (top-right)
      ctx.beginPath();
      ctx.arc(ex + eyeW * 0.16, eyeCenterY - eyeH * 0.18, 12 * twinkle, 0, Math.PI * 2);
      ctx.fill();

      // Secondary star highlight (lower-left)
      ctx.beginPath();
      ctx.arc(ex - eyeW * 0.18, eyeCenterY + eyeH * 0.15, 7.5 * twinkle, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // 5. Tear for Sad Look (Smooth flowing tear down the cheek)
  if (params.tearProgress > 0.02 && openness > 0.3) {
    const tearCycle = (time % 3.0) / 3.0; // 3.0s smooth cycle
    const startY = eyeCenterY + eyeH * 0.35;
    const tearDropY = startY + tearCycle * 85;
    const tearAlpha = Math.sin(tearCycle * Math.PI) * params.tearProgress * 0.95;

    if (tearAlpha > 0.05) {
      ctx.save();
      const tearX = rightEyeX + eyeW * 0.34;
      ctx.fillStyle = `rgba(180, 245, 255, ${tearAlpha})`;
      ctx.shadowColor = 'rgba(95, 243, 255, 0.95)';
      ctx.shadowBlur = 18;

      // Organic teardrop shape
      ctx.beginPath();
      ctx.moveTo(tearX, tearDropY - 12);
      ctx.bezierCurveTo(tearX - 7, tearDropY - 2, tearX - 7, tearDropY + 7, tearX, tearDropY + 7);
      ctx.bezierCurveTo(tearX + 7, tearDropY + 7, tearX + 7, tearDropY - 2, tearX, tearDropY - 12);
      ctx.closePath();
      ctx.fill();

      // Tiny crisp core
      ctx.fillStyle = `rgba(255, 255, 255, ${tearAlpha * 0.9})`;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(tearX, tearDropY + 2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // 6. Mouth: Smile (Happy, Excited, Love) or Frown/Grimace (Angry, Upset, Sad)
  if (Math.abs(params.smileStrength) > 0.05 && openness > 0.25) {
    const isLove = params.heartWeight > 0.5;
    const smileColor = isLove ? '#FF7AA8' : '#5FF3FF';
    const mouthCenterY = eyeCenterY + eyeH * 0.68;
    const absStrength = Math.abs(params.smileStrength);
    const mouthW = (95 + absStrength * 65) * scale;
    const mx = centerX + glanceOffsetX * 0.5;

    ctx.save();
    ctx.strokeStyle = smileColor;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.shadowColor = isLove ? 'rgba(255, 122, 168, 0.9)' : 'rgba(95, 243, 255, 0.9)';
    ctx.shadowBlur = 22;

    ctx.beginPath();
    if (params.smileStrength > 0) {
      // Cheerful upward smile (ends at mouthCenterY, center dips down)
      const mouthCurve = (22 + absStrength * 38) * scale;
      ctx.moveTo(mx - mouthW / 2, mouthCenterY);
      ctx.quadraticCurveTo(mx, mouthCenterY + mouthCurve, mx + mouthW / 2, mouthCenterY);
    } else {
      // Expressive downturned frown (center arches up, ends droop down)
      const frownDepth = (12 + absStrength * 22) * scale;
      ctx.moveTo(mx - mouthW / 2, mouthCenterY + frownDepth * 0.5);
      ctx.quadraticCurveTo(mx, mouthCenterY - frownDepth * 0.5, mx + mouthW / 2, mouthCenterY + frownDepth * 0.5);
    }
    ctx.stroke();

    // Crisp inner core line
    ctx.strokeStyle = isLove ? '#FFE3EC' : '#E6FEFF';
    ctx.lineWidth = 7;
    ctx.shadowBlur = 6;
    ctx.stroke();

    ctx.restore();
  }

  ctx.restore();
}
