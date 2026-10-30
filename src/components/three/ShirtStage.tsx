"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Shirt } from "./Shirt";
import type { SpinController } from "@/three/controller";
import type { Colorway, PrintStyle } from "@/lib/products";

export type StageMode = "hero" | "product" | "card";

interface Props {
  print: PrintStyle;
  colorway: Colorway;
  controller: SpinController;
  mode: StageMode;
  className?: string;
  style?: CSSProperties;
  onReady?: () => void;
}

function CameraRig({ controller, distance, height }: { controller: SpinController; distance: number; height: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    const p = controller.pitch;
    // keep the full sleeve span in frame on narrow (portrait) stages
    const aspect = size.width / Math.max(1, size.height);
    const fitWidth = 0.56 / (Math.tan(((28 / 2) * Math.PI) / 180) * aspect);
    const R = Math.max(distance, fitWidth) / controller.zoom;
    camera.position.set(0, height + Math.sin(p) * R, Math.cos(p) * R);
    camera.lookAt(0, height, 0);
  });
  return null;
}

/**
 * Lighting follows the brand colour story: a warm bone key (clarity), a cool steel
 * fill/rim (doubt) and an ember rim (confidence) — complementary blue/orange contrast.
 */
function Lights({ shadows }: { shadows: boolean }) {
  return (
    <>
      <ambientLight intensity={0.22} color="#b8c3cc" />
      <directionalLight
        position={[-1.4, 2.4, 2.4]}
        intensity={2.9}
        color="#fff0df"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-camera-left={-0.8}
        shadow-camera-right={0.8}
        shadow-camera-top={0.8}
        shadow-camera-bottom={-0.8}
        shadow-camera-near={0.5}
        shadow-camera-far={7}
      />
      <directionalLight position={[2.3, 0.9, -2.1]} intensity={1.35} color="#ff5a26" />
      <directionalLight position={[-2.5, 0.5, -1.6]} intensity={1.0} color="#7895ad" />
      <directionalLight position={[0, -2.5, 1.2]} intensity={0.35} color="#ffe6d2" />
      <directionalLight position={[1.6, 0.6, 2.6]} intensity={0.6} color="#ffe9d8" />
      <Environment resolution={128} frames={1} environmentIntensity={0.4}>
        <Lightformer form="rect" intensity={2.2} color="#fff3e6" position={[0, 2.5, 2]} scale={[4, 1.4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#ff5a26" position={[3, 0.5, -1.5]} scale={[1, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color="#7895ad" position={[-3, 0.3, -1]} scale={[1, 3, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, -3, 0]} scale={2} target={[0, 0, 0]} />
      </Environment>
    </>
  );
}

export function ShirtStage({ print, colorway, controller, mode, className, style, onReady }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const interactive = mode !== "card";
  const allowPitch = mode === "product";
  const hiQ = mode !== "card";

  // pause rendering when off-screen
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "120px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // pointer: drag to spin (and tilt on product pages)
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    let last = { x: 0, y: 0, t: 0 };
    let id = -1;
    const down = (e: PointerEvent) => {
      if (!interactive || e.button !== 0) return;
      id = e.pointerId;
      el.setPointerCapture(id);
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      controller.begin();
      el.dataset.dragging = "true";
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const now = performance.now();
      controller.drag(e.clientX - last.x, e.clientY - last.y, (now - last.t) / 1000, allowPitch);
      last = { x: e.clientX, y: e.clientY, t: now };
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      controller.end();
      delete el.dataset.dragging;
    };
    const enter = () => {
      controller.hover = 1;
      if (mode === "card") controller.impulse(3.8);
    };
    const leave = () => {
      controller.hover = 0;
    };
    const dbl = () => {
      if (mode === "product") controller.zoomTarget = controller.zoomTarget > 1.2 ? 1 : 1.55;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("dblclick", dbl);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
      el.removeEventListener("dblclick", dbl);
    };
  }, [controller, interactive, allowPitch, mode]);

  const distance = mode === "card" ? 2.35 : mode === "hero" ? 2.55 : 2.45;

  return (
    <div
      ref={wrap}
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        touchAction: mode === "product" ? "none" : "pan-y",
        cursor: interactive ? "grab" : "pointer",
        ...style,
      }}
      data-cursor={interactive ? "drag" : "view"}
    >
      <Canvas
        frameloop={visible ? "always" : "never"}
        dpr={mode === "card" ? [1, 1.5] : [1, 1.8]}
        shadows={hiQ}
        camera={{ fov: 28, near: 0.1, far: 20, position: [0, 0, distance] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <CameraRig controller={controller} distance={distance} height={-0.02} />
        <Lights shadows={hiQ} />
        <Shirt print={print} colorway={colorway} controller={controller} quality={hiQ ? "high" : "low"} shadows={hiQ} onReady={onReady} />
        {mode !== "card" && <ContactShadows position={[0, -0.55, 0]} opacity={0.55} scale={2.4} blur={2.6} far={1.1} resolution={512} color="#000000" />}
      </Canvas>
    </div>
  );
}
