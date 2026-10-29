// Generates assets/lottie/walker.json — a small round character walking in place.
// The app moves it across the screen; this file only animates the body, feet,
// sprout and blinking. Run: node scripts/make-walker-lottie.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const FPS = 30;
const STEP = 12; // frames per step
const OP = STEP * 4; // loop length (4 steps, one blink)

const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, a];
};
const COLORS = {
  body: hex('#FF7A35'),
  belly: hex('#FFC43D'),
  ink: hex('#2E2A27'),
  cheek: hex('#FF8FA8'),
  leaf: hex('#35B987'),
};

const ease = { i: { x: [0.45], y: [1] }, o: { x: [0.55], y: [0] } };
const st = (k) => ({ a: 0, k });
/** Animated property from [frame, value] pairs. */
const anim = (pairs) => ({
  a: 1,
  k: pairs.map(([t, s], idx) => (idx === pairs.length - 1 ? { t, s } : { t, s, ...ease })),
});
const repeat = (cycle, period, total) => {
  const out = [];
  for (let base = 0; base < total; base += period) {
    for (const [t, v] of cycle) if (base + t < total || base + t === total) out.push([base + t, v]);
  }
  // de-duplicate frames at cycle joins
  return out.filter((p, i) => i === 0 || p[0] !== out[i - 1][0]);
};

const groupTransform = (p = [0, 0], r = 0) => ({
  ty: 'tr',
  p: st(p),
  a: st([0, 0]),
  s: st([100, 100]),
  r: st(r),
  o: st(100),
  sk: st(0),
  sa: st(0),
});
const ellipse = (name, p, size, color, opacity = 100) => ({
  ty: 'gr',
  nm: name,
  it: [
    { ty: 'el', p: st(p), s: st(size) },
    { ty: 'fl', c: st(color), o: st(opacity), r: 1 },
    groupTransform(),
  ],
});
const stroke = (name, v, i, o, color, width) => ({
  ty: 'gr',
  nm: name,
  it: [
    { ty: 'sh', ks: st({ i, o, v, c: false }) },
    { ty: 'st', c: st(color), o: st(100), w: st(width), lc: 2, lj: 2 },
    groupTransform(),
  ],
});
const layer = (ind, nm, ks, shapes, parent) => ({
  ddd: 0,
  ind,
  ty: 4,
  nm,
  sr: 1,
  ...(parent ? { parent } : {}),
  ks: { o: st(100), r: st(0), p: st([0, 0, 0]), a: st([0, 0, 0]), s: st([100, 100, 100]), ...ks },
  ao: 0,
  shapes,
  ip: 0,
  op: OP,
  st: 0,
  bm: 0,
});

// Body bobs up mid-stride and squashes a little when a foot lands.
const bodyPos = anim(repeat([[0, [50, 82, 0]], [STEP / 2, [50, 79, 0]], [STEP, [50, 82, 0]]], STEP, OP));
const bodyScale = anim(
  repeat([[0, [104, 96, 100]], [STEP / 2, [98, 103, 100]], [STEP, [104, 96, 100]]], STEP, OP),
);

// Feet: the planted foot slides back, the other lifts and swings forward.
const footA = repeat(
  [[0, [40, 86]], [STEP / 2, [47, 82]], [STEP, [56, 86]], [STEP * 2, [40, 86]]],
  STEP * 2,
  OP,
);
const footB = repeat(
  [[0, [56, 86]], [STEP, [40, 86]], [STEP * 1.5, [47, 82]], [STEP * 2, [56, 86]]],
  STEP * 2,
  OP,
);
const foot = (name, pairs) => ({
  ty: 'gr',
  nm: name,
  it: [
    { ty: 'el', p: st([0, 0]), s: st([14, 8]) },
    { ty: 'fl', c: st(COLORS.ink), o: st(100), r: 1 },
    { ...groupTransform(), p: anim(pairs) },
  ],
});

const BODY = 1;
const layers = [
  // Eyes (blink once per loop)
  layer(
    2,
    'eyes',
    {
      p: st([0, -30, 0]),
      s: anim([
        [0, [100, 100, 100]],
        [34, [100, 100, 100]],
        [36, [100, 10, 100]],
        [39, [100, 100, 100]],
        [OP, [100, 100, 100]],
      ]),
    },
    [ellipse('eyeL', [-3, 0], [6, 8], COLORS.ink), ellipse('eyeR', [13, 0], [6, 8], COLORS.ink)],
    BODY,
  ),
  // Sprout on the head, swaying with each step
  layer(
    3,
    'sprout',
    {
      p: st([2, -50, 0]),
      r: anim(repeat([[0, [-14]], [STEP, [14]], [STEP * 2, [-14]]], STEP * 2, OP)),
    },
    [
      stroke('stem', [[0, 0], [0, -9]], [[0, 0], [0, 0]], [[0, 0], [0, 0]], COLORS.leaf, 3),
      {
        ty: 'gr',
        nm: 'leaf',
        it: [
          { ty: 'el', p: st([0, 0]), s: st([14, 8]) },
          { ty: 'fl', c: st(COLORS.leaf), o: st(100), r: 1 },
          groupTransform([6, -11], -30),
        ],
      },
    ],
    BODY,
  ),
  // Body with belly, cheeks and smile
  layer(
    BODY,
    'body',
    { p: bodyPos, s: bodyScale },
    [
      stroke('smile', [[0, -19], [10, -19]], [[0, 0], [-3, 4]], [[3, 4], [0, 0]], COLORS.ink, 2.6),
      ellipse('cheekL', [-10, -21], [8, 5], COLORS.cheek, 70),
      ellipse('cheekR', [20, -21], [8, 5], COLORS.cheek, 70),
      ellipse('belly', [3, -7], [28, 13], COLORS.belly, 55),
      ellipse('body', [0, -26], [58, 52], COLORS.body),
    ],
  ),
  // Feet (behind the body)
  layer(4, 'feet', {}, [foot('footA', footA), foot('footB', footB)]),
];

const json = { v: '5.7.4', fr: FPS, ip: 0, op: OP, w: 100, h: 100, nm: 'walker', ddd: 0, assets: [], layers };

mkdirSync(new URL('../assets/lottie/', import.meta.url), { recursive: true });
writeFileSync(new URL('../assets/lottie/walker.json', import.meta.url), JSON.stringify(json));
console.log(`walker.json: ${OP} frames @ ${FPS}fps, ${JSON.stringify(json).length} bytes`);
