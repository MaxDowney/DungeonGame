import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { DiceExpression } from "../../game/types";

const expressionSides = (dice: DiceExpression[]): number => {
  const sides = dice
    .map((die) => Number(die.match(/d(\d+)/)?.[1] ?? 6))
    .filter(Boolean);
  return sides.includes(20) ? 20 : sides.sort((a, b) => b - a)[0] ?? 6;
};

const geometryFor = (sides: number) => {
  switch (sides) {
    case 3:
      return new THREE.ConeGeometry(1.15, 1.7, 3, 1);
    case 4:
      return new THREE.TetrahedronGeometry(1.25, 0);
    case 8:
      return new THREE.OctahedronGeometry(1.18, 0);
    case 10:
      return new THREE.ConeGeometry(1.05, 1.75, 10, 1);
    case 12:
      return new THREE.DodecahedronGeometry(1.12, 0);
    case 20:
      return new THREE.IcosahedronGeometry(1.16, 0);
    case 6:
    default:
      return new THREE.BoxGeometry(1.65, 1.65, 1.65);
  }
};

const createFaceTexture = () => {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 192;
  return new THREE.CanvasTexture(canvas);
};

const drawFaceTexture = (
  texture: THREE.CanvasTexture,
  value: string | number,
  tone: "normal" | "critical" | "danger",
) => {
  const canvas = texture.image as HTMLCanvasElement;
  const context = canvas.getContext("2d");
  if (!context) return;

  context.clearRect(0, 0, canvas.width, canvas.height);
  const accent = tone === "danger" ? "#ffb4b4" : tone === "critical" ? "#fff0a5" : "#ffe7b0";
  const shadow = tone === "danger" ? "rgba(127, 16, 32, .86)" : tone === "critical" ? "rgba(180, 108, 0, .72)" : "rgba(32, 15, 5, .78)";
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(255,255,255,.2)");
  gradient.addColorStop(0.42, "rgba(0,0,0,.16)");
  gradient.addColorStop(1, "rgba(0,0,0,.44)");
  context.fillStyle = gradient;
  context.beginPath();
  context.roundRect(18, 16, canvas.width - 36, canvas.height - 32, 34);
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "rgba(24, 12, 4, .86)";
  context.stroke();
  context.lineWidth = 3;
  context.strokeStyle = accent;
  context.stroke();

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2 + 5);
  context.rotate(-0.04);
  context.font = "900 104px Georgia, serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = shadow;
  context.lineWidth = 13;
  context.strokeText(String(value), 0, 0);
  context.fillStyle = accent;
  context.fillText(String(value), 0, 0);
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
    }, 72);

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
    renderer.setSize(150, 150);
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.25, 5.4);

    const key = new THREE.DirectionalLight(0xfff0c2, 2.5);
    key.position.set(3, 4, 5);
    key.castShadow = true;
    scene.add(key);
    scene.add(new THREE.AmbientLight(0x7c4dff, 0.85));
    const rim = new THREE.PointLight(danger ? 0xff284d : critical ? 0xffd54a : 0x77aaff, 1.8, 12);
    rim.position.set(-3, 1.2, 3);
    scene.add(rim);

    const geometry = geometryFor(sides);
    const material = new THREE.MeshStandardMaterial({
      color: danger ? 0x7f1020 : critical ? 0xf4b63e : 0xc27a36,
      roughness: 0.42,
      metalness: 0.2,
      flatShading: true,
      emissive: danger ? 0x260007 : critical ? 0x342000 : 0x1c0e05,
      emissiveIntensity: 0.22,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.rotation.set(0.58, 0.36, 0.18);
    scene.add(mesh);

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({ color: critical ? 0xfff3c4 : 0x2b160a, transparent: true, opacity: 0.62 }),
    );
    mesh.add(edges);

    const faceTexture = createFaceTexture();
    faceTextureRef.current = faceTexture;
    drawFaceTexture(faceTexture, rollingFace, danger ? "danger" : critical ? "critical" : "normal");
    const faceGeometry = new THREE.PlaneGeometry(1.34, 0.98);
    const faceMaterial = new THREE.MeshBasicMaterial({
      map: faceTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const faceLabel = new THREE.Mesh(faceGeometry, faceMaterial);
    faceLabel.position.set(0, 0, 1.24);
    faceLabel.rotation.set(0, 0, -0.02);
    mesh.add(faceLabel);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 48),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 }),
    );
    shadow.position.set(0, -1.45, -0.25);
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 1;
      const rollBoost = rolling ? 5.5 : 1;
      mesh.rotation.x += 0.009 * rollBoost;
      mesh.rotation.y += 0.013 * rollBoost;
      mesh.rotation.z += rolling ? 0.041 : 0.003;
      const bounce = rolling ? Math.abs(Math.sin(frame / 5)) * 0.72 : Math.sin(frame / 34) * 0.08;
      mesh.position.y = bounce;
      mesh.position.x = rolling ? Math.sin(frame / 7) * 0.38 : 0;
      shadow.scale.setScalar(rolling ? 1 + Math.sin(frame / 5) * 0.16 : 1);
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
      faceTextureRef.current = null;
      renderer.dispose();
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
