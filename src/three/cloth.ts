import * as THREE from "three";

/**
 * Real-time T-shirt cloth simulation.
 *
 * The shirt is a tube of particles (body) with two sewn-on sleeve tubes.
 * The neck/shoulder rows are pinned to an invisible "ghost mannequin" rig that the
 * user spins; everything below hangs under gravity, collides with the mannequin's
 * torso and arms, and lags / flares / swings from inertia (Verlet integration +
 * position-based distance constraints + long-range tethers so it never over-stretches).
 */

export type Quality = "high" | "low";

const TAU = Math.PI * 2;
const H = 1 / 90; // fixed simulation step
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

// --- garment pattern (metres, shirt-local space: +Y up, +Z = front) ----------------
const NECK_Y = 0.335;
const NECK_A = 0.088;
const NECK_B = 0.08;
const FRONT_DROP = 0.05;
const BACK_DROP = 0.008;
const SHOULDER_Y_SIDE = 0.3;
const SHOULDER_DIP = 0.055;
const SHOULDER_A = 0.235;
const BODY_B = 0.132;
const BODY_N = 2.6;
const HEM_Y = -0.42;

const SLEEVE_ROOT_X = 0.235;
const SLEEVE_ROOT_Y = 0.207;
const SLEEVE_LEN = 0.25;
const SLEEVE_R0 = 0.106;
const SLEEVE_R1 = 0.09;
// armhole: a vertical seam sitting on the side of the body
const ARMHOLE_HALF_H = 0.1;
const ARMHOLE_HALF_D = 0.108;
const SLEEVE_DIR = new THREE.Vector2(0.783, -0.622).normalize();

// ghost mannequin torso: [y, halfWidth, halfDepth]
const TORSO: [number, number, number][] = [
  [0.3, 0.17, 0.1],
  [0.22, 0.205, 0.114],
  [0.1, 0.196, 0.117],
  [-0.05, 0.178, 0.108],
  [-0.18, 0.168, 0.102],
  [-0.32, 0.178, 0.107],
  [-0.48, 0.188, 0.11],
];
const ARM_R = 0.05;
const SLEEVE_MEMORY = 0.035;

function superEllipse(theta: number, a: number, b: number, n: number): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const e = 2 / n;
  return [a * Math.sign(c) * Math.pow(Math.abs(c), e), b * Math.sign(s) * Math.pow(Math.abs(s), e)];
}

/** θ values giving equal arc-length spacing around the body cross-section. */
function thetaTable(N: number) {
  const M = 4096;
  const th = new Float64Array(M + 1);
  const cum = new Float64Array(M + 1);
  let px = 0;
  let pz = 0;
  for (let k = 0; k <= M; k++) {
    const t = -Math.PI / 2 - (k / M) * TAU;
    th[k] = t;
    const [x, z] = superEllipse(t, 0.25, 0.135, BODY_N);
    if (k > 0) cum[k] = cum[k - 1] + Math.hypot(x - px, z - pz);
    px = x;
    pz = z;
  }
  const total = cum[M];
  const out = new Float64Array(N);
  let k = 0;
  for (let i = 0; i < N; i++) {
    const target = (i / N) * total;
    while (k < M && cum[k + 1] < target) k++;
    const f = (target - cum[k]) / Math.max(1e-9, cum[k + 1] - cum[k]);
    out[i] = lerp(th[k], th[k + 1], f);
  }
  return { thetas: out, perimeter: total };
}

