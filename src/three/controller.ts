/**
 * Drives the mannequin rotation (yaw) with momentum + springs, and the camera
 * elevation (pitch) so you can look at the garment from the top and from below.
 */
export type View = "front" | "back" | "side" | "top" | "bottom";

const TAU = Math.PI * 2;

export class SpinController {
  yaw = 0;
  vel = 0;
  pitch = 0.05;
  pitchTarget = 0.05;
  dragging = false;
  autoSpeed = 0.32;
  idle = 10;
  hover = 0; // 0..1 → extra breeze on the fabric
  zoom = 1;
  zoomTarget = 1;
  private target: number | null = null;
  private velSample = 0;

  constructor(opts: { autoSpeed?: number; yaw?: number } = {}) {
    if (opts.autoSpeed !== undefined) this.autoSpeed = opts.autoSpeed;
    if (opts.yaw !== undefined) this.yaw = opts.yaw;
  }

  update(dt: number) {
    dt = Math.min(dt, 1 / 20);
    this.idle += dt;
    if (this.dragging) {
      this.vel += (this.velSample - this.vel) * (1 - Math.exp(-dt * 18));
      this.velSample *= Math.exp(-dt * 10);
    } else if (this.target !== null) {
      // underdamped spring → the garment swings a little when it lands on a view
      const acc = 55 * (this.target - this.yaw) - 9 * this.vel;
      this.vel += acc * dt;
      this.yaw += this.vel * dt;
    } else {
      const auto = this.idle > 2.2 ? this.autoSpeed : 0;
      this.vel += (auto - this.vel) * (1 - Math.exp(-dt * 1.3));
      this.yaw += this.vel * dt;
    }
    this.vel = Math.max(-10, Math.min(10, this.vel));
    this.pitch += (this.pitchTarget - this.pitch) * (1 - Math.exp(-dt * 5));
    this.zoom += (this.zoomTarget - this.zoom) * (1 - Math.exp(-dt * 6));
  }

  /** drag by pixels */
  drag(dx: number, dy: number, dt: number, allowPitch: boolean) {
    this.idle = 0;
    this.target = null;
    const d = dx * 0.0095;
    this.yaw += d;
    if (dt > 0) this.velSample = d / dt;
    if (allowPitch) this.pitchTarget = Math.max(-1.35, Math.min(1.35, this.pitchTarget + dy * 0.006));
  }

  begin() {
    this.dragging = true;
    this.target = null;
    this.idle = 0;
  }

  end() {
    this.dragging = false;
    this.idle = 0;
  }

  /** a "swish": raises the spin speed to v (never stacks into a runaway spin) */
  impulse(v: number) {
    this.target = null;
    this.idle = 0;
    if (Math.sign(this.vel) === Math.sign(v)) this.vel = Math.sign(v) * Math.max(Math.abs(this.vel), Math.abs(v));
    else this.vel = v;
  }

  goTo(view: View) {
    this.idle = 0;
    const want = view === "back" ? Math.PI : view === "side" ? -Math.PI / 2 : 0;
    // nearest equivalent angle so it spins the short way
    const k = Math.round((this.yaw - want) / TAU);
    this.target = want + k * TAU;
    this.pitchTarget = view === "top" ? 1.3 : view === "bottom" ? -1.3 : 0.05;
  }

  release() {
    this.target = null;
  }

  get rpm() {
    return Math.abs((this.vel * 60) / TAU);
  }
}
