// =====================================================================
//  Фон: парящие светящиеся сердечки (боке) + веточки гипсофилы
// =====================================================================

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  const top = y - s * 0.35;
  ctx.moveTo(x, top + s * 0.3);
  ctx.bezierCurveTo(x, top, x - s * 0.5, top, x - s * 0.5, top + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, top + s * 0.6, x, top + s * 0.9, x, top + s * 1.1);
  ctx.bezierCurveTo(x, top + s * 0.9, x + s * 0.5, top + s * 0.6, x + s * 0.5, top + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, top, x, top, x, top + s * 0.3);
  ctx.closePath();
}

// одна веточка гипсофилы — много крошечных белых цветочков
function drawGypsophila(ctx, x, y, scale, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = "rgba(180,150,170,0.5)";
  ctx.lineWidth = 0.8;
  const stems = 5;
  const tips = [];
  for (let i = 0; i < stems; i++) {
    const a = (-Math.PI / 2) + (i - (stems - 1) / 2) * 0.32;
    const len = 26 + (i % 2) * 8;
    const ex = Math.cos(a) * len;
    const ey = Math.sin(a) * len;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(ex * 0.5 + 4, ey * 0.5, ex, ey);
    ctx.stroke();
    tips.push([ex, ey]);
    // боковые веточки
    for (let j = 1; j <= 2; j++) {
      const t = j / 3;
      const bx = ex * t, by = ey * t;
      const ba = a + (j % 2 ? 0.5 : -0.5);
      const bl = 9;
      tips.push([bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl]);
    }
  }
  // цветочки на кончиках
  ctx.globalAlpha = alpha;
  for (const [tx, ty] of tips) {
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 3.5);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(1, "rgba(255,240,250,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tx, ty, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(tx, ty, 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function initBackground(canvas) {
  const ctx = canvas.getContext("2d");
  let W, H, DPR;
  const isMobile = Math.min(window.innerWidth, window.innerHeight) < 640;

  function resize() {
    DPR = Math.min(window.devicePixelRatio, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  const COUNT = isMobile ? 22 : 40;
  const hearts = [];
  for (let i = 0; i < COUNT; i++) {
    hearts.push(newHeart(true));
  }
  function newHeart(initial) {
    const s = 20 + Math.random() * 90;
    return {
      x: Math.random() * W,
      y: initial ? Math.random() * H : H + s,
      s,
      vy: 0.15 + Math.random() * 0.5,
      vx: (Math.random() - 0.5) * 0.2,
      blur: 4 + Math.random() * 18,
      alpha: 0.12 + Math.random() * 0.4,
      hue: 320 + Math.random() * 20,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.005 + Math.random() * 0.01,
    };
  }

  // несколько статичных гипсофил по углам
  const flowers = [];
  const fcount = isMobile ? 3 : 6;
  for (let i = 0; i < fcount; i++) {
    flowers.push({
      x: Math.random() * W,
      y: Math.random() < 0.5 ? H * (0.8 + Math.random() * 0.2) : H * Math.random() * 0.25,
      scale: 0.8 + Math.random() * 1.2,
      alpha: 0.18 + Math.random() * 0.22,
      drift: Math.random() * Math.PI * 2,
    });
  }

  let t = 0;
  function frame() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    // сердечки
    for (const h of hearts) {
      h.sway += h.swaySpeed;
      h.y -= h.vy;
      h.x += h.vx + Math.sin(h.sway) * 0.3;
      if (h.y + h.s < -20) Object.assign(h, newHeart(false));

      ctx.save();
      ctx.shadowColor = `hsla(${h.hue},100%,60%,${h.alpha})`;
      ctx.shadowBlur = h.blur;
      const grad = ctx.createLinearGradient(h.x, h.y - h.s * 0.4, h.x, h.y + h.s * 0.7);
      grad.addColorStop(0, `hsla(${h.hue},100%,72%,${h.alpha})`);
      grad.addColorStop(1, `hsla(${h.hue - 10},100%,45%,${h.alpha * 0.7})`);
      ctx.fillStyle = grad;
      heartPath(ctx, h.x, h.y, h.s);
      ctx.fill();
      ctx.restore();
    }

    // гипсофилы (мягко покачиваются)
    for (const f of flowers) {
      f.drift += 0.004;
      drawGypsophila(ctx, f.x + Math.sin(f.drift) * 6, f.y, f.scale, f.alpha);
    }

    requestAnimationFrame(frame);
  }
  frame();
}
