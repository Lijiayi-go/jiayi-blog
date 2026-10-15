/* ============================================================
 * pet.js —— 桌面宠物「小嘉翊」
 * 状态机：
 *   1. 微笑（刚进入 / 默认待机）
 *   2. 欢快（轻点一下）
 *   3. 睡觉（15 秒无交互）
 *   4. 问号（连续多次点击）
 * 交互：可拖拽（位置记忆）、点击弹随机台词
 * ============================================================ */

(function () {
  /* ---------- 创建 DOM ---------- */
  const pet = document.createElement("div");
  pet.id = "pet";
  pet.innerHTML = `
    <img id="pet-img" src="./img/pet-1.png" alt="小嘉翊" draggable="false" />
    <div id="pet-bubble" class="pet-bubble" hidden></div>
  `;
  document.body.appendChild(pet);

  const img = document.getElementById("pet-img");
  const bubble = document.getElementById("pet-bubble");

  /* ---------- 随机台词 ---------- */
  const LINES = [
    "又是想写 Bug 的一天～",
    "嘉翊主人今天也很努力！",
    "Go 是最好的语言，不接受反驳 🐹",
    "我要再睡 5 分钟……",
    "有什么技术问题尽管问！",
    "RAG 检索不到我了啦～",
    " Distributed！Distribution！",
    "别点啦，痒死了 😆",
    "今天也要元气满满地 debug！",
    "警告：可爱含量超标 ⚠️",
    "我的梦话是 GMP 调度……",
    "轻轻点了一下，暗暗记了一辈子 ✨",
  ];

  /* ---------- 状态机 ---------- */
  const STATE_IMG = { 1: "./img/pet-1.png", 2: "./img/pet-2.png", 3: "./img/pet-3.png", 4: "./img/pet-4.png" };
  let state = 1;
  let idleTimer = null;
  let tempTimer = null;
  let clickTimes = [];
  let blinkTimer = null;

  function setState(s) {
    if (state === s) return;
    state = s;
    img.src = STATE_IMG[s];
    pet.classList.toggle("pet-sleep", s === 3);
    pet.classList.toggle("pet-question", s === 4);
    pet.classList.toggle("pet-happy", s === 2);
  }

  /* ---------- 眨眼：待机时每隔几秒快速切一次「半眯眼」 ---------- */
  function scheduleBlink() {
    clearTimeout(blinkTimer);
    blinkTimer = setTimeout(() => {
      if (state === 1 || state === 2) {
        pet.classList.add("pet-blink");
        setTimeout(() => pet.classList.remove("pet-blink"), 180);
      }
      scheduleBlink();
    }, 2600 + Math.random() * 2600);
  }

  function resetIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => setState(3), 15000); // 15 秒无交互 → 睡觉
  }

  /* 临时状态：过一会儿回到待机 */
  function tempState(s, ms) {
    setState(s);
    clearTimeout(tempTimer);
    tempTimer = setTimeout(() => {
      if (state !== 3) setState(1); // 除非已经进入睡觉
    }, ms);
  }

  /* ---------- 台词气泡 ---------- */
  let bubbleTimer = null;
  function say() {
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    bubble.textContent = line;
    bubble.hidden = false;
    bubble.classList.remove("pop");
    void bubble.offsetWidth; /* 重启动画 */
    bubble.classList.add("pop");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => (bubble.hidden = true), 2600);
  }

  /* ---------- 点击（区分轻点 / 连点） ---------- */
  let dragMoved = false;

  function onTap() {
    if (dragMoved) return; /* 拖拽后不触发点击 */

    const now = Date.now();
    clickTimes.push(now);
    clickTimes = clickTimes.filter((t) => now - t < 1200); /* 1.2 秒内的算连点 */

    if (clickTimes.length >= 2) {
      tempState(4, 2200); /* 连续多次点 → 问号 */
    } else {
      tempState(2, 2200); /* 轻点 → 欢快 */
    }
    say();
    resetIdle();
  }

  /* ---------- 拖拽 ---------- */
  function loadPos() {
    try {
      const p = JSON.parse(localStorage.getItem("pet-pos") || "null");
      if (p && typeof p.x === "number") {
        pet.style.left = p.x + "px";
        pet.style.top = p.y + "px";
        pet.style.right = "auto";
        pet.style.bottom = "auto";
      }
    } catch (e) {}
  }
  function savePos() {
    try {
      localStorage.setItem("pet-pos", JSON.stringify({ x: pet.offsetLeft, y: pet.offsetTop }));
    } catch (e) {}
  }

  /* 修复要点（手机端）：
   *   1. add / remove 必须是同一个函数引用——之前删的是 onMoveTouch、加的是 onMove，
   *      导致监听永远解不掉，touchmove 里的 preventDefault 一直拦截页面滚动
   *   2. 补 touchcancel：被系统手势/滚动打断时同样要解绑
   *   3. 只在真正拖拽（超过阈值）后才 preventDefault，轻点完全不影响滚动
   */
  let dragActive = false;
  let dragBound = false;
  let dragInfo = null;

  function unbindDrag() {
    if (!dragBound) return;
    dragBound = false;
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("touchmove", onMove);
    window.removeEventListener("mouseup", onUp);
    window.removeEventListener("touchend", onUp);
    window.removeEventListener("touchcancel", onUp);
    dragInfo = null;
  }

  function onMove(e2) {
    if (!dragInfo) return;
    const isTouch = dragInfo.isTouch;
    const t = isTouch ? e2.touches && e2.touches[0] : null;
    const cx = isTouch ? (t ? t.clientX : null) : e2.clientX;
    const cy = isTouch ? (t ? t.clientY : null) : e2.clientY;
    if (cx == null || cy == null) return;

    const dx = cx - dragInfo.startX;
    const dy = cy - dragInfo.startY;

    if (!dragActive) {
      /* 未达阈值：不拦截滚动，让页面正常滑动 */
      if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return;
      dragActive = true;
      dragMoved = true;
      pet.classList.add("pet-dragging");
      /* 拎起来：轻微放大 */
      img.style.transform = "scale(1.12)";
    }
    /* 根据拖动方向倾斜（被拎着甩动） */
    const tilt = Math.max(-18, Math.min(18, dx * 0.35));
    img.style.rotate = tilt + "deg";

    /* 限制在视口内 */
    const maxX = window.innerWidth - pet.offsetWidth;
    const maxY = window.innerHeight - pet.offsetHeight;
    pet.style.left = Math.max(0, Math.min(maxX, dragInfo.origLeft + dx)) + "px";
    pet.style.top = Math.max(0, Math.min(maxY, dragInfo.origTop + dy)) + "px";

    /* 只有真正在拖拽时才阻止默认滚动 */
    if (isTouch && e2.cancelable) e2.preventDefault();
  }

  function onUp() {
    if (dragActive) {
      pet.classList.remove("pet-dragging");
      /* 松手回弹：缩放/倾斜复位由 CSS transition 平滑过渡 */
      img.style.transform = "";
      img.style.rotate = "";
      /* 落地小弹跳 */
      pet.classList.remove("pet-land");
      void pet.offsetWidth;
      pet.classList.add("pet-land");
      savePos();
    }
    dragActive = false;
    unbindDrag();
    setTimeout(() => (dragMoved = false), 50);
  }

  function bindDrag(ev) {
    const isTouch = ev.type.indexOf("touch") === 0;
    /* 多指手势（缩放等）交给浏览器，不参与拖拽 */
    if (isTouch && ev.touches && ev.touches.length > 1) return;
    const t = isTouch ? ev.touches[0] : null;
    dragActive = false;
    dragInfo = {
      isTouch,
      startX: isTouch ? t.clientX : ev.clientX,
      startY: isTouch ? t.clientY : ev.clientY,
      origLeft: pet.offsetLeft,
      origTop: pet.offsetTop,
    };
    if (!dragBound) {
      dragBound = true;
      window.addEventListener("mousemove", onMove);
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("mouseup", onUp);
      window.addEventListener("touchend", onUp);
      window.addEventListener("touchcancel", onUp);
    }
  }

  pet.addEventListener("mousedown", bindDrag);
  pet.addEventListener("touchstart", bindDrag, { passive: true });
  pet.addEventListener("click", onTap);

  /* ---------- 初始化 ---------- */
  loadPos();
  resetIdle(); /* 15 秒不点 → 睡觉 */
  scheduleBlink(); /* 待机眨眼 */

  /* 页面任何交互都算「有人理它」，重置睡觉计时 */
  ["click", "keydown", "scroll", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, () => { if (state !== 2 && state !== 4) resetIdle(); }, { passive: true })
  );
})();
