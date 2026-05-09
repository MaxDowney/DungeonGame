import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DiceExpression } from "../../game/types";

const expressionSides = (dice: DiceExpression[]): number => {
  const sides = dice
    .map((die) => Number(die.match(/d(\d+)/)?.[1] ?? 6))
    .filter(Boolean);
  return sides.includes(20) ? 20 : sides.sort((a, b) => b - a)[0] ?? 6;
};

const d10Geometry = () => {
  const radius = 1.12;
  const poleHeight = 1.2;
  const ringTilt = 0.28;
  const vertices: number[] = [0, poleHeight, 0, 0, -poleHeight, 0];
  const indices: number[] = [];

  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
    const y = index % 2 === 0 ? ringTilt : -ringTilt;
    vertices.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  }

  for (let index = 0; index < 10; index += 1) {
    const current = 2 + index;
    const next = 2 + ((index + 1) % 10);
    indices.push(0, current, 1);
    indices.push(0, 1, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.normalizeNormals();
  return geometry;
};

const geometryFor = (sides: number) => {
  switch (sides) {
    case 3:
      return new THREE.ConeGeometry(1.15, 1.7, 3, 1);
    case 4:
      return new THREE.TetrahedronGeometry(1.28, 0);
    case 8:
      return new THREE.OctahedronGeometry(1.2, 0);
    case 10:
      return d10Geometry();
    case 12:
      return new THREE.DodecahedronGeometry(1.14, 0);
    case 20:
      return new THREE.IcosahedronGeometry(1.18, 0);
    case 6:
    default:
      return new THREE.BoxGeometry(1.62, 1.62, 1.62);
  }
};

const stableRotationFor = (sides: number): [number, number, number] => {
  switch (sides) {
    case 4:
      return [0.42, -0.62, -0.1];
    case 8:
      return [0.58, 0.4, 0.22];
    case 10:
      return [0.32, -0.03, 0.02];
    case 12:
      return [0.46, 0.5, 0.16];
    case 20:
      return [0.52, 0.34, 0.18];
    case 3:
      return [0.52, 0.0, 0.08];
    case 6:
    default:
      return [0.32, -0.44, 0.08];
  }
};

const facePlacementFor = (sides: number) => {
  switch (sides) {
    case 4:
      return { size: [0.9, 0.72] as const, position: [0, 0.04, 1.02] as const, rotation: [-0.28, 0, 0] as const };
    case 8:
      return { size: [0.9, 0.72] as const, position: [0, 0.03, 1.05] as const, rotation: [-0.18, 0, 0] as const };
    case 10:
      return { size: [0.84, 0.66] as const, position: [0, 0.02, 1.08] as const, rotation: [0.02, 0, 0] as const };
    case 12:
      return { size: [0.92, 0.74] as const, position: [0, 0.03, 1.07] as const, rotation: [0.02, 0, 0] as const };
    case 20:
      return { size: [0.84, 0.67] as const, position: [0, 0.03, 1.08] as const, rotation: [-0.07, 0, 0] as const };
    case 3:
      return { size: [0.88, 0.68] as const, position: [0, 0.03, 1.03] as const, rotation: [-0.18, 0, 0] as const };
    case 6:
    default:
      return { size: [1, 0.78] as const, position: [0, 0, 0.818] as const, rotation: [0, 0, 0] as const };
  }
};

const dieColorFor = (tone: "normal" | "critical" | "danger") => {
  if (tone === "danger") return { body: 0x8c1022, edge: 0x22050a, emissive: 0x230006, numeral: "#190507", glint: "#ffc1c1" };
  if (tone === "critical") return { body: 0xd99a2b, edge: 0x3b2305, emissive: 0x2c1700, numeral: "#2f1a04", glint: "#fff0b0" };
  return { body: 0xb76b32, edge: 0x241106, emissive: 0x160803, numeral: "#1f0e05", glint: "#ffe0a6" };
};

const createFaceTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

const drawFaceTexture = (
  texture: THREE.CanvasTexture,
  value: string | number,
  tone: "normal" | "critical" | "danger",
) => {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) return;
  const colors = dieColorFor(tone);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2 + 4);
  context.rotate(-0.035);
  context.font = "900 250px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.globalAlpha = 0.95;
  context.strokeStyle = "rgba(0, 0, 0, .72)";
  context.lineWidth = 38;
  context.strokeText(String(value), 0, 0);
  context.globalAlpha = 0.72;
  context.strokeStyle = "rgba(255, 238, 196, .42)";
  context.lineWidth = 11;
  context.strokeText(String(value), -5, -7);
  context.globalAlpha = 0.9;
  context.fillStyle = colors.numeral;
  context.fillText(String(value), 0, 0);
  context.globalAlpha = 0.42;
  context.fillStyle = colors.glint;
  context.fillText(String(value), -7, -9);
  context.restore();
  texture.needsUpdate = true;
};