function bodyPoint(theta: number, j: number, Jr: number, J: number, out: THREE.Vector3) {
  const s = Math.sin(theta);
  const front = Math.max(0, s);
  const back = Math.max(0, -s);
  const neckY = NECK_Y - FRONT_DROP * front * front - BACK_DROP * back * back;
  const shY = SHOULDER_Y_SIDE - SHOULDER_DIP * s * s;
  let a: number, b: number, n: number, y: number;
  if (j <= Jr) {
    const t = j / Jr;
    a = lerp(NECK_A, SHOULDER_A, t);
    b = lerp(NECK_B, BODY_B, t);
    n = lerp(2.0, BODY_N, t);
    y = lerp(neckY, shY, t) + 0.014 * Math.sin(Math.PI * t);
  } else {
    const t = (j - Jr) / (J - 1 - Jr);
    const open = smooth(clamp01(t / 0.16));
    a = SHOULDER_A + 0.018 * open + 0.008 * t;
    b = BODY_B + 0.006 * open;
    n = BODY_N;
    y = lerp(shY, HEM_Y, t);
  }
  const [x, z] = superEllipse(theta, a, b, n);
  return out.set(x, y, z);
}

function sleeveFrame(side: 1 | -1) {
  const C = new THREE.Vector3(side * SLEEVE_ROOT_X, SLEEVE_ROOT_Y, 0);
  const D = new THREE.Vector3(side * SLEEVE_DIR.x, SLEEVE_DIR.y, 0);
  const e1 = new THREE.Vector3(0, 0, 1);
  const e2 = new THREE.Vector3(side * D.y, -side * D.x, 0); // points under the arm, into the body
  return { C, D, e1, e2 };
}

/** x of the body's rest surface at height y and depth z (so the sleeve is sewn exactly onto it) */
function bodySurfaceX(y: number, z: number) {
  const t = clamp01((SHOULDER_Y_SIDE - y) / (SHOULDER_Y_SIDE - HEM_Y));
  const open = smooth(clamp01(t / 0.16));
  const a = SHOULDER_A + 0.018 * open + 0.008 * t;
  const b = BODY_B + 0.006 * open;
  const q = 1 - Math.pow(Math.min(1, Math.abs(z) / b), BODY_N);
  return a * Math.pow(Math.max(0, q), 1 / BODY_N);
}

const _perp = new THREE.Vector3();
function sleevePoint(side: 1 | -1, phi: number, t: number, out: THREE.Vector3) {
  // root ring: follows the armhole seam on the body
  const z = Math.sin(phi) * ARMHOLE_HALF_D;
  const y = SLEEVE_ROOT_Y - Math.cos(phi) * ARMHOLE_HALF_H;
  out.set(side * (bodySurfaceX(Math.min(y, SHOULDER_Y_SIDE), z) + 0.003), y, z);
  if (t <= 0) return out;
  // tube ring perpendicular to the arm, blended in as we move away from the seam
  const { C, D, e1, e2 } = sleeveFrame(side);
  const r = lerp(SLEEVE_R0, SLEEVE_R1, t);
  _perp
    .copy(C)
    .addScaledVector(D, t * SLEEVE_LEN)
    .addScaledVector(e2, Math.cos(phi) * r * 0.95)
    .addScaledVector(e1, Math.sin(phi) * r);
  return out.lerp(_perp, smooth(Math.min(1, t * 2.2)));
}

/** Texture layout shared with the print painter (all fractions of a square texture). */
export const SHIRT_LAYOUT = (() => {
  const { thetas, perimeter } = thetaTable(256);
  // arc length down the front centre, neck → hem
  const J = 80;
  const Jr = 12;
  const front = thetas[128];
  const p = new THREE.Vector3();
  const q = new THREE.Vector3();
  let len = 0;
  bodyPoint(front, 0, Jr, J, q);
  for (let j = 1; j < J; j++) {
    bodyPoint(front, j, Jr, J, p);
    len += p.distanceTo(q);
    q.copy(p);
  }
  const sleeveCirc = TAU * ((SLEEVE_R0 + SLEEVE_R1) / 2) * 0.975;
  return {
    /** metres of fabric across the full texture width (body) */
    perimeter,
    /** front length neck→hem in metres */
    frontLength: len,
    /** body occupies [0, bodyH] of texture height (top-down) */
    bodyH: len / perimeter,
    /** sleeves occupy [sleeveY0, sleeveY0 + sleeveH], left half = left sleeve, right half = right */
    sleeveY0: 0.69,
    sleeveH: (SLEEVE_LEN / sleeveCirc) * 0.5,
    sleeveCirc,
    sleeveLen: SLEEVE_LEN,
  };
})();

