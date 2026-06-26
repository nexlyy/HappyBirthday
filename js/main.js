// =====================================================================
//  Оркестрация: интро, музыка, счётчики, письмо, таймлайн, финал
// =====================================================================
import { CONFIG } from "./config.js";
import { initBackground } from "./background.js";
import { initGalaxy } from "./galaxy.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// всегда начинаем сверху (без восстановления прокрутки браузером)
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0));

// фон сразу
initBackground($("#bg-canvas"));
// галактика (стартует формирование после нажатия)
const galaxy = initGalaxy($("#scene-canvas"));

// ---------- наполняем контент из конфига ----------
$("#hero-name").textContent = CONFIG.name;
$("#hero-sub").textContent = CONFIG.heroSubtitle;
$("#letter-title").textContent = CONFIG.letterTitle;
$("#letter-sign").textContent = CONFIG.letterSignature ? CONFIG.letterSignature + "," : "";
$("#final-line").textContent = CONFIG.finalLine;
$("#final-sub").textContent = CONFIG.finalSub;

// причины
const rWrap = $("#reasons");
CONFIG.reasons.forEach((r, i) => {
  const li = document.createElement("li");
  li.textContent = r;
  li.style.transitionDelay = i * 0.1 + "s";
  rWrap.appendChild(li);
});

// ---------- пожелания на 18 ----------
const wWrap = $("#wishes");
if (wWrap && CONFIG.wishes) {
  $("#wishes-title").textContent = CONFIG.wishesTitle;
  CONFIG.wishes.forEach((w, i) => {
    const li = document.createElement("li");
    li.style.transitionDelay = i * 0.08 + "s";
    li.innerHTML = `<span class="w-icon">${w.icon}</span><span>${w.text}</span>`;
    wWrap.appendChild(li);
  });
}

// ---------- наша песня (текст) ----------
if ($("#song-card")) {
  $("#song-title").textContent = CONFIG.songTitle;
  $("#song-name").textContent = CONFIG.songName;
  $("#song-artist").textContent = CONFIG.songArtist;
  $("#song-note").textContent = CONFIG.songNote;
}

// ---------- фото-слайдер ----------
const slidesWrap = $("#slides");
const dotsWrap = $("#s-dots");
const slideCount = (CONFIG.gallery || []).length;
let slideIdx = 0, autoTimer = null;
if (slidesWrap && slideCount) {
  $("#gallery-title").textContent = CONFIG.galleryTitle;
  CONFIG.gallery.forEach((item, i) => {
    const s = document.createElement("div");
    s.className = "slide";
    s.innerHTML =
      `<img src="photos/${item.src}" alt="" loading="${i < 2 ? "eager" : "lazy"}"/>` +
      (item.caption ? `<span class="s-cap">${item.caption}</span>` : "");
    s.querySelector("img").addEventListener("click", () => openLightbox(`photos/${item.src}`));
    slidesWrap.appendChild(s);
    const dot = document.createElement("i");
    dot.addEventListener("click", () => goSlide(i, true));
    dotsWrap.appendChild(dot);
  });
  updateSlider();
  autoTimer = setInterval(() => goSlide(slideIdx + 1), 4500);
  let touchX = null;
  slidesWrap.addEventListener("touchstart", (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  slidesWrap.addEventListener("touchend", (e) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) goSlide(slideIdx + (dx < 0 ? 1 : -1), true);
    touchX = null;
  });
}
function updateSlider() {
  slidesWrap.style.transform = `translateX(-${slideIdx * 100}%)`;
  Array.from(dotsWrap.children).forEach((d, i) => d.classList.toggle("active", i === slideIdx));
}
function goSlide(i, manual) {
  slideIdx = (i + slideCount) % slideCount;
  updateSlider();
  if (manual && autoTimer) { clearInterval(autoTimer); autoTimer = setInterval(() => goSlide(slideIdx + 1), 4500); }
}
$("#s-prev")?.addEventListener("click", () => goSlide(slideIdx - 1, true));
$("#s-next")?.addEventListener("click", () => goSlide(slideIdx + 1, true));

// ---------- открой сюрприз ----------
const surBtn = $("#surprise-btn");
const surReveal = $("#surprise-reveal");
surBtn?.addEventListener("click", () => {
  surReveal.innerHTML = CONFIG.surpriseText.map((t) => `<p>${t}</p>`).join("");
  surReveal.classList.add("show");
  surBtn.classList.add("gone");
  launchConfetti();
});

// ---------- лайтбокс ----------
const lb = $("#lightbox");
const lbImg = $("#lightbox-img");
function openLightbox(src) {
  lbImg.src = src;
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
}
function closeLightbox() {
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
}
lb.addEventListener("click", closeLightbox);
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

// ---------- счётчик «вместе уже» ----------
function plural(n, forms) {
  // forms: [день, дня, дней]
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return forms[0];
  if (n10 >= 2 && n10 <= 4 && (n100 < 10 || n100 >= 20)) return forms[1];
  return forms[2];
}
function updateCounter() {
  const start = new Date(CONFIG.togetherSince).getTime();
  const now = Date.now();
  const days = Math.floor((now - start) / 86400000);
  $("#together-days").textContent = days;
  $("#together-label").textContent = plural(days, ["день", "дня", "дней"]);
}
updateCounter();
setInterval(updateCounter, 60000);

