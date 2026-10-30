"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ShirtCloth, type Quality } from "@/three/cloth";
import { knitNormal, paintShirt, ribNormal, shade } from "@/three/textures";
import type { SpinController } from "@/three/controller";
import type { Colorway, PrintStyle } from "@/lib/products";

interface Props {
  print: PrintStyle;
  colorway: Colorway;
  controller: SpinController;
  quality?: Quality;
  shadows?: boolean;
  onReady?: () => void;
}

export function Shirt({ print, colorway, controller, quality = "high", shadows = false, onReady }: Props) {
  const cloth = useMemo(() => new ShirtCloth(quality), [quality]);
  const geometry = useMemo(() => cloth.createGeometry(), [cloth]);
  const collarGeo = useMemo(() => {
    const ring = cloth.neckRing().map((p) => new THREE.Vector3(p.x * 1.035, p.y + 0.004, p.z * 1.035));
    const curve = new THREE.CatmullRomCurve3(ring, true, "centripetal");
    return new THREE.TubeGeometry(curve, 160, 0.0115, 12, true);
  }, [cloth]);

  const material = useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.97,
      metalness: 0,
      sheen: 0.7,
      sheenRoughness: 0.75,
      side: THREE.DoubleSide,
      normalMap: knitNormal(),
      normalScale: new THREE.Vector2(0.42, 0.42),
    });
    // inside of the garment: plain fabric (no print showing through), in its own shadow
    const uInside = { value: new THREE.Color("#222222") };
    m.userData.uInside = uInside;
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uInside = uInside;
      shader.fragmentShader =
        "uniform vec3 uInside;\n" +
        shader.fragmentShader
          .replace("#include <map_fragment>", "#include <map_fragment>\n  if (!gl_FrontFacing) diffuseColor.rgb = uInside;")
          .replace("#include <dithering_fragment>", "#include <dithering_fragment>\n  if (!gl_FrontFacing) gl_FragColor.rgb *= 0.42;");
    };
    return m;
  }, []);

  const collarMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        roughness: 0.97,
        sheen: 0.7,
        sheenRoughness: 0.75,
        normalMap: ribNormal(),
        normalScale: new THREE.Vector2(0.9, 0.9),
      }),
    [],
  );

  const [ready, setReady] = useState(false);
  const collar = useRef<THREE.Mesh>(null);
  const readyCb = useRef(onReady);
  readyCb.current = onReady;

  useEffect(() => {
    let alive = true;
    paintShirt(print, colorway, quality).then((tex) => {
      if (!alive) {
        tex.dispose();
        return;
      }
      const old = material.map;
      material.map = tex;
      material.sheenColor.set(shade(colorway.fabric, 0.3));
      (material.userData.uInside as { value: THREE.Color } | undefined)?.value.set(shade(colorway.fabric, -0.1));
      material.needsUpdate = true;
      collarMat.color.set(shade(colorway.fabric, -0.06));
      collarMat.sheenColor.set(shade(colorway.fabric, 0.4));
      old?.dispose();
      setReady(true);
      readyCb.current?.();
    });
    return () => {
      alive = false;
    };
  }, [print, colorway, quality, material, collarMat]);

  useEffect(
    () => () => {
      geometry.dispose();
      collarGeo.dispose();
      material.map?.dispose();
      material.dispose();
      collarMat.dispose();
    },
    [geometry, collarGeo, material, collarMat],
  );

  useFrame((_, dt) => {
    controller.update(dt);
    cloth.windBoost += (controller.hover - cloth.windBoost) * Math.min(1, dt * 3);
    cloth.step(dt, controller.yaw);
    cloth.writeGeometry(geometry);
    if (collar.current) {
      collar.current.rotation.y = controller.yaw;
      collar.current.position.y = cloth.bob;
    }
  });

  return (
    <group visible={ready}>
      <mesh geometry={geometry} material={material} castShadow={shadows} receiveShadow={shadows} frustumCulled={false} />
      <mesh ref={collar} geometry={collarGeo} material={collarMat} castShadow={shadows} />
    </group>
  );
}
