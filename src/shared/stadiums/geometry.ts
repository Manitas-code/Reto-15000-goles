import type { Point, StadiumSpec, StandSpec } from './teams';

type Layer = {
  d: string;
  fill: string;
  stroke: string;
  sw: number;
  dash: string;
  off: number | string;
  op: number;
};
type Glow = { x: string; y: string; r: number };

function buildLayers(S: StadiumSpec): {
  layers: Layer[];
  glows: Glow[];
  bg: string;
} {
  const L: Layer[] = [],
    G: Glow[] = [];
  function add(o: Partial<Layer> & Pick<Layer, 'd'>) {
    L.push({
      d: o.d,
      fill: o.fill || 'none',
      stroke: o.stroke || 'none',
      sw: o.sw || 0,
      dash: o.dash || 'none',
      off: o.off || 0,
      op: o.op == null ? 1 : o.op,
    });
  }
  function f(n: number): string {
    return Math.max(-5000, Math.min(5000, n)).toFixed(1);
  }

  const stands: Array<[string, StandSpec]> = S.open
    ? [
        ['far', S.far!],
        ['left', S.side!],
        ['right', S.sideR || S.side!],
      ]
    : [['ring', S as StandSpec]];
  if (S.extraF) stands.unshift(['far', S.extraF]);
  if (S.extraR) stands.push(['right', S.extraR]);
  if (S.extraL) stands.push(['left', S.extraL]);
  function Hd(c: StandSpec, d: number): number {
    return 1.5 + (d - 3) * c.slope;
  }
  function Htop(c: StandSpec): number {
    return Hd(c, c.maxD);
  }
  const HT = Math.max.apply(
      null,
      stands.map(function (s) {
        return Htop(s[1]);
      }),
    ),
    Hc = HT * 0.8;
  function pr(X: number, Lg: number, H: number): Point {
    const z = 1 + Lg / 30.9;
    return [195 + (X * 7.6) / z, 205 + ((1 - H / Hc) * 440) / z];
  }
  function line(pts: Point[]): string {
    return (
      'M' +
      pts
        .map(function (q) {
          return f(q[0]) + ' ' + f(q[1]);
        })
        .join(' L')
    );
  }
  function poly(pts: Point[]): string {
    return line(pts) + ' Z';
  }
  const LMIN = -26;
  function segs(kind: string, d: number, H: number, amp = 0): Point[][] {
    const w = 34 + d,
      far = 105 + d,
      pts: Point[] = [];
    let l, x, a;
    function P(X: number, Lg: number): Point {
      const h = H + (amp ? amp * (Math.min(1, Math.abs(X) / w) * 2 - 1) : 0);
      return pr(X, Lg, h);
    }
    if (kind === 'left' || kind === 'sideL') {
      for (l = 0; l <= 26; l++) pts.push(P(-w, LMIN + (130 * l) / 26));
      return [pts];
    }
    if (kind === 'cornL') {
      pts.push(P(-w, 104));
      pts.push(P(-w, 104.5 + d / 2));
      pts.push(P(-w, 105 + d));
      return [pts];
    }
    if (kind === 'cornR') {
      pts.push(P(w, 105 + d));
      pts.push(P(w, 104.5 + d / 2));
      pts.push(P(w, 104));
      return [pts];
    }
    if (kind === 'right' || kind === 'sideR') {
      for (l = 26; l >= 0; l--) pts.push(P(w, LMIN + (130 * l) / 26));
      return [pts];
    }
    if (kind === 'far') {
      const fw = S.open && !S.closed ? 40 : w;
      for (x = 0; x <= 14; x++) pts.push(P(-fw + (2 * fw * x) / 14, far));
      return [pts];
    }
    if (S.noFar) {
      const lft = [],
        rgt = [];
      for (l = 0; l <= 26; l++) lft.push(P(-w, LMIN + (133 * l) / 26));
      for (l = 0; l <= 26; l++) rgt.push(P(w, LMIN + (133 * l) / 26));
      return [lft, rgt];
    }
    const R = S.oval ? Math.min(S.oval + d * 0.5, w - 1) : 0;
    let i2;
    for (i2 = 0; i2 < 14; i2++)
      pts.push(P(-w, LMIN + ((far - R - LMIN) * i2) / 14));
    for (a = 0; a <= 6; a += S.chamfer ? 6 : 1) {
      const t = Math.PI - ((a / 6) * Math.PI) / 2;
      pts.push(P(-w + R + R * Math.cos(t), far - R + R * Math.sin(t)));
    }
    for (i2 = 1; i2 < 14; i2++)
      pts.push(P(-w + R + ((2 * w - 2 * R) * i2) / 14, far));
    for (a = 0; a <= 6; a += S.chamfer ? 6 : 1) {
      const t2 = Math.PI / 2 - ((a / 6) * Math.PI) / 2;
      pts.push(P(w - R + R * Math.cos(t2), far - R + R * Math.sin(t2)));
    }
    for (i2 = 1; i2 <= 14; i2++)
      pts.push(P(w, far - R - ((far - R - LMIN) * i2) / 14));
    return [pts];
  }
  function band(
    kind: string,
    d1: number,
    H1: number,
    d2: number,
    H2: number,
    amp2 = 0,
  ): string {
    const A = segs(kind, d1, H1),
      B = segs(kind, d2, H2, amp2);
    return A.map(function (s, i) {
      return poly(s.concat(B[i].slice().reverse()));
    }).join(' ');
  }
  function ring(kind: string, d: number, H: number): string {
    return segs(kind, d, H).map(line).join(' ');
  }

  const bg = S.roof === 'lattice' ? '#c9ccd3' : '#0a1328';

  // Suelo exterior (se ve por las esquinas abiertas)
  add({
    d: poly([
      pr(-140, LMIN, 0),
      pr(-140, 300, 0),
      pr(140, 300, 0),
      pr(140, LMIN, 0),
    ]),
    fill: '#10201a',
  });
  // ---- Fondos del horizonte (MLS): montañas, rascacielos y monumentos ----
  function rnd(i: number): number {
    const x = Math.sin(i * 12.9898 + (S.seed || 1) * 78.233) * 43758.5453;
    return x - Math.floor(x);
  }
  if (S.mountains) {
    const MO = S.mountains,
      rs = S.seed || 3;
    (
      [
        [440, MO.far || '#34445f', 3.0, 0],
        [365, MO.near || '#1b2639', 1.9, 1],
      ] as Array<[number, string, number, number]>
    ).forEach(function (r, ri) {
      const mh = HT * r[2] * (MO.h || 1),
        peaks = [];
      for (let pk = 0; pk < 8; pk++)
        peaks.push([
          -440 + pk * 125 + (rnd(pk * 3 + ri * 17 + rs) - 0.5) * 80,
          0.5 + 0.5 * rnd(pk * 5 + ri * 11 + rs),
          95 + 70 * rnd(pk * 7 + ri * 13 + rs),
        ]);
      const top = [];
      for (let mx = -480; mx <= 480; mx += 5) {
        let hv = 0.16;
        peaks.forEach(function (q) {
          const dx = Math.abs(mx - q[0]) / q[2];
          const v = dx < 1 ? q[1] * Math.pow(1 - dx, 1.35) : 0;
          hv = Math.max(hv, v);
        });
        hv += 0.03 * Math.sin(mx * 0.21 + ri) + 0.02 * Math.sin(mx * 0.53);
        top.push([mx, mh * hv]);
      }
      const base = [pr(-480, r[0], 0)];
      add({
        d: poly(
          base
            .concat(
              top.map(function (p) {
                return pr(p[0], r[0], p[1]);
              }),
            )
            .concat([pr(480, r[0], 0)]),
        ),
        fill: r[1],
      });
      // cara en sombra de cada pico (volumen)
      peaks.forEach(function (q) {
        add({
          d: poly([
            pr(q[0], r[0], mh * q[1] * 0.98),
            pr(q[0] + q[2] * 0.9, r[0], mh * 0.16),
            pr(q[0] + q[2] * 0.2, r[0], mh * 0.16),
          ]),
          fill: '#000000',
          op: 0.16,
        });
      });
      if (MO.snow !== false && !ri)
        peaks.forEach(function (q) {
          if (q[1] < 0.6) return;
          const ph = mh * q[1],
            sw = q[2] * 0.26,
            sd2 = ph * 0.3;
          add({
            d: poly([
              pr(q[0], r[0], ph),
              pr(q[0] + sw, r[0], ph - sd2),
              pr(q[0] + sw * 0.55, r[0], ph - sd2 * 0.72),
              pr(q[0] + sw * 0.1, r[0], ph - sd2 * 1.05),
              pr(q[0] - sw * 0.35, r[0], ph - sd2 * 0.7),
              pr(q[0] - sw, r[0], ph - sd2),
            ]),
            fill: '#e8eef7',
            op: 0.92,
          });
        });
    });
  }
  if (S.skyline) {
    const K = S.skyline,
      KL = K.l || 300;
    let bx = K.x0 == null ? -170 : K.x0,
      bi2 = 0;
    while (bx < (K.x1 == null ? 170 : K.x1)) {
      const bw = 7 + rnd(bi2 * 3.1) * 13,
        tall = rnd(bi2 * 7.7) > 0.72,
        bh =
          HT *
          (K.h || 1) *
          (0.9 + Math.pow(rnd(bi2 * 1.9 + 2), 1.7) * (tall ? 3.4 : 1.9));
      const sh2 = ['#1a2336', '#202b42', '#18202f', '#252f47'][bi2 % 4];
      add({
        d: poly([
          pr(bx, KL, 0),
          pr(bx + bw, KL, 0),
          pr(bx + bw, KL, bh),
          pr(bx, KL, bh),
        ]),
        fill: sh2,
      });
      if (tall && rnd(bi2 * 5.3) > 0.5)
        add({
          d: poly([
            pr(bx + bw * 0.2, KL, bh),
            pr(bx + bw * 0.8, KL, bh),
            pr(bx + bw * 0.5, KL, bh + HT * 0.35),
          ]),
          fill: sh2,
        });
      for (let wy = HT * 0.35; wy < bh - HT * 0.2; wy += HT * 0.24)
        add({
          d: line([pr(bx + 1.2, KL, wy), pr(bx + bw - 1.2, KL, wy)]),
          stroke: '#ffd98a',
          sw: 1.3,
          dash: '0.1 3.4',
          off: ((bi2 * 1.7 + wy) % 3.4).toFixed(1),
          op: 0.55 + 0.35 * rnd(bi2 + wy),
        });
      if (tall) {
        const tp = pr(bx + bw / 2, KL, bh + HT * 0.5);
        add({
          d: line([pr(bx + bw / 2, KL, bh), tp]),
          stroke: '#8a93a3',
          sw: 1,
        });
        G.push({ x: f(tp[0]), y: f(tp[1]), r: 5 });
      }
      bx += bw + 1 + rnd(bi2 * 2.3) * 4;
      bi2++;
    }
  }
  // Palmeras (Miami, Los Ángeles, San Diego…)
  if (S.palms) {
    const PM = S.palms,
      pL = PM.l || 200;
    (PM.x || [-150, -118, -92, 96, 124, 158]).forEach(function (px, pi) {
      const ph = HT * (PM.h || 1.9) * (0.85 + 0.3 * rnd(pi * 4.1 + 2)),
        lean = (rnd(pi * 2.7) - 0.5) * 10,
        tr = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8;
        tr.push(pr(px + lean * t * t, pL, ph * t));
      }
      add({ d: line(tr), stroke: '#1d2a22', sw: 2.4 });
      const tp = [px + lean, ph];
      for (let fr = 0; fr < 9; fr++) {
        const dir = fr < 4.5 ? -1 : 1,
          spread = 0.35 + 0.65 * ((fr % 5) / 4),
          len = 10 + 8 * spread + 3 * rnd(fr + pi * 3),
          fp = [];
        for (let q = 0; q <= 8; q++) {
          const tt = q / 8;
          fp.push(
            pr(
              tp[0] + dir * len * tt,
              pL,
              tp[1] +
                HT * 0.07 * Math.sin(Math.PI * tt) -
                HT * (0.05 + 0.2 * spread) * tt * tt,
            ),
          );
        }
        add({ d: line(fp), stroke: '#15301f', sw: 2.2 });
      }
      add({
        d: line([
          pr(tp[0] - 1.2, pL, tp[1] - HT * 0.02),
          pr(tp[0] + 1.2, pL, tp[1] - HT * 0.02),
        ]),
        stroke: '#3a2e1f',
        sw: 2.4,
      });
    });
  }
  // Edificio detrás del fondo (bar de San José, Salón de la Fama en Dallas…)
  if (S.farBuilding) {
    const FB = S.farBuilding,
      fbS = S.open ? S.far! : (S as StandSpec),
      fbL = 105 + fbS.maxD! + (FB.gap || 8),
      fbH = HT * (FB.h || 0.9);
    add({
      d: poly([
        pr(FB.x0, fbL, 0),
        pr(FB.x1, fbL, 0),
        pr(FB.x1, fbL, fbH),
        pr(FB.x0, fbL, fbH),
      ]),
      fill: FB.col || '#2a303b',
    });
    if (FB.glass)
      add({
        d: poly([
          pr(FB.x0 + 2, fbL, fbH * 0.45),
          pr(FB.x1 - 2, fbL, fbH * 0.45),
          pr(FB.x1 - 2, fbL, fbH * 0.85),
          pr(FB.x0 + 2, fbL, fbH * 0.85),
        ]),
        fill: FB.glass,
        op: 0.85,
      });
    for (let fy = fbH * 0.2; fy < fbH * 0.95; fy += HT * 0.14)
      add({
        d: line([pr(FB.x0 + 2, fbL, fy), pr(FB.x1 - 2, fbL, fy)]),
        stroke: '#ffd98a',
        sw: 1.4,
        dash: '0.1 3.2',
        op: 0.75,
      });
    if (FB.roof)
      add({
        d: poly([
          pr(FB.x0 - 3, fbL, fbH),
          pr(FB.x1 + 3, fbL, fbH),
          pr(FB.x1 + 3, fbL, fbH + HT * 0.08),
          pr(FB.x0 - 3, fbL, fbH + HT * 0.08),
        ]),
        fill: FB.roof,
      });
    if (FB.sign) {
      const sg = pr((FB.x0 + FB.x1) / 2, fbL, fbH + HT * 0.2);
      add({
        d: poly([
          pr((FB.x0 + FB.x1) / 2 - 12, fbL - 0.5, fbH + HT * 0.1),
          pr((FB.x0 + FB.x1) / 2 + 12, fbL - 0.5, fbH + HT * 0.1),
          pr((FB.x0 + FB.x1) / 2 + 12, fbL - 0.5, fbH + HT * 0.32),
          pr((FB.x0 + FB.x1) / 2 - 12, fbL - 0.5, fbH + HT * 0.32),
        ]),
        fill: FB.sign,
      });
      G.push({ x: f(sg[0]), y: f(sg[1]), r: 16 });
    }
  }
  if (S.landmark === 'cn') {
    const cX = 95,
      cL = 290,
      cH = HT * 6.2;
    add({
      d: poly([
        pr(cX - 5, cL, 0),
        pr(cX + 5, cL, 0),
        pr(cX + 1.8, cL, cH * 0.7),
        pr(cX - 1.8, cL, cH * 0.7),
      ]),
      fill: '#b9bec7',
    });
    add({
      d: poly([
        pr(cX - 7, cL, cH * 0.56),
        pr(cX + 7, cL, cH * 0.56),
        pr(cX + 8.5, cL, cH * 0.6),
        pr(cX + 5, cL, cH * 0.64),
        pr(cX - 5, cL, cH * 0.64),
        pr(cX - 8.5, cL, cH * 0.6),
      ]),
      fill: '#d6dae1',
    });
    add({
      d: line([pr(cX - 8, cL, cH * 0.6), pr(cX + 8, cL, cH * 0.6)]),
      stroke: '#ffe29a',
      sw: 1.6,
      dash: '0.1 2.2',
    });
    add({
      d: poly([
        pr(cX - 2.4, cL, cH * 0.72),
        pr(cX + 2.4, cL, cH * 0.72),
        pr(cX + 2.4, cL, cH * 0.75),
        pr(cX - 2.4, cL, cH * 0.75),
      ]),
      fill: '#d6dae1',
    });
    add({
      d: line([pr(cX, cL, cH * 0.7), pr(cX, cL, cH)]),
      stroke: '#c9ced6',
      sw: 1.6,
    });
    const ct = pr(cX, cL, cH);
    G.push({ x: f(ct[0]), y: f(ct[1]), r: 7 });
  }
  if (S.landmark === 'gateway') {
    const gA = [],
      gX0 = -130,
      gX1 = -60,
      gL = 320,
      gH = HT * 3.5;
    for (let gi = 0; gi <= 30; gi++) {
      const gt = gi / 30,
        gxx = gX0 + (gX1 - gX0) * gt,
        gh =
          gH *
          (1 - Math.pow(2 * gt - 1, 2)) *
          (1 + 0.12 * (1 - Math.pow(2 * gt - 1, 2)));
      gA.push(pr(gxx, gL, gh));
    }
    add({ d: line(gA), stroke: '#dfe5ec', sw: 5.5 });
    add({ d: line(gA), stroke: '#8f9aa8', sw: 1.6, op: 0.9 });
    const gtp = pr((gX0 + gX1) / 2, gL, gH * 1.12);
    G.push({ x: f(gtp[0]), y: f(gtp[1]), r: 6 });
  }
  if (S.landmark === 'olympic') {
    const oL = 330,
      sh0 = [],
      x0 = -5,
      x1 = 155;
    for (let oi = 0; oi <= 24; oi++) {
      const ox = x0 + ((x1 - x0) * oi) / 24;
      sh0.push(pr(ox, oL, HT * (0.35 + 1.05 * Math.sin((Math.PI * oi) / 24))));
    }
    add({
      d: poly([pr(x0, oL, 0)].concat(sh0).concat([pr(x1, oL, 0)])),
      fill: '#8f96a2',
    });
    for (let oj = 2; oj < 24; oj += 3) {
      const oxx = x0 + ((x1 - x0) * oj) / 24;
      add({
        d: line([
          pr(oxx, oL, HT * 0.3),
          pr(oxx, oL, HT * (0.35 + 1.05 * Math.sin((Math.PI * oj) / 24))),
        ]),
        stroke: '#6f7682',
        sw: 1,
      });
    }
    add({
      d: line([pr(x0 + 6, oL, HT * 0.3), pr(x1 - 6, oL, HT * 0.3)]),
      stroke: '#ffe29a',
      sw: 1.4,
      dash: '0.1 3',
      op: 0.85,
    });
    const bX = 10,
      tX = -30,
      tH = HT * 4.1;
    add({
      d: poly([
        pr(bX - 9, oL, HT * 0.6),
        pr(bX + 9, oL, HT * 0.6),
        pr(tX + 5, oL, tH),
        pr(tX - 4, oL, tH + HT * 0.12),
      ]),
      fill: '#c6cbd3',
    });
    add({
      d: line([pr(bX + 4, oL, HT * 0.7), pr(tX + 3, oL, tH)]),
      stroke: '#ffe29a',
      sw: 1.2,
      dash: '0.1 4',
      op: 0.8,
    });
    add({
      d: poly([
        pr(tX - 8, oL, tH - HT * 0.05),
        pr(tX + 9, oL, tH - HT * 0.25),
        pr(tX + 11, oL, tH + HT * 0.12),
        pr(tX - 6, oL, tH + HT * 0.34),
      ]),
      fill: '#dde1e7',
    });
    add({
      d: line([pr(tX - 7, oL, tH + HT * 0.1), pr(tX + 10, oL, tH - HT * 0.08)]),
      stroke: '#ffe29a',
      sw: 1.4,
      dash: '0.1 2.6',
    });
    const oT = pr(tX + 2, oL, tH + HT * 0.25);
    G.push({ x: f(oT[0]), y: f(oT[1]), r: 8 });
  }
  if (S.landmark === 'bridge') {
    const brL = 285,
      brT = [],
      brD = [];
    for (let bxx = -330; bxx <= 330; bxx += 10) {
      const bhh =
        HT *
        (1.25 +
          1.35 * Math.exp(-Math.pow((Math.abs(bxx) - 70) / 48, 2)) +
          0.25 * Math.exp(-Math.pow(bxx / 30, 2)));
      brT.push(pr(bxx, brL, bhh));
      brD.push(pr(bxx, brL, HT * 1.05));
      add({
        d: line([pr(bxx, brL, HT * 1.05), pr(bxx, brL, bhh)]),
        stroke: '#4d6d94',
        sw: 0.9,
        op: 0.8,
      });
    }
    [-70, 70].forEach(function (px) {
      add({
        d: line([pr(px, brL, 0), pr(px, brL, HT * 2.7)]),
        stroke: '#3c5a80',
        sw: 2.4,
      });
    });
    add({ d: line(brT), stroke: '#6d91bd', sw: 2.2 });
    add({ d: line(brD), stroke: '#5b7ea8', sw: 2 });
    add({ d: line(brD), stroke: '#ffe29a', sw: 1.6, dash: '0.1 5', op: 0.9 });
  }
  if (S.landmark === 'lighthouse') {
    const lhS = S.open ? S.far! : (S as StandSpec),
      lhL = 105 + lhS.maxD! + 10,
      lhX = -26,
      lh0 = Hd(lhS, lhS.maxD),
      lh1 = lh0 + HT * 1.15;
    add({
      d: poly([
        pr(lhX - 3.2, lhL, 0),
        pr(lhX + 3.2, lhL, 0),
        pr(lhX + 2.1, lhL, lh1),
        pr(lhX - 2.1, lhL, lh1),
      ]),
      fill: '#efece4',
    });
    [0.35, 0.62].forEach(function (k) {
      add({
        d: poly([
          pr(lhX - 3, lhL, lh0 + (lh1 - lh0) * k - HT * 0.05 + (1 - k) * 0),
          pr(lhX + 3, lhL, lh0 + (lh1 - lh0) * k - HT * 0.05),
          pr(lhX + 2.7, lhL, lh0 + (lh1 - lh0) * k + HT * 0.08),
          pr(lhX - 2.7, lhL, lh0 + (lh1 - lh0) * k + HT * 0.08),
        ]),
        fill: '#c8102e',
      });
    });
    add({
      d: poly([
        pr(lhX - 2.6, lhL, lh1),
        pr(lhX + 2.6, lhL, lh1),
        pr(lhX + 2.6, lhL, lh1 + HT * 0.18),
        pr(lhX - 2.6, lhL, lh1 + HT * 0.18),
      ]),
      fill: '#ffe9a8',
    });
    add({
      d: poly([
        pr(lhX - 3, lhL, lh1 + HT * 0.18),
        pr(lhX + 3, lhL, lh1 + HT * 0.18),
        pr(lhX, lhL, lh1 + HT * 0.34),
      ]),
      fill: '#2a2f38',
    });
    const lht = pr(lhX, lhL, lh1 + HT * 0.09);
    G.push({ x: f(lht[0]), y: f(lht[1]), r: 26 });
    // pasarela del fondo norte
    add({
      d: poly([
        pr(-44, lhL - 2, lh0 + HT * 0.25),
        pr(44, lhL - 2, lh0 + HT * 0.25),
        pr(44, lhL - 2, lh0 + HT * 0.42),
        pr(-44, lhL - 2, lh0 + HT * 0.42),
      ]),
      fill: '#3b4250',
    });
    add({
      d: line([
        pr(-44, lhL - 2, lh0 + HT * 0.33),
        pr(44, lhL - 2, lh0 + HT * 0.33),
      ]),
      stroke: '#ffe29a',
      sw: 1.4,
      dash: '0.1 4',
      op: 0.9,
    });
  }

  if (S.roof === 'lattice') {
    const RH = HT + 26,
      X0 = -120,
      X1 = 120;
    for (let gx = X0, n = 0; gx <= X1; gx += 10, n++) {
      const p1 = [];
      for (let gl = LMIN; gl <= 260; gl += 10) p1.push(pr(gx, gl, RH));
      add({
        d: line(p1),
        stroke: n % 3 ? '#9ea3ad' : '#747a86',
        sw: n % 3 ? 1 : 2.2,
      });
    }
    for (let tl = LMIN, m = 0; tl <= 260; tl += 12, m++) {
      const p2 = [];
      for (let tx = X0; tx <= X1; tx += 10) p2.push(pr(tx, tl, RH));
      add({
        d: line(p2),
        stroke: m % 3 ? '#a7acb5' : '#7b808b',
        sw: m % 3 ? 1 : 2,
      });
    }
    for (let dg = LMIN; dg <= 260; dg += 24)
      add({
        d: line([pr(X0, dg, RH), pr(X1, dg + 24, RH)]),
        stroke: '#8e939d',
        sw: 0.8,
        op: 0.8,
      });
    add({
      d: band('ring', S.maxD! + 4, HT + 21, S.maxD! + 10, HT + 26),
      fill: '#5d626c',
    });
    if (S.oculus) {
      const oc = [],
        ocR = 30,
        ocC = 52.5;
      for (let oq = 0; oq <= 8; oq++) {
        const oa = (oq / 8) * Math.PI * 2 + Math.PI / 8;
        oc.push(pr(ocR * Math.cos(oa), ocC + ocR * 1.25 * Math.sin(oa), RH));
      }
      for (let pq = 0; pq < 8; pq++) {
        const a0 = (pq / 8) * Math.PI * 2 + Math.PI / 8,
          a1 = a0 + Math.PI / 4;
        add({
          d: poly([
            pr(ocR * Math.cos(a0), ocC + ocR * 1.25 * Math.sin(a0), RH),
            pr(ocR * Math.cos(a1), ocC + ocR * 1.25 * Math.sin(a1), RH),
            pr(135 * Math.cos(a0 + 0.25), ocC + 170 * Math.sin(a0 + 0.25), RH),
          ]),
          fill: pq % 2 ? '#b9bec7' : '#d3d7dd',
          stroke: '#8e939d',
          sw: 1,
        });
      }
      add({ d: poly(oc), fill: '#0a1328', stroke: '#e8203a', sw: 2 });
    }

    const sd = S.maxD! + 3;
    add({ d: band('ring', sd, HT + 2.3, sd, HT + 20.3), fill: '#0a1430' });
    add({
      d: ring('ring', sd, HT + 11.3),
      stroke: S.led,
      sw: 6,
      dash: '24 5',
      op: 0.9,
    });
    add({
      d: ring('ring', sd, HT + 7.3),
      stroke: '#9cc2ff',
      sw: 2,
      dash: '10 16',
      op: 0.8,
    });
    add({
      d: ring('ring', sd, HT + 16.3),
      stroke: '#ffffff',
      sw: 1.5,
      dash: '6 20',
      op: 0.7,
    });
    const fl = 105 + sd;
    add({
      d: poly([
        pr(-18, fl, HT - 0.7),
        pr(18, fl, HT - 0.7),
        pr(18, fl, HT + 21.3),
        pr(-18, fl, HT + 21.3),
      ]),
      fill: '#101c45',
      stroke: '#6fa0ff',
      sw: 1,
    });
    add({
      d: poly([
        pr(-16, fl, HT + 1.3),
        pr(16, fl, HT + 1.3),
        pr(16, fl, HT + 19.3),
        pr(-16, fl, HT + 19.3),
      ]),
      fill: '#2a56c9',
      op: 0.9,
    });

    add({
      d: ring('ring', S.maxD! + 2, HT + 0.8),
      stroke: '#fffbe6',
      sw: 2,
      dash: '0.1 7',
    });
  }
  // Torres de focos
  if (S.towers) {
    const tw = S.open
      ? [
          [-48, 118],
          [48, 118],
        ]
      : [
          [-(34 + S.maxD! * 0.85), 105 + S.maxD! * 0.85],
          [34 + S.maxD! * 0.85, 105 + S.maxD! * 0.85],
        ];
    tw.forEach(function (p) {
      const top = HT + 18;
      add({
        d: line([pr(p[0], p[1], 0), pr(p[0], p[1], top)]),
        stroke: '#3a3f4a',
        sw: 2.5,
      });
      add({
        d: poly([
          pr(p[0] - 5, p[1], top),
          pr(p[0] + 5, p[1], top),
          pr(p[0] + 5, p[1], top + 4),
          pr(p[0] - 5, p[1], top + 4),
        ]),
        fill: '#fffbe6',
      });
      const c = pr(p[0], p[1], top + 2);
      G.push({ x: f(c[0]), y: f(c[1]), r: 34 });
    });
  }
  if (S.corner) {
    const cx0 = -(34 + S.corner.d),
      cl0 = 105 + S.corner.d,
      ch = S.corner.h;
    add({
      d: poly([
        pr(cx0 - 14, cl0, 0),
        pr(cx0 + 10, cl0, 0),
        pr(cx0 + 10, cl0, ch),
        pr(cx0 - 14, cl0, ch),
      ]),
      fill: S.corner.col,
    });
    add({
      d: poly([
        pr(cx0 - 15, cl0, ch),
        pr(cx0 + 11, cl0, ch),
        pr(cx0 - 2, cl0, ch + 4),
      ]),
      fill: S.corner.roof,
    });
    for (let wy = 3; wy < ch - 1; wy += 4)
      add({
        d: line([pr(cx0 - 12, cl0, wy), pr(cx0 + 8, cl0, wy)]),
        stroke: '#ffd97a',
        sw: 2,
        dash: '0.1 4',
        op: 0.8,
      });
  }
  if (S.noFar) {
    const blocks: Array<[number, number, number, string]> = [
      [-85, -52, 16, '#3d3631'],
      [-50, -18, 22, '#4a413a'],
      [-15, 14, 18, '#3d3631'],
      [17, 50, 24, '#4a413a'],
      [53, 88, 15, '#3d3631'],
    ];
    blocks.forEach(function (b) {
      add({
        d: poly([
          pr(b[0], 150, 0),
          pr(b[1], 150, 0),
          pr(b[1], 150, b[2]),
          pr(b[0], 150, b[2]),
        ]),
        fill: b[3],
      });
      for (let wh = 4; wh < b[2] - 1; wh += 3)
        add({
          d: line([pr(b[0] + 2, 150, wh), pr(b[1] - 2, 150, wh)]),
          stroke: '#ffd97a',
          sw: 2,
          dash: '0.1 7',
          off: (wh % 4).toFixed(0),
          op: 0.85,
        });
    });
    add({
      d: poly([
        pr(-60, 110, 0),
        pr(60, 110, 0),
        pr(60, 110, 3.5),
        pr(-60, 110, 3.5),
      ]),
      fill: '#e4dfd4',
    });
    add({
      d: poly([
        pr(-60, 110, 2.8),
        pr(60, 110, 2.8),
        pr(60, 110, 3.5),
        pr(-60, 110, 3.5),
      ]),
      fill: '#c8102e',
    });
  }

  // Gradas y cubiertas, de la más lejana a la más cercana
  stands.forEach(function (st) {
    const kind = st[0],
      c = st[1],
      ht = Htop(c);
    const tiers = c.tiers.slice().sort(function (a, b) {
      return b[0] - a[0];
    });
    const step = c.maxD / 44;
    tiers.forEach(function (t, ti) {
      add({ d: band(kind, t[0], Hd(c, t[0]), t[1], Hd(c, t[1])), fill: t[2] });
      const SA = segs(kind, t[0], Hd(c, t[0])),
        SB = segs(kind, t[1], Hd(c, t[1])),
        sw = t[6] || 2;
      SA.forEach(function (sa, si) {
        const sb = SB[si];
        if (t[5])
          for (let q2 = 0; q2 + sw <= sa.length - 1; q2 += 2 * sw)
            if (
              Math.abs(sa[q2 + sw][0] - sa[q2][0]) +
                Math.abs(sa[q2 + sw][1] - sa[q2][1]) <
              42
            )
              add({
                d: poly(
                  sa
                    .slice(q2, q2 + sw + 1)
                    .concat(sb.slice(q2, q2 + sw + 1).reverse()),
                ),
                fill: t[5],
              });
        for (let q3 = sw; q3 < sa.length - 1; q3 += sw)
          add({
            d: line([sa[q3], sb[q3]]),
            stroke: '#1b1d29',
            sw: 1.1,
            op: 0.55,
          });
      });
      let j = 0;
      for (let d = t[0] + step * 0.6; d < t[1]; d += step) {
        add({
          d: ring(kind, d, Hd(c, d)),
          stroke: t[3],
          sw: 2.1,
          dash: '0.1 3.2',
          off: ((j * 1.3) % 3.2).toFixed(1),
          op: 0.9,
        });
        if (j % 2)
          add({
            d: ring(kind, d, Hd(c, d)),
            stroke: t[4],
            sw: 2.1,
            dash: '0.1 11',
            off: ((j * 4) % 11).toFixed(1),
          });
        if (t[7])
          add({
            d: ring(kind, d - step * 0.45, Hd(c, d - step * 0.45)),
            stroke: t[7],
            sw: 0.7,
            op: 0.75,
          });
        j++;
      }
      if (ti < tiers.length - 1) {
        const nx = tiers[ti + 1][1];
        add({
          d: band(kind, nx, Hd(c, nx), t[0], Hd(c, t[0])),
          fill: ti === 0 ? '#1b1d29' : '#23202f',
        });
        const mid = (nx + t[0]) / 2;
        add({
          d: ring(kind, mid, Hd(c, mid)),
          stroke: c.sepCol || (ti === 0 ? '#ffcf7a' : '#e8e4ff'),
          sw: 1.6,
          dash: c.sepCol ? 'none' : '3 4',
          op: 0.85,
        });
      }
    });
    // Pared trasera de la grada (se ve en esquinas abiertas)
    if (S.open && !S.closed) {
      if (kind === 'far') {
        [-40, 40].forEach(function (ex) {
          add({
            d: poly([
              pr(ex, 108, 1.5),
              pr(ex, 105 + c.maxD, ht),
              pr(ex, 105 + c.maxD, 0),
              pr(ex, 108, 0),
            ]),
            fill: '#262a33',
          });
        });
      } else {
        const sx = kind === 'left' ? -1 : 1;
        add({
          d: poly([
            pr(sx * 37, 104, 1.5),
            pr(sx * (34 + c.maxD), 104, ht),
            pr(sx * (34 + c.maxD), 104, 0),
            pr(sx * 37, 104, 0),
          ]),
          fill: '#262a33',
        });
      }
    }
    if (c.pillars) {
      const PP = segs(kind, c.maxD + 1, ht)[0];
      for (let pi = 0; pi < PP.length; pi += 3) {
        const q = PP[pi];
        add({
          d: line([q, [q[0], q[1] - 34 / (1 + pi / PP.length)]]),
          stroke: '#c8c4bc',
          sw: 2.2,
        });
      }
    }
    if (c.roof === 'open' || c.rim)
      add({
        d: ring(kind, c.maxD, ht + 0.5),
        stroke: '#fffbe6',
        sw: 2,
        dash: '0.1 9',
        op: 0.9,
      });
    const roofKinds = c.roofSide ? ([] as string[]).concat(c.roofSide) : [kind];
    if (c.roof === 'canopy' || c.roof === 'wave' || c.roof === 'arch')
      roofKinds.forEach(function (rk) {
        const inner = c.maxD - c.ov!,
          amp = c.roof === 'wave' ? 4 : 0;
        const lf = c.lift || 0;
        add({
          d: band(rk, c.maxD + 1, ht + 2 + lf, inner, ht + 6 + lf, amp),
          fill: c.roofCol,
        });
        if (c.ribs) {
          const RA = segs(rk, c.maxD + 1, ht + 2 + lf)[0],
            RB = segs(rk, inner, ht + 6 + lf)[0];
          for (let r3 = 0; r3 < Math.min(RA.length, RB.length); r3++)
            add({
              d: line([RA[r3], RB[r3]]),
              stroke: c.ribs,
              sw: 1.2,
              op: 0.9,
            });
        }
        if (c.ribbon && rk === 'ring') {
          add({
            d: band(rk, inner, ht + 6.2, inner, ht + 1.2),
            fill: '#0b0f1c',
          });
          add({
            d: ring(rk, inner, ht + 3.7),
            stroke: S.led,
            sw: 5,
            dash: '22 6',
            op: 0.95,
          });
          add({
            d: ring(rk, inner, ht + 3.7),
            stroke: '#ffffff',
            sw: 5,
            dash: '6 22',
            off: 11,
            op: 0.95,
          });
          add({
            d: ring(rk, inner, ht + 6.6),
            stroke: '#fffbe6',
            sw: 2.6,
            dash: '0.1 3.2',
          });
        }
        add({
          d: ring(rk, inner + 0.5, ht + 5.6 + lf),
          stroke: '#fff6d6',
          sw: 1.6,
          op: 0.9,
        });
        add({
          d: ring(rk, inner + 1.5, ht + 5.2 + lf),
          stroke: '#fffbe6',
          sw: 2,
          dash: '0.1 8',
        });
        if (c.roof === 'arch') {
          const A = segs(rk, c.maxD + 1, ht + 2)[0],
            B = segs(rk, inner, ht + 6)[0],
            zz = [];
          for (let zi = 0; zi < Math.min(A.length, B.length); zi++)
            zz.push(zi % 2 ? A[zi] : B[zi]);
          add({ d: line(zz), stroke: '#b5b8be', sw: 1 });
        }
      });
    if (c.beams) {
      const bi = c.maxD - c.ov!,
        bh = ht + 7 + (c.lift || 0),
        bx = 34 + bi,
        bl = 105 + bi,
        ext = 34 + c.maxD + 12;
      const beams = [
        [
          [-bx, LMIN],
          [-bx, 105 + c.maxD + 12],
        ],
        [
          [bx, LMIN],
          [bx, 105 + c.maxD + 12],
        ],
        [
          [-ext, bl],
          [ext, bl],
        ],
      ];
      beams.forEach(function (bm) {
        const A1 = pr(bm[0][0], bm[0][1], bh),
          A2 = pr(bm[1][0], bm[1][1], bh),
          B1 = pr(bm[0][0], bm[0][1], bh + 3.5),
          B2 = pr(bm[1][0], bm[1][1], bh + 3.5);
        add({
          d: poly([A1, A2, B2, B1]),
          fill: '#3a4150',
          stroke: '#566075',
          sw: 1,
        });
        add({ d: line([A1, A2]), stroke: '#fffbe6', sw: 2.4, dash: '0.1 4.5' });
      });
    }
    if (c.cornerScreens) {
      [-1, 1].forEach(function (sg) {
        const cx = sg * (34 + c.maxD * 0.62),
          cl = 105 + c.maxD * 0.62,
          h1 = ht - 2;
        add({
          d: poly([
            pr(cx - 5 * sg, cl - 5, h1),
            pr(cx + 5 * sg, cl + 5, h1),
            pr(cx + 5 * sg, cl + 5, h1 + 6),
            pr(cx - 5 * sg, cl - 5, h1 + 6),
          ]),
          fill: '#0b0f1c',
          stroke: '#3a4152',
          sw: 1,
        });
        add({
          d: poly([
            pr(cx - 4.4 * sg, cl - 4.4, h1 + 0.6),
            pr(cx + 4.4 * sg, cl + 4.4, h1 + 0.6),
            pr(cx + 4.4 * sg, cl + 4.4, h1 + 5.4),
            pr(cx - 4.4 * sg, cl - 4.4, h1 + 5.4),
          ]),
          fill: '#1d3f96',
        });
      });
    }
    // Marcador en el fondo
    if (
      (kind === 'far' || (kind === 'ring' && !S.noFar)) &&
      S.roof !== 'lattice' &&
      !S.noBoard &&
      c === (S.open ? S.far : S) &&
      !(S.extraF && kind === 'ring')
    ) {
      const covered =
        (c.roof === 'canopy' || c.roof === 'wave' || c.roof === 'arch') &&
        !c.roofSide;
      const fe = covered ? 105 + c.maxD - c.ov! + 2 : 105 + c.maxD + 1,
        h0 = covered ? ht - 3 : ht + 1;
      add({
        d: poly([
          pr(-11, fe, h0),
          pr(11, fe, h0),
          pr(11, fe, h0 + 8),
          pr(-11, fe, h0 + 8),
        ]),
        fill: '#0b0f1c',
        stroke: '#3a4152',
        sw: 1,
      });
      add({
        d: poly([
          pr(-10, fe, h0 + 0.8),
          pr(10, fe, h0 + 0.8),
          pr(10, fe, h0 + 7.2),
          pr(-10, fe, h0 + 7.2),
        ]),
        fill: '#1d3f96',
      });
    }
  });

  if (S.closed) {
    const cc0 = [S.far!, S.side!, S.sideR || S.side!].sort(function (a, b) {
      return b.maxD - a.maxD;
    })[0];
    ['cornL', 'cornR'].forEach(function (ck) {
      cc0.tiers.forEach(function (t) {
        add({
          d: band(ck, t[0], Hd(cc0, t[0]), t[1], Hd(cc0, t[1])),
          fill: t[2],
        });
        const stp = cc0.maxD / 44;
        let jj = 0;
        for (let d = t[0] + stp * 0.6; d < t[1]; d += stp) {
          add({
            d: ring(ck, d, Hd(cc0, d)),
            stroke: t[3],
            sw: 2.1,
            dash: '0.1 3.2',
            off: ((jj * 1.3) % 3.2).toFixed(1),
            op: 0.9,
          });
          jj++;
        }
      });
      add({
        d: ring(ck, cc0.maxD, Htop(cc0) + 0.5),
        stroke: '#fffbe6',
        sw: 2,
        dash: '0.1 6',
        op: 0.9,
      });
    });
  }
  // Vallas LED y césped

  if (S.track) {
    add({ d: band('ring', 0, 0, 11, 0.3), fill: S.track });
    for (let tk = 1.2; tk < 11; tk += 1.4)
      add({ d: ring('ring', tk, 0.15), stroke: '#ffffff', sw: 0.7, op: 0.55 });
  }
  add({
    d: poly([
      pr(-37, LMIN, 0),
      pr(-37, 108, 0),
      pr(37, 108, 0),
      pr(37, LMIN, 0),
    ]),
    fill: S.track ? 'none' : '#2f8f45',
  });
  const ledPath = line([
    pr(-36, LMIN, 0.55),
    pr(-36, 107, 0.55),
    pr(36, 107, 0.55),
    pr(36, LMIN, 0.55),
  ]);
  add({
    d:
      poly([
        pr(-36, LMIN, 0),
        pr(-36, 107, 0),
        pr(36, 107, 0),
        pr(36, LMIN, 0),
      ]) +
      ' ' +
      poly([
        pr(-36, LMIN, 1.1),
        pr(-36, 107, 1.1),
        pr(36, 107, 1.1),
        pr(36, LMIN, 1.1),
      ]),
    fill: 'none',
    stroke: '#0b0f24',
    sw: 4,
  });
  add({ d: ledPath, stroke: S.led, sw: 3, dash: '18 4' });
  add({ d: ledPath, stroke: '#ffffff', sw: 3, dash: '5 30', off: 3, op: 0.9 });
  add({
    d: poly([
      pr(-35, LMIN, 0),
      pr(-35, 106.5, 0),
      pr(35, 106.5, 0),
      pr(35, LMIN, 0),
    ]),
    fill: '#3a9a4e',
  });
  if (S.fence) {
    const fw2 = S.track ? 12 : 3.2;
    const fb = [
        pr(-34 - fw2, LMIN, 0),
        pr(-34 - fw2, 105 + fw2, 0),
        pr(34 + fw2, 105 + fw2, 0),
        pr(34 + fw2, LMIN, 0),
      ],
      ft = [
        pr(-34 - fw2, LMIN, 3),
        pr(-34 - fw2, 105 + fw2, 3),
        pr(34 + fw2, 105 + fw2, 3),
        pr(34 + fw2, LMIN, 3),
      ];
    add({
      d: poly(fb.concat(ft.slice().reverse())),
      fill: '#9aa3ad',
      op: 0.16,
    });
    add({ d: line(ft), stroke: '#c9ced6', sw: 1.2, op: 0.8 });
    for (let fi = 0; fi < 4; fi++) {
      const qa = fb[fi],
        qb = ft[fi];
      add({ d: line([qa, qb]), stroke: '#c9ced6', sw: 1.2, op: 0.8 });
    }
    const fl2 = [];
    for (let fx = -34 - fw2; fx <= 34 + fw2; fx += 4) {
      fl2.push(pr(fx, 105 + fw2, 0));
      fl2.push(pr(fx, 105 + fw2, 3));
      fl2.push(pr(fx, 105 + fw2, 0));
    }
    add({ d: line(fl2), stroke: '#c9ced6', sw: 0.5, op: 0.6 });
    const fs2 = [];
    for (let fl3 = LMIN; fl3 <= 105 + fw2; fl3 += 4) {
      fs2.push(pr(-34 - fw2, fl3, 0));
      fs2.push(pr(-34 - fw2, fl3, 3));
      fs2.push(pr(-34 - fw2, fl3, 0));
    }
    add({ d: line(fs2), stroke: '#c9ced6', sw: 0.5, op: 0.6 });
    const fs3 = [];
    for (let fl4 = LMIN; fl4 <= 105 + fw2; fl4 += 4) {
      fs3.push(pr(34 + fw2, fl4, 0));
      fs3.push(pr(34 + fw2, fl4, 3));
      fs3.push(pr(34 + fw2, fl4, 0));
    }
    add({ d: line(fs3), stroke: '#c9ced6', sw: 0.5, op: 0.6 });
  }
  for (let st2 = 0; st2 < 105; st2 += 5.25)
    if ((st2 / 5.25) % 2)
      add({
        d: poly([
          pr(-34, st2, 0),
          pr(34, st2, 0),
          pr(34, st2 + 5.25, 0),
          pr(-34, st2 + 5.25, 0),
        ]),
        fill: '#338c46',
      });
  add({
    d: 'M-40 470 A240 70 0 1 0 430 470 A240 70 0 1 0 -40 470 Z',
    fill: '#ffffff',
    op: 0.06,
  });
  function ln(pts: Point[]) {
    add({ d: line(pts), stroke: '#ffffff', sw: 1.6, op: 0.9 });
  }
  ln([pr(-34, LMIN, 0), pr(-34, 105, 0), pr(34, 105, 0), pr(34, LMIN, 0)]);
  ln([pr(-34, 0, 0), pr(34, 0, 0)]);
  ln([pr(-34, 52.5, 0), pr(34, 52.5, 0)]);
  const cc = [];
  for (let q = 0; q <= 60; q++) {
    const an = (q / 60) * Math.PI * 2;
    cc.push(pr(9.15 * Math.cos(an), 52.5 + 9.15 * Math.sin(an), 0));
  }
  ln(cc);
  [0, 105].forEach(function (g) {
    const s = g ? -1 : 1;
    ln([
      pr(-20.15, g, 0),
      pr(-20.15, g + s * 16.5, 0),
      pr(20.15, g + s * 16.5, 0),
      pr(20.15, g, 0),
    ]);
    ln([
      pr(-9.15, g, 0),
      pr(-9.15, g + s * 5.5, 0),
      pr(9.15, g + s * 5.5, 0),
      pr(9.15, g, 0),
    ]);
    const ap = [];
    for (let k = 0; k <= 30; k++) {
      const aa = -0.93 + (k / 30) * 1.86,
        dd = 11 + 9.15 * Math.cos(aa);
      if (dd >= 16.5) ap.push(pr(9.15 * Math.sin(aa), g + s * dd, 0));
    }
    ln(ap);
  });
  // banquillos, túnel y banderines
  [
    [36, 46],
    [60, 70],
  ].forEach(function (dg) {
    add({
      d: poly([
        pr(-35.2, dg[0], 0),
        pr(-35.2, dg[1], 0),
        pr(-37.6, dg[1], 0),
        pr(-37.6, dg[0], 0),
      ]),
      fill: '#1c2129',
    });
    add({
      d: poly([
        pr(-35.2, dg[0], 1.6),
        pr(-35.2, dg[1], 1.6),
        pr(-37.6, dg[1], 2.2),
        pr(-37.6, dg[0], 2.2),
      ]),
      fill: '#5a6270',
      op: 0.9,
    });
    add({
      d: poly([
        pr(-35.2, dg[0], 0),
        pr(-35.2, dg[1], 0),
        pr(-35.2, dg[1], 1.6),
        pr(-35.2, dg[0], 1.6),
      ]),
      fill: '#8a93a3',
      op: 0.5,
    });
    add({
      d: poly([
        pr(-37.6, dg[0], 0),
        pr(-37.6, dg[1], 0),
        pr(-37.6, dg[1], 2.2),
        pr(-37.6, dg[0], 2.2),
      ]),
      fill: '#3b424e',
    });
  });
  add({
    d: poly([
      pr(-35.2, 51, 0),
      pr(-35.2, 55, 0),
      pr(-38.5, 55, 0),
      pr(-38.5, 51, 0),
    ]),
    fill: '#0b0e14',
  });
  add({
    d: poly([
      pr(-35.2, 51, 0),
      pr(-35.2, 55, 0),
      pr(-35.2, 55, 2.4),
      pr(-35.2, 51, 2.4),
    ]),
    fill: '#1c2129',
  });
  [
    [-34, 105],
    [34, 105],
  ].forEach(function (cf) {
    add({
      d: line([pr(cf[0], cf[1], 0), pr(cf[0], cf[1], 1.5)]),
      stroke: '#ffffff',
      sw: 0.8,
    });
    add({
      d: poly([
        pr(cf[0], cf[1], 1.5),
        pr(cf[0] + 1.2, cf[1], 1.3),
        pr(cf[0], cf[1], 1.0),
      ]),
      fill: S.led,
    });
  });
  // banderas en la grada de fondo
  if (S.flags) {
    const fcs = S.flags,
      fst = S.open ? S.far! : (S as StandSpec),
      fd = 105 + fst.maxD * 0.55;
    for (let fi2 = 0; fi2 < 9; fi2++) {
      const fx2 = -28 + fi2 * 7 + ((fi2 * 37) % 5) - 2,
        fh = 1.2 + ((fi2 * 13) % 3) * 0.5 + fst.maxD * 0.3 * 0.72,
        fw3 = 3 + ((fi2 * 7) % 3);
      add({
        d: poly([
          pr(fx2, fd, fh - 1.6),
          pr(fx2 + fw3, fd, fh - 1.6),
          pr(fx2 + fw3, fd, fh + 0.6),
          pr(fx2, fd, fh + 0.6),
        ]),
        fill: fcs[fi2 % fcs.length],
        op: 0.85,
      });
    }
  }
  add({
    d: poly([
      pr(-3.66, 105, 2.44),
      pr(-3.66, 107.2, 2),
      pr(3.66, 107.2, 2),
      pr(3.66, 105, 2.44),
    ]),
    fill: '#ffffff',
    op: 0.25,
  });
  add({
    d: poly([
      pr(-3.66, 107.2, 2),
      pr(3.66, 107.2, 2),
      pr(3.66, 107.2, 0),
      pr(-3.66, 107.2, 0),
    ]),
    fill: '#ffffff',
    op: 0.2,
  });
  add({
    d: line([
      pr(-3.66, 105, 0),
      pr(-3.66, 105, 2.44),
      pr(3.66, 105, 2.44),
      pr(3.66, 105, 0),
    ]),
    stroke: '#ffffff',
    sw: 1.8,
  });
  if (S.halo) {
    const hH = HT * 1.02,
      hR = 17,
      hC = 52.5,
      hTop = [],
      hBot = [];
    for (let hq = 0; hq <= 48; hq++) {
      const ha = (hq / 48) * Math.PI * 2;
      hTop.push(pr(hR * Math.cos(ha), hC + hR * Math.sin(ha), hH));
      hBot.push(pr(hR * Math.cos(ha), hC + hR * Math.sin(ha), hH - 5));
    }
    const hFront = [],
      hFrontB: Point[] = [];
    for (let hq2 = 0; hq2 <= 24; hq2++) {
      const hb = Math.PI + (hq2 / 24) * Math.PI;
      hFront.push(pr(hR * Math.cos(hb), hC + hR * Math.sin(hb) * -1, hH));
      hFrontB.push(pr(hR * Math.cos(hb), hC + hR * Math.sin(hb) * -1, hH - 5));
    }
    add({
      d: line([pr(0, hC, hH + 30), pr(0, hC, hH)]),
      stroke: '#6d7380',
      sw: 1,
    });
    add({ d: poly(hTop), fill: '#0b0f1c', op: 0.9 });
    add({
      d: poly(hFront.concat(hFrontB.slice().reverse())),
      fill: '#0b0f1c',
      stroke: '#3a4152',
      sw: 1,
    });
    add({ d: line(hFrontB), stroke: S.led, sw: 3.5, dash: '26 5', op: 0.95 });
    add({
      d: line(
        hFront.map(function (p, i) {
          return [(p[0] + hFrontB[i][0]) / 2, (p[1] + hFrontB[i][1]) / 2];
        }),
      ),
      stroke: '#8fb4ff',
      sw: 3,
      dash: '8 10',
      op: 0.85,
    });
    add({ d: line(hTop), stroke: '#fffbe6', sw: 1.2, dash: '0.1 5', op: 0.8 });
  }
  return { layers: L, glows: G, bg: bg };
}
export function svg(S: StadiumSpec, vbW = 390, vbH = 640): string {
  vbW = vbW || 390;
  vbH = vbH || 640;
  const vx = (390 - vbW) / 2;
  const v = buildLayers(S);
  let o =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
    vx +
    ' 0 ' +
    vbW +
    ' ' +
    vbH +
    '" preserveAspectRatio="xMidYMin slice"><defs><radialGradient id="fgGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe6" stop-opacity="0.9"/><stop offset="0.35" stop-color="#fff3c4" stop-opacity="0.3"/><stop offset="1" stop-color="#fff3c4" stop-opacity="0"/></radialGradient><linearGradient id="fgScrim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050912" stop-opacity="0.5"/><stop offset="0.5" stop-color="#050912" stop-opacity="0.45"/><stop offset="1" stop-color="#050912" stop-opacity="0.85"/></linearGradient></defs><rect x="' +
    vx +
    '" width="' +
    vbW +
    '" height="' +
    vbH +
    '" fill="' +
    v.bg +
    '"/>';
  if (v.bg !== '#c9ccd3')
    o +=
      '<circle cx="48" cy="96" r="1" fill="#fff" opacity=".6"/><circle cx="120" cy="70" r="1" fill="#fff" opacity=".5"/><circle cx="210" cy="84" r="1" fill="#fff" opacity=".6"/><circle cx="300" cy="64" r="1" fill="#fff" opacity=".5"/><circle cx="350" cy="110" r="1" fill="#fff" opacity=".4"/>';
  v.layers.forEach(function (l) {
    o +=
      '<path d="' +
      l.d +
      '" fill="' +
      l.fill +
      '" stroke="' +
      l.stroke +
      '" stroke-width="' +
      l.sw +
      '" stroke-dasharray="' +
      l.dash +
      '" stroke-dashoffset="' +
      l.off +
      '" stroke-linecap="round" stroke-linejoin="round" opacity="' +
      l.op +
      '"/>';
  });
  v.glows.forEach(function (g) {
    o +=
      '<circle cx="' +
      g.x +
      '" cy="' +
      g.y +
      '" r="' +
      g.r +
      '" fill="url(#fgGlow)"/>';
  });
  return (
    o +
    '<rect x="' +
    vx +
    '" width="' +
    vbW +
    '" height="' +
    vbH +
    '" fill="url(#fgScrim)"/></svg>'
  );
}