// ---------- АУДИО ----------
const audio = new Audio(CONFIG.music);
audio.loop = true;
audio.volume = 0;
let musicOn = false;
function fadeAudio(to, ms = 1500) {
  const from = audio.volume;
  const t0 = performance.now();
  function step(t) {
    const k = Math.min(1, (t - t0) / ms);
    audio.volume = from + (to - from) * k;
    if (k < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
const musicBtn = $("#music-btn");
const songCard = $("#song-card");
const songNote = $("#song-note");
function setMusicUI(on) {
  musicBtn.classList.toggle("playing", on);
  songCard?.classList.toggle("playing", on);
  if (songNote) songNote.textContent = on ? "играет сейчас 🎶" : CONFIG.songNote;
}
function toggleMusic() {
  if (musicOn) {
    fadeAudio(0, 600);
    setTimeout(() => audio.pause(), 600);
  } else {
    audio.play().then(() => fadeAudio(0.7)).catch(() => {});
  }
  musicOn = !musicOn;
  setMusicUI(musicOn);
}
musicBtn.addEventListener("click", toggleMusic);
songCard?.addEventListener("click", toggleMusic);

// ---------- ИНТРО / ОТКРЫТИЕ ПОДАРКА ----------
const intro = $("#intro");
const openBtn = $("#open-btn");
let opened = false;
function openGift() {
  if (opened) return;
  opened = true;
  // музыка (жест пользователя — можно играть)
  audio.play().then(() => { fadeAudio(0.7); musicOn = true; setMusicUI(true); }).catch(() => {});
  // формирование сердца
  galaxy.start();
  // прячем интро
  intro.classList.add("hide");
  setTimeout(() => { intro.style.display = "none"; }, 1200);
  // показываем hero-текст
  setTimeout(() => $("#hero-content").classList.add("show"), 1800);
  document.body.classList.add("opened");
}
openBtn.addEventListener("click", openGift);

// ---------- ПИСЬМО: печать по буквам при появлении ----------
const letterEl = $("#letter-text");
let letterTyped = false;
function typeLetter() {
  if (letterTyped) return;
  letterTyped = true;
  const lines = CONFIG.letter;
  letterEl.innerHTML = "";
  let li = 0, ci = 0;
  const cursor = $("#letter-sign-wrap");
  function tick() {
    if (li >= lines.length) {
      cursor.classList.add("show");
      return;
    }
    let lineEl = letterEl.children[li];
    if (!lineEl) {
      lineEl = document.createElement("p");
      if (lines[li] === "") lineEl.innerHTML = "&nbsp;";
      letterEl.appendChild(lineEl);
    }
    if (lines[li] === "") { li++; ci = 0; setTimeout(tick, 120); return; }
    lineEl.textContent = lines[li].slice(0, ci + 1);
    ci++;
    if (ci >= lines[li].length) { li++; ci = 0; setTimeout(tick, 200); }
    else setTimeout(tick, 15 + Math.random() * 18);
  }
  tick();
}

// ---------- РАСКРЫТИЕ СЕКЦИЙ ПРИ СКРОЛЛЕ ----------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      e.target.classList.add("in");
      if (e.target.id === "section-letter") typeLetter();
      if (e.target.id === "section-final") launchConfetti();
    }
  }
}, { threshold: 0.25 });
$$(".reveal").forEach((el) => io.observe(el));

// ---------- КОНФЕТТИ / ФЕЙЕРВЕРК В ФИНАЛЕ ----------
let confettiRunning = false;
function launchConfetti() {
  if (confettiRunning) return;
  confettiRunning = true;
  const c = $("#confetti");
  const ctx = c.getContext("2d");
  function size() { c.width = window.innerWidth; c.height = window.innerHeight; }
  size();
  window.addEventListener("resize", size);
  const colors = ["#ff3fae", "#ff8fd0", "#ffffff", "#ffd1ec", "#b1006b"];
  const parts = [];
  function burst(x, y) {
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 6;
      parts.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2,
        g: 0.08 + Math.random() * 0.06, life: 1,
        color: colors[(Math.random() * colors.length) | 0],
        size: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        heart: Math.random() < 0.4,
      });
    }
  }
  let bursts = 0;
  const interval = setInterval(() => {
    burst(window.innerWidth * (0.2 + Math.random() * 0.6), window.innerHeight * (0.2 + Math.random() * 0.3));
    if (++bursts > 6) clearInterval(interval);
  }, 600);
  burst(window.innerWidth / 2, window.innerHeight / 2);

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= 0.008;
      if (p.life <= 0 || p.y > c.height + 30) { parts.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.heart) {
        const s = p.size;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(0, 0, -s, 0, -s, s * 0.3);
        ctx.bezierCurveTo(-s, s * 0.7, 0, s, 0, s * 1.2);
        ctx.bezierCurveTo(0, s, s, s * 0.7, s, s * 0.3);
        ctx.bezierCurveTo(s, 0, 0, 0, 0, s * 0.3);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      }
      ctx.restore();
    }
    if (parts.length > 0 || bursts <= 6) requestAnimationFrame(draw);
  }
  draw();
}

// индикатор скролла прячем после первого скролла
window.addEventListener("scroll", () => {
  if (window.scrollY > 60) $("#scroll-hint")?.classList.add("hidden");
}, { passive: true });
