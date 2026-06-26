// =====================================================================
//  Движок 3D-частиц: галактика-воронка + сердце из частиц + фонтан
//  (воссоздание эффекта из видео на Three.js)
// =====================================================================
import * as THREE from "three";
import { CONFIG } from "./config.js";

// --- мягкая круглая текстура свечения для каждой частицы ---
function makeGlowTexture() {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,230,245,0.9)");
  g.addColorStop(0.5, "rgba(255,120,200,0.45)");
  g.addColorStop(1.0, "rgba(255,0,140,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --- текстура-слово (для летающих надписей) ---
function makeWordTexture(text) {
  const pad = 24;
  const fontSize = 64;
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  ctx.font = `700 ${fontSize}px "Montserrat", Arial, sans-serif`;
  const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
  const h = fontSize + pad * 2;
  c.width = w;
  c.height = h;
  ctx.font = `700 ${fontSize}px "Montserrat", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,40,160,0.9)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = "rgba(255,190,230,0.96)";
  ctx.fillText(text, w / 2, h / 2);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { texture: t, aspect: w / h };
}

// классическая параметрика сердца
function heartPoint(t) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y =
    13 * Math.cos(t) -
    5 * Math.cos(2 * t) -
    2 * Math.cos(3 * t) -
    Math.cos(4 * t);
  return { x: x / 16, y: y / 16 }; // нормализовано ~[-1,1]
}

export function initGalaxy(canvas) {
  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 640;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 3.7, 11);
  camera.lookAt(0, 2.1, 0);

  const glow = makeGlowTexture();

  // палитра
  const cWhite = new THREE.Color(0xffffff);
  const cHot = new THREE.Color(0xff3fae);
  const cDeep = new THREE.Color(0xb1006b);
  const cPink = new THREE.Color(0xff8fd0);

  // ------------------------------------------------------------------
  //  1) ГАЛАКТИКА-ВОРОНКА (диск в плоскости XZ)
  // ------------------------------------------------------------------
  const GAL_N = isMobile ? 4500 : 9500;
  const arms = 3;
  const maxR = 8.2;
  const minR = 0.22;       // крошечный тёмный "глаз" воронки
  const spin = 2.1;        // сильная закрутка рукавов

  const gpos = new Float32Array(GAL_N * 3);
  const gcol = new Float32Array(GAL_N * 3);
  const tmp = new THREE.Color();
  // мягкое гауссово отклонение
  const gauss = (s) => ((Math.random() + Math.random() + Math.random()) / 3 - 0.5) * 2 * s;

  for (let i = 0; i < GAL_N; i++) {
    const branch = i % arms;
    const rRand = Math.pow(Math.random(), 1.9);          // плотнее к центру (яркое ядро)
    const radius = minR + rRand * (maxR - minR);
    const spinAngle = radius * spin;
    const branchAngle = (branch / arms) * Math.PI * 2;
    const scatter = gauss(0.20) * (1 - rRand * 0.35);    // чёткие, узкие рукава
    const angle = branchAngle + spinAngle + scatter;

    const r = radius + gauss(0.10);
    gpos[i * 3]     = Math.cos(angle) * r;
    gpos[i * 3 + 1] = gauss(0.09) * (1 - rRand * 0.55);  // тонкий диск
    gpos[i * 3 + 2] = Math.sin(angle) * r;

    // цвет: бело-горячее ядро -> розовый -> глубокая магента к краю
    const t = Math.min(1, radius / maxR);
    if (t < 0.18) tmp.copy(cWhite).lerp(cHot, (t / 0.18) * 0.7);
    else tmp.copy(cHot).lerp(cDeep, (t - 0.18) / 0.82);
    if (Math.random() < 0.09) tmp.copy(cWhite);          // искры
    gcol[i * 3] = tmp.r;
    gcol[i * 3 + 1] = tmp.g;
    gcol[i * 3 + 2] = tmp.b;
  }

  const galGeo = new THREE.BufferGeometry();
  galGeo.setAttribute("position", new THREE.BufferAttribute(gpos, 3));
  galGeo.setAttribute("color", new THREE.BufferAttribute(gcol, 3));
  const galMat = new THREE.PointsMaterial({
    size: isMobile ? 0.075 : 0.058,
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const galaxy = new THREE.Points(galGeo, galMat);
  scene.add(galaxy);

  // яркое аккреционное кольцо вокруг "глаза"
  const RING_N = isMobile ? 450 : 1000;
  const rpos = new Float32Array(RING_N * 3);
  const rcol = new Float32Array(RING_N * 3);
  for (let i = 0; i < RING_N; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 0.35 + Math.pow(Math.random(), 2) * 0.9;
    rpos[i * 3] = Math.cos(a) * rr;
    rpos[i * 3 + 1] = gauss(0.05);
    rpos[i * 3 + 2] = Math.sin(a) * rr;
    tmp.copy(cWhite).lerp(cHot, Math.random() * 0.5);
    rcol[i * 3] = tmp.r; rcol[i * 3 + 1] = tmp.g; rcol[i * 3 + 2] = tmp.b;
  }
  const ringGeo = new THREE.BufferGeometry();
  ringGeo.setAttribute("position", new THREE.BufferAttribute(rpos, 3));
  ringGeo.setAttribute("color", new THREE.BufferAttribute(rcol, 3));
  const ring = new THREE.Points(ringGeo, new THREE.PointsMaterial({
    size: isMobile ? 0.1 : 0.08, map: glow, vertexColors: true,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  galaxy.add(ring);

  // ------------------------------------------------------------------
  //  2) СЕРДЦЕ ИЗ ЧАСТИЦ (плоскость XY, парит над центром)
  // ------------------------------------------------------------------
  const HEART_N = isMobile ? 2600 : 5000;
  const heartScale = 2.6;
  const heartCenterY = 5.6;

  const hTarget = new Float32Array(HEART_N * 3); // цель (форма сердца)
  const hStart = new Float32Array(HEART_N * 3);  // старт (центр воронки)
  const hpos = new Float32Array(HEART_N * 3);    // текущая позиция
  const hcol = new Float32Array(HEART_N * 3);
  const hPhase = new Float32Array(HEART_N);      // фаза мерцания
  const hDelay = new Float32Array(HEART_N);      // задержка вылета

  for (let i = 0; i < HEART_N; i++) {
    const t = Math.random() * Math.PI * 2;
    const p = heartPoint(t);
    // в основном контур, часть — заливка внутрь к центру сердца
    const fill = Math.random() < 0.32 ? Math.pow(Math.random(), 0.5) : 1;
    let x = p.x * fill;
    let y = p.y * fill;
    // лёгкий разброс
    x += (Math.random() - 0.5) * 0.04;
    y += (Math.random() - 0.5) * 0.04;

    hTarget[i * 3] = x * heartScale;
    hTarget[i * 3 + 1] = y * heartScale + heartCenterY;
    hTarget[i * 3 + 2] = (Math.random() - 0.5) * 0.45;

    // старт — из чёрной дыры (центр диска)
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * 0.4;
    hStart[i * 3] = Math.cos(a) * rr;
    hStart[i * 3 + 1] = 0.3;
    hStart[i * 3 + 2] = Math.sin(a) * rr;

    hpos[i * 3] = hStart[i * 3];
    hpos[i * 3 + 1] = hStart[i * 3 + 1];
    hpos[i * 3 + 2] = hStart[i * 3 + 2];

    // цвет сердца: розово-белое свечение, контур ярче
    tmp.copy(cPink).lerp(cWhite, Math.random() * 0.6);
    if (fill === 1 && Math.random() < 0.5) tmp.copy(cWhite);
    if (fill < 1) tmp.copy(cHot).lerp(cDeep, Math.random() * 0.4);
    hcol[i * 3] = tmp.r;
    hcol[i * 3 + 1] = tmp.g;
    hcol[i * 3 + 2] = tmp.b;

    hPhase[i] = Math.random() * Math.PI * 2;
    hDelay[i] = Math.random() * 0.45;
  }

  const heartGeo = new THREE.BufferGeometry();
  heartGeo.setAttribute("position", new THREE.BufferAttribute(hpos, 3));
  heartGeo.setAttribute("color", new THREE.BufferAttribute(hcol, 3));
  const heartMat = new THREE.PointsMaterial({
    size: isMobile ? 0.085 : 0.07,
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    opacity: 0.0, // появится при формировании
  });
  const heart = new THREE.Points(heartGeo, heartMat);
  scene.add(heart);

  // ------------------------------------------------------------------
  //  3) ФОНТАН (струя из центра вверх к сердцу)
  // ------------------------------------------------------------------
  const FOUNT_N = isMobile ? 450 : 900;
  const fpos = new Float32Array(FOUNT_N * 3);
  const fcol = new Float32Array(FOUNT_N * 3);
  const fProg = new Float32Array(FOUNT_N);
  const fSpeed = new Float32Array(FOUNT_N);
  const fAng = new Float32Array(FOUNT_N);
  for (let i = 0; i < FOUNT_N; i++) {
    fProg[i] = Math.random();
    fSpeed[i] = 0.25 + Math.random() * 0.4;
    fAng[i] = Math.random() * Math.PI * 2;
    tmp.copy(cWhite).lerp(cHot, Math.random());
    fcol[i * 3] = tmp.r;
    fcol[i * 3 + 1] = tmp.g;
    fcol[i * 3 + 2] = tmp.b;
  }
  const fountGeo = new THREE.BufferGeometry();
  fountGeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  fountGeo.setAttribute("color", new THREE.BufferAttribute(fcol, 3));
  const fountMat = new THREE.PointsMaterial({
    size: isMobile ? 0.07 : 0.06,
    map: glow,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    opacity: 0.0,
  });
  const fountain = new THREE.Points(fountGeo, fountMat);
  scene.add(fountain);
  const fountTopY = heartCenterY - heartScale * 0.55; // низ сердца

  // ------------------------------------------------------------------
  //  4) ЛЕТАЮЩИЕ СЛОВА (спрайты на плоскости диска)
  // ------------------------------------------------------------------
  const wordGroup = new THREE.Group();
  scene.add(wordGroup);
  const words = [];
  const wlist = CONFIG.floatingWords;
  for (let i = 0; i < wlist.length; i++) {
    const { texture, aspect } = makeWordTexture(wlist[i]);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.0,
    });
    const sp = new THREE.Sprite(mat);
    const h = 0.45;
    sp.scale.set(h * aspect, h, 1);
    // равномерный базовый угол (чтобы похожие не слипались) + джиттер,
    // но радиус/высота/скорость — вразнобой
    const ang = (i / wlist.length) * Math.PI * 2 + (Math.random() - 0.5) * 0.55;
    const rad = 3.2 + Math.random() * 3.8;
    sp.userData = { ang, rad, speed: 0.025 + Math.random() * 0.06, y: -0.3 + Math.random() * 2.1, bob: 0.1 + Math.random() * 0.18 };
    wordGroup.add(sp);
    words.push(sp);
  }

  // ------------------------------------------------------------------
  //  Анимация
  // ------------------------------------------------------------------
  const clock = new THREE.Clock();
  let formProgress = 0;   // 0..1 формирование сердца
  let started = false;
  let reveal = 0;         // плавное появление сцены

  function ease(x) {
    return 1 - Math.pow(1 - x, 3);
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (reveal < 1) reveal = Math.min(1, reveal + dt * 0.6);

    // вращение галактики
    galaxy.rotation.y += dt * 0.2;
    galMat.opacity = reveal;

    // формирование сердца
    if (started && formProgress < 1) {
      formProgress = Math.min(1, formProgress + dt * 0.32);
    }
    const fp = ease(formProgress);
    heartMat.opacity = fp;
    fountMat.opacity = started ? Math.min(1, fp * 1.2) : 0;

    // позиции сердца: лерп старт->цель + мерцание
    const hp = heartGeo.attributes.position.array;
    for (let i = 0; i < HEART_N; i++) {
      const local = Math.max(0, Math.min(1, (formProgress - hDelay[i]) / (1 - 0.45)));
      const e = ease(local);
      const ix = i * 3;
      const sh = Math.sin(time * 2 + hPhase[i]) * 0.02;
      hp[ix] = hStart[ix] + (hTarget[ix] - hStart[ix]) * e + sh;
      hp[ix + 1] = hStart[ix + 1] + (hTarget[ix + 1] - hStart[ix + 1]) * e + Math.cos(time * 2 + hPhase[i]) * 0.02;
      hp[ix + 2] = hStart[ix + 2] + (hTarget[ix + 2] - hStart[ix + 2]) * e;
    }
    heartGeo.attributes.position.needsUpdate = true;
    // лёгкое «дыхание» сердца
    const bob = Math.sin(time * 1.1) * 0.12;
    heart.position.y = bob;
    heart.rotation.z = Math.sin(time * 0.5) * 0.03;

    // фонтан
    if (started) {
      const fpArr = fountGeo.attributes.position.array;
      for (let i = 0; i < FOUNT_N; i++) {
        fProg[i] += dt * fSpeed[i];
        if (fProg[i] > 1) fProg[i] -= 1;
        const p = fProg[i];
        const ix = i * 3;
        const swirl = fAng[i] + p * 6.0;
        const rad = (1 - p) * 0.35 + 0.04;
        fpArr[ix] = Math.cos(swirl) * rad;
        fpArr[ix + 1] = 0.3 + p * (fountTopY - 0.3) + bob;
        fpArr[ix + 2] = Math.sin(swirl) * rad;
      }
      fountGeo.attributes.position.needsUpdate = true;
    }

    // слова кружат над диском
    for (const sp of words) {
      const u = sp.userData;
      u.ang += dt * u.speed;
      sp.position.set(Math.cos(u.ang) * u.rad, u.y + Math.sin(time * 0.6 + u.ang) * u.bob, Math.sin(u.ang) * u.rad);
      sp.material.opacity = reveal * (0.55 + 0.45 * Math.sin(time * 0.8 + u.ang));
    }

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  frame();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);

  // лёгкий параллакс от движения мыши / наклона
  let targetX = 0, targetY = 0;
  window.addEventListener("pointermove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 0.6;
    targetY = (e.clientY / window.innerHeight - 0.5) * 0.3;
  });
  (function parallax() {
    camera.position.x += (targetX - camera.position.x) * 0.04;
    camera.position.y += (3.7 - targetY - camera.position.y) * 0.04;
    camera.lookAt(0, 2.1, 0);
    requestAnimationFrame(parallax);
  })();

  return {
    start() { started = true; },
  };
}
