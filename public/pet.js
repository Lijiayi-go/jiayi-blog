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

  function setState(s) {
    if (state === s) return;
    state = s;
    img.src = STATE_IMG[s];
    pet.classList.toggle("pet-sleep", s === 3);
    pet.classList.toggle("pet-question", s === 4);
    pet.classList.toggle("pet-happy", s === 2);
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

  function bindDrag(ev) {
    const isTouch = ev.type.startsWith("touch");
    const startX = isTouch ? ev.touches[0].clientX : ev.clientX;
    const startY = isTouch ? ev.touches[0].clientY : ev.clientY;
    const origLeft = pet.offsetLeft;
    const origTop = pet.offsetTop;

    function onMove(e2) {
      const cx = isTouch ? e2.touches[0].clientX : e2.clientX;
      const cy = isTouch ? e2.touches[0].clientY : e2.clientY;
      const dx = cx - startX;
      const dy = cy - startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
        dragMoved = true;
        pet.classList.add("pet-dragging");
      }
      /* 限制在视口内 */
      const maxX = window.innerWidth - pet.offsetWidth;
      const maxY = window.innerHeight - pet.offsetHeight;
      pet.style.left = Math.max(0, Math.min(maxX, origLeft + dx)) + "px";
      pet.style.top = Math.max(0, Math.min(maxY, origTop + dy)) + "px";
      if (isTouch) e2.preventDefault();
    }
    function onUp() {
      pet.classList.remove("pet-dragging");
      savePos();
      window.removeEventListener(isTouch ? "touchmove" : "mousemove", isTouch ? onMoveTouch : onMove);
      window.removeEventListener(isTouch ? "touchend" : "mouseup", onUp);
      setTimeout(() => (dragMoved = false), 50);
    }
    function onMoveTouch(e2) { onMove(e2); }

    if (isTouch) {
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onUp);
    } else {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
  }

  pet.addEventListener("mousedown", bindDrag);
  pet.addEventListener("touchstart", bindDrag, { passive: true });
  pet.addEventListener("click", onTap);

  /* ---------- 初始化 ---------- */
  loadPos();
  resetIdle(); /* 15 秒不点 → 睡觉 */

  /* 页面任何交互都算「有人理它」，重置睡觉计时 */
  ["click", "keydown", "scroll", "touchstart"].forEach((ev) =>
    window.addEventListener(ev, () => { if (state !== 2 && state !== 4) resetIdle(); }, { passive: true })
  );
})();
