import { uniqueByTolerance } from "@/utils/number";

export function solveUnivariateNumerically(expr, variable) {
  const fn = expr.compile();
  const f = (x) => {
    const y = fn({ [variable]: x });
    return typeof y === "number" && Number.isFinite(y) ? y : NaN;
  };

  const nearZero = 1e-7;
  const seedThreshold = 5e-4;
  const ranges = [50, 200, 1000];
  const samplesPerRange = 800;

  const seeds = [];
  const brackets = [];

  const brent = (a0, b0) => {
    let a = a0;
    let b = b0;
    let fa = f(a);
    let fb = f(b);
    if (!Number.isFinite(fa) || !Number.isFinite(fb)) return null;
    if (Math.abs(fa) < nearZero) return a;
    if (Math.abs(fb) < nearZero) return b;
    if (fa * fb > 0) return null;

    let c = a;
    let fc = fa;
    let d = b - a;
    let e = d;

    for (let iter = 0; iter < 120; iter++) {
      if (!Number.isFinite(fb) || !Number.isFinite(fa) || !Number.isFinite(fc))
        return null;

      if (fa * fb > 0) {
        a = c;
        fa = fc;
        d = b - a;
        e = d;
      }

      if (Math.abs(fa) < Math.abs(fb)) {
        [a, b] = [b, a];
        [fa, fb] = [fb, fa];
      }

      const tol = 1e-12 * (1 + Math.abs(b));
      const m = 0.5 * (a - b);
      if (Math.abs(m) <= tol || Math.abs(fb) < nearZero) return b;

      if (Math.abs(e) >= tol && Math.abs(fc) > Math.abs(fb)) {
        let s = fb / fc;
        let p;
        let q;
        if (a === c) {
          p = 2 * m * s;
          q = 1 - s;
        } else {
          q = fc / fa;
          const r = fb / fa;
          p = s * (2 * m * q * (q - r) - (b - c) * (r - 1));
          q = (q - 1) * (r - 1) * (s - 1);
        }
        if (q !== 0) {
          if (p > 0) q = -q;
          p = Math.abs(p);
          const min1 = 3 * m * q - Math.abs(tol * q);
          const min2 = Math.abs(e * q);
          if (2 * p < (min1 < min2 ? min1 : min2)) {
            e = d;
            d = p / q;
          } else {
            d = m;
            e = m;
          }
        } else {
          d = m;
          e = m;
        }
      } else {
        d = m;
        e = m;
      }

      c = b;
      fc = fb;
      const step = Math.abs(d) > tol ? d : m > 0 ? tol : -tol;
      b = b + step;
      fb = f(b);
    }
    return null;
  };

  const newtonSafeguarded = (x0) => {
    let x = x0;
    let y = f(x);
    if (!Number.isFinite(y)) return null;

    for (let iter = 0; iter < 40; iter++) {
      if (!Number.isFinite(y)) return null;
      if (Math.abs(y) < nearZero) return x;

      const h = 1e-6 * (1 + Math.abs(x));
      const yp = f(x + h);
      const ym = f(x - h);
      if (!Number.isFinite(yp) || !Number.isFinite(ym)) return null;
      const dy = (yp - ym) / (2 * h);
      if (!Number.isFinite(dy) || Math.abs(dy) < 1e-12) return null;

      const dx = y / dy;
      const targetAbs = Math.abs(y);
      let nextX = x - dx;

      let accepted = false;
      let t = 1;
      for (let ls = 0; ls < 12; ls++) {
        const candidate = x - t * dx;
        const yc = f(candidate);
        if (Number.isFinite(yc) && Math.abs(yc) < targetAbs) {
          nextX = candidate;
          y = yc;
          accepted = true;
          break;
        }
        t *= 0.5;
      }

      if (!accepted) {
        y = f(nextX);
        if (!Number.isFinite(y)) return null;
      }

      if (!Number.isFinite(nextX)) return null;
      if (Math.abs(nextX - x) < 1e-12 * (1 + Math.abs(x))) return nextX;
      x = nextX;
    }
    return Math.abs(f(x)) < 1e-5 ? x : null;
  };

  for (const range of ranges) {
    const minX = -range;
    const maxX = range;
    const step = (maxX - minX) / samplesPerRange;

    let x0 = null;
    let y0 = null;
    let x1 = null;
    let y1 = null;

    for (let i = 0; i <= samplesPerRange; i++) {
      const x2 = minX + i * step;
      const y2 = f(x2);

      if (!Number.isFinite(y2)) {
        x0 = null;
        y0 = null;
        x1 = null;
        y1 = null;
        continue;
      }

      if (Math.abs(y2) < nearZero) seeds.push(x2);

      if (x1 !== null && y1 !== null) {
        if (y1 * y2 < 0) brackets.push([x1, x2]);
      }

      if (x0 !== null && y0 !== null && x1 !== null && y1 !== null) {
        const a0 = Math.abs(y0);
        const a1 = Math.abs(y1);
        const a2 = Math.abs(y2);
        if (a1 <= a0 && a1 <= a2 && a1 < seedThreshold) seeds.push(x1);
      }

      x0 = x1;
      y0 = y1;
      x1 = x2;
      y1 = y2;
    }
  }

  const roots = [];

  for (const [a, b] of brackets) {
    const root = brent(a, b);
    if (root !== null) roots.push(root);
  }
  for (const seed of seeds) {
    const root = newtonSafeguarded(seed);
    if (root !== null) roots.push(root);
  }

  return uniqueByTolerance(roots);
}