interface Part {
  start: number; // first particle
  cols: number;
  rows: number;
  renderStart: number; // first render vertex
}

export class ShirtCloth {
  readonly count: number;
  pos: Float32Array;
  prev: Float32Array;
  rest: Float32Array; // shirt-local rest positions
  invMass: Float32Array;
  pinned: Int32Array;
  isSleeve: Uint8Array; // 0 body, 1 right sleeve, 2 left sleeve
  cons: Int32Array;
  consLen: Float32Array;
  consK: Float32Array;
  tether: Int32Array; // [particle, anchor]
  tetherLen: Float32Array;
  body: Part;
  sleeves: Part[];
  renderCount: number;
  iterations: number;

  yaw = 0;
  bob = 0;
  windBoost = 0;
  private lastYaw = 0;
  private acc = 0;
  private time = 0;

  constructor(quality: Quality = "high") {
    const hi = quality === "high";
    const N = hi ? 56 : 36;
    const Jr = hi ? 6 : 4;
    const J = hi ? 32 : 20;
    const M = hi ? 24 : 16;
    const K = hi ? 8 : 6;
    this.iterations = hi ? 6 : 5;

    const { thetas } = thetaTable(N);
    const bodyCount = N * J;
    const sleeveCount = M * K;
    this.count = bodyCount + sleeveCount * 2;
    this.pos = new Float32Array(this.count * 3);
    this.prev = new Float32Array(this.count * 3);
    this.rest = new Float32Array(this.count * 3);
    this.invMass = new Float32Array(this.count).fill(1);
    this.isSleeve = new Uint8Array(this.count);

    this.body = { start: 0, cols: N, rows: J, renderStart: 0 };
    this.sleeves = [
      { start: bodyCount, cols: M, rows: K, renderStart: (N + 1) * J },
      { start: bodyCount + sleeveCount, cols: M, rows: K, renderStart: (N + 1) * J + (M + 1) * K },
    ];
    this.renderCount = (N + 1) * J + (M + 1) * K * 2;

    const v = new THREE.Vector3();
    const pinned: number[] = [];
    // body particles
    for (let j = 0; j < J; j++) {
      for (let i = 0; i < N; i++) {
        const id = j * N + i;
        bodyPoint(thetas[i], j, Jr, J, v);
        this.rest.set([v.x, v.y, v.z], id * 3);
        if (j <= Jr) {
          this.invMass[id] = 0;
          pinned.push(id);
        }
      }
    }
    // sleeves
    this.sleeves.forEach((part, si) => {
      const side: 1 | -1 = si === 0 ? 1 : -1;
      for (let k = 0; k < K; k++) {
        for (let m = 0; m < M; m++) {
          const id = part.start + k * M + m;
          sleevePoint(side, (m / M) * TAU, k / (K - 1), v);
          this.rest.set([v.x, v.y, v.z], id * 3);
          this.isSleeve[id] = si + 1;
          if (k === 0) {
            this.invMass[id] = 0;
            pinned.push(id);
          } else if (k === 1) {
            this.invMass[id] = 0.35; // heavier near the seam: holds the sleeve's shape
          }
        }
      }
    });
    this.pinned = Int32Array.from(pinned);
    this.pos.set(this.rest);
    this.prev.set(this.rest);

    // constraints, ordered top → bottom so Gauss–Seidel propagates from the pins
    const cons: number[] = [];
    const ks: number[] = [];
    const add = (a: number, b: number, k: number) => {
      if (this.invMass[a] === 0 && this.invMass[b] === 0) return;
      cons.push(a, b);
      ks.push(k);
    };
    const grid = (start: number, cols: number, rows: number, sStruct: number, sShear: number, sBend: number) => {
      const id = (c: number, r: number) => start + r * cols + (((c % cols) + cols) % cols);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          add(id(c, r), id(c + 1, r), sStruct);
          if (r + 1 < rows) {
            add(id(c, r), id(c, r + 1), sStruct);
            if (sShear > 0) {
              add(id(c, r), id(c + 1, r + 1), sShear);
              add(id(c + 1, r), id(c, r + 1), sShear);
            }
          }
          add(id(c, r), id(c + 2, r), sBend);
          if (r + 2 < rows) add(id(c, r), id(c, r + 2), sBend);
        }
      }
    };
    grid(0, N, J, 1, 0, 0.32);
    this.sleeves.forEach((p) => grid(p.start, M, K, 1, 0.75, 0.6));

    this.cons = Int32Array.from(cons);
    this.consK = Float32Array.from(ks);
    this.consLen = new Float32Array(ks.length);
    for (let c = 0; c < ks.length; c++) {
      const a = cons[c * 2] * 3;
      const b = cons[c * 2 + 1] * 3;
      this.consLen[c] = Math.hypot(this.rest[a] - this.rest[b], this.rest[a + 1] - this.rest[b + 1], this.rest[a + 2] - this.rest[b + 2]);
    }

    // long-range tethers: each free particle can't drift further than its rest
    // path length from the pinned seam above it (kills the "rubber shirt" stretch)
    const tet: number[] = [];
    const tetLen: number[] = [];
    const dist = (a: number, b: number) =>
      Math.hypot(this.rest[a * 3] - this.rest[b * 3], this.rest[a * 3 + 1] - this.rest[b * 3 + 1], this.rest[a * 3 + 2] - this.rest[b * 3 + 2]);
    for (let i = 0; i < N; i++) {
      let L = 0;
      for (let j = Jr + 1; j < J; j++) {
        L += dist(j * N + i, (j - 1) * N + i);
        tet.push(j * N + i, Jr * N + i);
        tetLen.push(L * 1.02);
      }
    }
    this.sleeves.forEach((p) => {
      for (let m = 0; m < M; m++) {
        let L = 0;
        for (let k = 1; k < K; k++) {
          L += dist(p.start + k * M + m, p.start + (k - 1) * M + m);
          tet.push(p.start + k * M + m, p.start + m);
          tetLen.push(L * 1.03);
        }
      }
    });
    this.tether = Int32Array.from(tet);
    this.tetherLen = Float32Array.from(tetLen);

    // let it settle so the first frame already hangs naturally
    for (let s = 0; s < 90; s++) this.substep(H, 0, 0);
  }

  /** advance the simulation; yaw is the mannequin's rotation (radians) */
  step(dt: number, yaw: number) {
    dt = Math.min(dt, 1 / 20);
    this.acc += dt;
    const h = H;
    const steps = Math.floor(this.acc / h);
    this.acc -= steps * h;
    for (let s = 0; s < steps; s++) {
      this.time += h;
      const y = lerp(this.lastYaw, yaw, (s + 1) / steps);
      this.substep(h, y, Math.sin(this.time * 1.15) * 0.008);
    }
    if (steps > 0) this.lastYaw = yaw;
    this.yaw = yaw;
  }

  private substep(h: number, yaw: number, bob: number) {
    const { pos, prev, rest, invMass } = this;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    this.bob = bob;

    // 1. pinned seam follows the rig
    for (let p = 0; p < this.pinned.length; p++) {
      const i3 = this.pinned[p] * 3;
      const lx = rest[i3];
      const lz = rest[i3 + 2];
      prev[i3] = pos[i3];
      prev[i3 + 1] = pos[i3 + 1];
      prev[i3 + 2] = pos[i3 + 2];
      pos[i3] = lx * c + lz * s;
      pos[i3 + 1] = rest[i3 + 1] + bob;
      pos[i3 + 2] = -lx * s + lz * c;
    }

    // 2. verlet integrate free particles (gravity + soft breeze)
    const t = this.time;
    const h2 = h * h;
    const damp = 0.991;
    const windAmp = 0.35 + this.windBoost * 2.2;
    const wx = Math.sin(t * 0.63) * windAmp * 0.5;
    const wz = (Math.cos(t * 0.41) * 0.6 + 0.2) * windAmp;
    for (let i = 0; i < this.count; i++) {
      if (invMass[i] === 0) continue;
      const i3 = i * 3;
      const x = pos[i3];
      const y = pos[i3 + 1];
      const z = pos[i3 + 2];
      const gust = 0.55 + 0.45 * Math.sin(x * 9 + y * 6 + t * 2.3);
      pos[i3] = x + (x - prev[i3]) * damp + wx * gust * h2;
      pos[i3 + 1] = y + (y - prev[i3 + 1]) * damp - 9.81 * h2;
      pos[i3 + 2] = z + (z - prev[i3 + 2]) * damp + wz * gust * h2;
      prev[i3] = x;
      prev[i3 + 1] = y;
      prev[i3 + 2] = z;
    }

    // 2b. heavyweight sleeves have "memory": a soft pull back toward their sewn shape,
    // so they swing out under momentum but never collapse or slip off the arms
    for (let i = this.sleeves[0].start; i < this.count; i++) {
      if (invMass[i] === 0) continue;
      const i3 = i * 3;
      const lx = rest[i3];
      const lz = rest[i3 + 2];
      const k = SLEEVE_MEMORY;
      pos[i3] += (lx * c + lz * s - pos[i3]) * k;
      pos[i3 + 1] += (rest[i3 + 1] + bob - pos[i3 + 1]) * k;
      pos[i3 + 2] += (-lx * s + lz * c - pos[i3 + 2]) * k;
    }

    // 3. constraints
    const { cons, consLen, consK } = this;
    const nc = consK.length;
    for (let it = 0; it < this.iterations; it++) {
      for (let k = 0; k < nc; k++) {
        const a = cons[k * 2];
        const b = cons[k * 2 + 1];
        const wa = invMass[a];
        const wb = invMass[b];
        const a3 = a * 3;
        const b3 = b * 3;
        const dx = pos[b3] - pos[a3];
        const dy = pos[b3 + 1] - pos[a3 + 1];
        const dz = pos[b3 + 2] - pos[a3 + 2];
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        let diff = (d - consLen[k]) / d;
        // cloth buckles easily but barely stretches
        diff *= diff < 0 ? consK[k] * 0.55 : consK[k];
        const ws = wa + wb;
        const fa = (diff * wa) / ws;
        const fb = (diff * wb) / ws;
        pos[a3] += dx * fa;
        pos[a3 + 1] += dy * fa;
        pos[a3 + 2] += dz * fa;
        pos[b3] -= dx * fb;
        pos[b3 + 1] -= dy * fb;
        pos[b3 + 2] -= dz * fb;
      }
      if (it === (this.iterations >> 1) || it === this.iterations - 1) {
        this.solveTethers();
        this.collide(c, s, bob, it === this.iterations - 1);
      }
    }
  }

  private solveTethers() {
    const { pos, tether, tetherLen } = this;
    for (let k = 0; k < tetherLen.length; k++) {
      const p3 = tether[k * 2] * 3;
      const a3 = tether[k * 2 + 1] * 3;
      const dx = pos[p3] - pos[a3];
      const dy = pos[p3 + 1] - pos[a3 + 1];
      const dz = pos[p3 + 2] - pos[a3 + 2];
      const d2 = dx * dx + dy * dy + dz * dz;
      const L = tetherLen[k];
      if (d2 > L * L) {
        const f = L / Math.sqrt(d2);
        pos[p3] = pos[a3] + dx * f;
        pos[p3 + 1] = pos[a3 + 1] + dy * f;
        pos[p3 + 2] = pos[a3 + 2] + dz * f;
      }
    }
  }

  private collide(c: number, s: number, bob: number, friction: boolean) {
    const { pos, prev, invMass, isSleeve } = this;
    const top = TORSO[0][0];
    const bottom = TORSO[TORSO.length - 1][0];
    for (let i = 0; i < this.count; i++) {
      if (invMass[i] === 0) continue;
      const i3 = i * 3;
      const wx = pos[i3];
      const wy = pos[i3 + 1] - bob;
      const wz = pos[i3 + 2];
      // into mannequin-local space
      let lx = wx * c - wz * s;
      let ly = wy;
      let lz = wx * s + wz * c;
      let hit = false;
      const sl = isSleeve[i];
      if (sl === 0) {
        if (ly < top && ly > bottom) {
          let seg = 0;
          while (seg < TORSO.length - 2 && TORSO[seg + 1][0] > ly) seg++;
          const [y0, a0, b0] = TORSO[seg];
          const [y1, a1, b1] = TORSO[seg + 1];
          const f = (ly - y0) / (y1 - y0);
          const A = lerp(a0, a1, f);
          const B = lerp(b0, b1, f);
          const q = (lx / A) * (lx / A) + (lz / B) * (lz / B);
          if (q < 1) {
            if (q < 1e-6) {
              lz = B;
            } else {
              const k = 1 / Math.sqrt(q);
              lx *= k;
              lz *= k;
            }
            hit = true;
          }
        }
      } else {
        // arm capsule along the sleeve axis
        const side = sl === 1 ? 1 : -1;
        const ax = side * SLEEVE_ROOT_X + side * SLEEVE_DIR.x * 0.03;
        const ay = SLEEVE_ROOT_Y + SLEEVE_DIR.y * 0.03;
        const dx = side * SLEEVE_DIR.x;
        const dy = SLEEVE_DIR.y;
        const len = 0.42;
        let tt = (lx - ax) * dx + (ly - ay) * dy;
        tt = tt < 0 ? 0 : tt > len ? len : tt;
        const qx = ax + dx * tt;
        const qy = ay + dy * tt;
        const ex = lx - qx;
        const ey = ly - qy;
        const d2 = ex * ex + ey * ey + lz * lz;
        if (d2 < ARM_R * ARM_R) {
          const d = Math.sqrt(d2) || 1e-6;
          const k = ARM_R / d;
          lx = qx + ex * k;
          ly = qy + ey * k;
          lz = lz * k;
          hit = true;
        }
      }
      if (hit) {
        pos[i3] = lx * c + lz * s;
        pos[i3 + 1] = ly + bob;
        pos[i3 + 2] = -lx * s + lz * c;
        if (friction) {
          prev[i3] += (pos[i3] - prev[i3]) * 0.12;
          prev[i3 + 1] += (pos[i3 + 1] - prev[i3 + 1]) * 0.12;
          prev[i3 + 2] += (pos[i3 + 2] - prev[i3 + 2]) * 0.12;
        }
      }
    }
  }

  // --- rendering ----------------------------------------------------------------------

  createGeometry() {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(this.renderCount * 3);
    const uvs = new Float32Array(this.renderCount * 2);
    const index: number[] = [];
    const L = SHIRT_LAYOUT;

    // body uv: u around (back seam at 0/1), v by arc length down the front centre
    const { cols: N, rows: J } = this.body;
    const frontCol = N / 2;
    const rowV = new Float32Array(J);
    for (let j = 1; j < J; j++) {
      const a = ((j - 1) * N + frontCol) * 3;
      const b = (j * N + frontCol) * 3;
      rowV[j] = rowV[j - 1] + Math.hypot(this.rest[a] - this.rest[b], this.rest[a + 1] - this.rest[b + 1], this.rest[a + 2] - this.rest[b + 2]);
    }
    const scale = L.bodyH / rowV[J - 1];
    for (let j = 0; j < J; j++) {
      for (let i = 0; i <= N; i++) {
        const r = j * (N + 1) + i;
        uvs[r * 2] = i / N;
        uvs[r * 2 + 1] = 1 - rowV[j] * scale;
      }
    }
    this.sleeves.forEach((p, si) => {
      const x0 = si === 0 ? 0.5 : 0; // right sleeve → right half of the texture
      for (let k = 0; k < p.rows; k++) {
        for (let m = 0; m <= p.cols; m++) {
          const r = p.renderStart + k * (p.cols + 1) + m;
          uvs[r * 2] = x0 + (m / p.cols) * 0.5;
          uvs[r * 2 + 1] = 1 - (L.sleeveY0 + (k / (p.rows - 1)) * L.sleeveH);
        }
      }
    });

    const quads = (renderStart: number, cols: number, rows: number, flip: boolean) => {
      for (let r = 0; r < rows - 1; r++) {
        for (let c = 0; c < cols; c++) {
          const a = renderStart + r * (cols + 1) + c;
          const b = a + (cols + 1);
          const cc = a + 1;
          const d = b + 1;
          if (flip) index.push(a, cc, b, cc, d, b);
          else index.push(a, b, cc, cc, b, d);
        }
      }
    };
    // decide winding per part so outer faces are front faces
    const outward = (part: Part, centre: (x: number, y: number, z: number) => THREE.Vector3) => {
      const a = (part.start + part.cols + 1) * 3; // (c=1, r=1)
      const b = a + part.cols * 3; // r+1
      const c = a + 3; // c+1
      const A = new THREE.Vector3(this.rest[a], this.rest[a + 1], this.rest[a + 2]);
      const B = new THREE.Vector3(this.rest[b], this.rest[b + 1], this.rest[b + 2]);
      const C = new THREE.Vector3(this.rest[c], this.rest[c + 1], this.rest[c + 2]);
      const n = B.clone().sub(A).cross(C.clone().sub(A));
      return n.dot(A.clone().sub(centre(A.x, A.y, A.z))) > 0;
    };
    quads(0, N, J, !outward(this.body, (_x, y) => new THREE.Vector3(0, y, 0)));
    this.sleeves.forEach((p, si) => {
      const side = si === 0 ? 1 : -1;
      const { C, D } = sleeveFrame(side);
      const ok = outward(p, (x, y, z) => {
        const P = new THREE.Vector3(x, y, z);
        const t = P.clone().sub(C).dot(D);
        return C.clone().addScaledVector(D, t);
      });
      quads(p.renderStart, p.cols, p.rows, !ok);
    });

    geom.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
    geom.setIndex(index);
    this.writeGeometry(geom);
    geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.2);
    return geom;
  }

  writeGeometry(geom: THREE.BufferGeometry) {
    const P = geom.attributes.position.array as Float32Array;
    const copyPart = (part: Part) => {
      const { start, cols, rows, renderStart } = part;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c <= cols; c++) {
          const src = (start + r * cols + (c % cols)) * 3;
          const dst = (renderStart + r * (cols + 1) + c) * 3;
          P[dst] = this.pos[src];
          P[dst + 1] = this.pos[src + 1];
          P[dst + 2] = this.pos[src + 2];
        }
      }
    };
    copyPart(this.body);
    this.sleeves.forEach(copyPart);
    geom.attributes.position.needsUpdate = true;
    geom.computeVertexNormals();
    // weld normals across the wrap seam
    const Nrm = geom.attributes.normal.array as Float32Array;
    const weld = (part: Part) => {
      for (let r = 0; r < part.rows; r++) {
        const a = (part.renderStart + r * (part.cols + 1)) * 3;
        const b = a + part.cols * 3;
        for (let k = 0; k < 3; k++) {
          const m = (Nrm[a + k] + Nrm[b + k]) * 0.5;
          Nrm[a + k] = m;
          Nrm[b + k] = m;
        }
      }
    };
    weld(this.body);
    this.sleeves.forEach(weld);
    geom.attributes.normal.needsUpdate = true;
  }

  /** neck ring (shirt-local), for the rib collar mesh */
  neckRing() {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < this.body.cols; i++) {
      pts.push(new THREE.Vector3(this.rest[i * 3], this.rest[i * 3 + 1], this.rest[i * 3 + 2]));
    }
    return pts;
  }
}