export function Dice3D({
  dice,
  value,
  critical,
  danger,
  rolling,
}: {
  dice: DiceExpression[];
  value?: string | number;
  critical?: boolean;
  danger?: boolean;
  rolling?: boolean;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const faceTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const sides = useMemo(() => expressionSides(dice), [dice]);
  const [rollingFace, setRollingFace] = useState<string | number>(value ?? `d${sides}`);

  useEffect(() => {
    if (!rolling) {
      setRollingFace(value ?? `d${sides}`);
      return;
    }

    setRollingFace(Math.floor(Math.random() * sides) + 1);
    const timer = window.setInterval(() => {
      setRollingFace(Math.floor(Math.random() * sides) + 1);
    }, 64);

    return () => window.clearInterval(timer);
  }, [rolling, sides, value]);

  useEffect(() => {
    const texture = faceTextureRef.current;
    if (!texture) return;
    drawFaceTexture(texture, rollingFace, danger ? "danger" : critical ? "critical" : "normal");
  }, [critical, danger, rollingFace]);

  useEffect(() => {
    if (!mountRef.current) return;
    const mount = mountRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(176, 176);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100);
    camera.position.set(0, 0.34, 5.45);

    const tone = danger ? "danger" : critical ? "critical" : "normal";
    const colors = dieColorFor(tone);

    const hemi = new THREE.HemisphereLight(0xfff0c7, 0x170713, 1.35);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xfff2c9, 3.8);
    key.position.set(3.6, 5.2, 5.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);

    const rim = new THREE.PointLight(critical ? 0xffd45c : danger ? 0xff3454 : 0x9ac2ff, 2.4, 12);
    rim.position.set(-3.8, 1.35, 3.4);
    scene.add(rim);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.58, 64),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.32 }),
    );
    floor.position.set(0, -1.34, -0.15);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const dieGroup = new THREE.Group();
    scene.add(dieGroup);

    const geometry = geometryFor(sides);
    const material = new THREE.MeshPhysicalMaterial({
      color: colors.body,
      roughness: 0.27,
      metalness: 0.08,
      clearcoat: 0.78,
      clearcoatRoughness: 0.2,
      reflectivity: 0.65,
      flatShading: true,
      emissive: colors.emissive,
      emissiveIntensity: 0.18,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.set(...stableRotationFor(sides));
    dieGroup.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 18),
      new THREE.LineBasicMaterial({
        color: colors.edge,
        transparent: true,
        opacity: 0.72,
      }),
    );
    mesh.add(edges);

    const faceTexture = createFaceTexture();
    faceTextureRef.current = faceTexture;
    drawFaceTexture(faceTexture, rollingFace, tone);
    const facePlacement = facePlacementFor(sides);
    const faceGeometry = new THREE.PlaneGeometry(facePlacement.size[0], facePlacement.size[1]);
    const faceMaterial = new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -6,
      polygonOffsetUnits: -6,
    });
    const faceLabel = new THREE.Mesh(faceGeometry, faceMaterial);
    faceLabel.position.set(facePlacement.position[0], facePlacement.position[1], facePlacement.position[2]);
    faceLabel.rotation.set(facePlacement.rotation[0], facePlacement.rotation[1], facePlacement.rotation[2]);
    mesh.add(faceLabel);

    let frame = 0;
    let raf = 0;
    const settleRotation = stableRotationFor(sides);
    const animate = () => {
      frame += 1;

      if (rolling) {
        dieGroup.rotation.x += 0.16;
        dieGroup.rotation.y += 0.22;
        dieGroup.rotation.z += 0.13;
        dieGroup.position.x = Math.sin(frame / 3.8) * 0.42;
        dieGroup.position.y = Math.abs(Math.sin(frame / 4.6)) * 0.82;
      } else {
        dieGroup.rotation.x *= 0.84;
        dieGroup.rotation.y *= 0.84;
        dieGroup.rotation.z *= 0.84;
        dieGroup.position.x *= 0.82;
        dieGroup.position.y = Math.sin(frame / 42) * 0.045;
        mesh.rotation.x += (settleRotation[0] - mesh.rotation.x) * 0.1;
        mesh.rotation.y += (settleRotation[1] - mesh.rotation.y) * 0.1;
        mesh.rotation.z += (settleRotation[2] - mesh.rotation.z) * 0.1;
      }

      floor.scale.setScalar(rolling ? 1 + Math.abs(Math.sin(frame / 4.6)) * 0.2 : 1);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      geometry.dispose();
      material.dispose();
      faceGeometry.dispose();
      faceMaterial.dispose();
      faceTexture.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      faceTextureRef.current = null;
      mount.removeChild(renderer.domElement);
    };
  }, [critical, danger, rolling, sides]);

  return (
    <div className={`dice3d ${critical ? "critical" : ""} ${danger ? "danger" : ""} ${rolling ? "rolling" : ""}`}>
      <div ref={mountRef} className="dice3d-canvas" />
      <div className="dice3d-value">{rollingFace}</div>
    </div>
  );
}
