import { useEffect, useRef } from "react";

// Stripe-style "silk ribbon" hero background (WebGL via three.js).
//
// A coherent translucent band (not a fan of rays) flows diagonally and folds
// like fabric. Dozens of thin strips share one wavy centerline; each twists
// around it with its own phase so they cross and overlap. Where the low-opacity
// strips stack, the orange -> pink -> purple -> blue palette blends optically.
// Single instanced draw call; the shader does all the motion.
//
// three is imported lazily on mount, so it never enters the SSR or the initial
// client bundle - the page paints first and the ribbon fades in. The loop
// pauses when the canvas is offscreen or the tab is hidden, and renders a
// single static frame under prefers-reduced-motion.

const RIBBON_COUNT = 52;

const vertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aOffset;   // -0.5..0.5 : this strip's slot across the band
  attribute float aSeed;     // per-ribbon randomness
  varying vec3 vColor;
  varying vec2 vUv;

  const float PI = 3.14159265;

  vec3 palette(float x){
    vec3 c1 = vec3(1.00, 0.48, 0.22); // orange
    vec3 c2 = vec3(1.00, 0.32, 0.52); // pink
    vec3 c3 = vec3(0.56, 0.38, 0.96); // purple
    vec3 c4 = vec3(0.40, 0.60, 0.98); // blue
    if (x < 0.33) return mix(c1, c2, x / 0.33);
    if (x < 0.66) return mix(c2, c3, (x - 0.33) / 0.33);
    return mix(c3, c4, (x - 0.66) / 0.34);
  }

  void main() {
    vUv = uv;
    float t = uv.x;                       // 0..1 along the band length

    // shared centerline: the whole sheet undulates together (silk, not rays)
    float wave = sin(t * 2.6 + uTime * 0.45) * 0.55
               + sin(t * 1.5 - uTime * 0.30) * 0.40;

    // leaf envelope: thin & soft at both ends, full in the middle, so the band
    // never collapses to a point.
    float env = sin(t * PI);              // 0 at ends, 1 in middle
    float bandThickness = 1.7 * (0.30 + 0.70 * env);
    float ribbonY = aOffset * bandThickness;

    // per-ribbon twist so strips fold over each other -> overlap = color
    float twist = sin(t * 2.4 + aSeed * 6.2832 + uTime * 0.6) * 0.45 * env;
    ribbonY += twist * (0.5 - abs(aOffset));

    vec3 pos = position;
    pos.y += wave + ribbonY;
    // spread the strips in depth so folds read as 3D fabric
    pos.z = aOffset * 2.2 + sin(t * 2.0 + aSeed * 5.0 + uTime * 0.4) * 0.7 * env;

    vColor = palette(clamp(aOffset + 0.5, 0.0, 1.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying vec2 vUv;

  // cheap ordered dither to kill gradient banding on big smooth fills
  float dither(vec2 p){
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  }

  void main() {
    // feather long edges, dissolve the ends -> soft silk wisps
    float edge = smoothstep(0.0, 0.45, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float ends = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x);
    float alpha = edge * ends * 0.15;
    alpha += dither(gl_FragCoord.xy) * 0.004;
    if (alpha < 0.002) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

/** Animated WebGL ribbon. Position the parent and give it a height; this fills it. */
export function SilkRibbons() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    // Lazy-load three so it stays out of the SSR + initial client bundle.
    void import("three")
      .then((THREE) => {
        if (disposed || !mountRef.current) return;
        try {
          cleanup = initRibbons(THREE, mount);
        } catch {
          // WebGL unavailable (headless CI, blocklisted GPU, old device). The
          // ribbon is decorative - degrade silently to the plain background.
        }
      })
      .catch(() => {
        // three failed to load (offline, blocked) - keep the plain background.
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}

/** Builds the scene and returns a disposer. Kept out of the component body so
 *  the async import path stays readable. */
function initRibbons(
  THREE: typeof import("three"),
  mount: HTMLDivElement,
): () => void {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  let width = mount.clientWidth;
  let height = mount.clientHeight;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
  camera.position.set(0, 0, 9);

  // one long, finely-segmented strip reused for every ribbon (instanced)
  const geometry = new THREE.PlaneGeometry(13, 0.5, 160, 1);
  const offsets = new Float32Array(RIBBON_COUNT);
  const seeds = new Float32Array(RIBBON_COUNT);
  for (let i = 0; i < RIBBON_COUNT; i++) {
    offsets[i] = i / (RIBBON_COUNT - 1) - 0.5;
    // Deterministic per-strip seed (no Math.random, stable across renders).
    seeds[i] = (Math.sin(i * 12.9898) * 43758.5453) % 1;
  }
  geometry.setAttribute(
    "aOffset",
    new THREE.InstancedBufferAttribute(offsets, 1),
  );
  geometry.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 1));

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.InstancedMesh(geometry, material, RIBBON_COUNT);
  mesh.frustumCulled = false;
  const identity = new THREE.Matrix4();
  for (let i = 0; i < RIBBON_COUNT; i++) mesh.setMatrixAt(i, identity);
  mesh.instanceMatrix.needsUpdate = true;

  // diagonal sweep: enters top-left, flows down-right (matches Stripe)
  const group = new THREE.Group();
  group.add(mesh);
  group.rotation.z = -0.42;
  group.position.set(1.2, 1.4, 0);
  scene.add(group);

  // mouse parallax (smoothed, no per-frame allocations)
  const mouse = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const onPointerMove = (e: PointerEvent) => {
    target.x = (e.clientX / window.innerWidth) * 2 - 1;
    target.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reduceMotion) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  let raf = 0;
  let running = false;
  const start = performance.now();

  const renderFrame = (now: number) => {
    material.uniforms.uTime.value = (now - start) / 1000;
    mouse.x += (target.x - mouse.x) * 0.04;
    mouse.y += (target.y - mouse.y) * 0.04;
    group.position.x = 1.2 + mouse.x * 0.6;
    group.position.y = 1.4 - mouse.y * 0.4;
    group.rotation.z = -0.42 + mouse.x * 0.03;
    renderer.render(scene, camera);
  };

  const loop = (now: number) => {
    renderFrame(now);
    raf = requestAnimationFrame(loop);
  };
  const play = () => {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  if (reduceMotion) {
    renderFrame(start); // single static frame, no loop
  } else {
    play();
  }

  // pause when the canvas scrolls out of view
  const io = new IntersectionObserver(
    ([entry]) => {
      if (reduceMotion) return;
      if (entry.isIntersecting) play();
      else stop();
    },
    { threshold: 0 },
  );
  io.observe(mount);

  // pause when the tab is backgrounded
  const onVisibility = () => {
    if (reduceMotion) return;
    if (document.hidden) stop();
    else play();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // resize scoped to the element (cheaper + correct than window resize)
  const ro = new ResizeObserver(() => {
    width = mount.clientWidth;
    height = mount.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (!running) renderFrame(performance.now());
  });
  ro.observe(mount);

  return () => {
    stop();
    io.disconnect();
    ro.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pointermove", onPointerMove);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === mount) {
      mount.removeChild(renderer.domElement);
    }
  };
}
