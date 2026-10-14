/* ============================================================
 * app.js —— 路由 + 页面渲染
 * ============================================================ */

const app = document.getElementById("app");

/* 转义 HTML，防止内容注入 */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* 通用：把页面内容包进一张卡片 */
function card(title, inner) {
  return `<section class="card"><h2 class="section-title">${esc(title)}</h2>${inner}</section>`;
}

/* ---------- 首页（简历） ---------- */
function renderHome() {
  const edu = EDUCATION.map(
    (e) => `
      <div class="timeline-item">
        <div class="tl-head">
          <span class="tl-school">${esc(e.school)}</span>
          <span class="tl-degree">${esc(e.degree)}</span>
          <span class="tl-period">${esc(e.period)}</span>
        </div>
        <div class="tl-major">${esc(e.major)}</div>
        ${e.desc ? `<div class="tl-desc">${esc(e.desc)}</div>` : ""}
      </div>`
  ).join("");

  const skills = SKILLS.map((s) => `<span class="skill-tag">${esc(s)}</span>`).join("");

  const strengths = (window.STRENGTHS || []).map((s, i) => `
    <div class="strength-item">
      <span class="strength-num">${i + 1}</span>
      <div class="strength-text">${esc(s)}</div>
    </div>`).join("");

  const projects = PROJECTS.map(
    (p) => `
      <div class="project">
        <div class="project-name">${esc(p.name)}</div>
        <div class="project-desc">${esc(p.desc)}</div>
        <div class="project-tags">${(p.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>
      </div>`
  ).join("");

  const avatarChar = (SITE.name || "我").trim().charAt(0) || "我";

  return `
    <div class="hero">
      <div class="hero-avatar">${esc(avatarChar)}</div>
      <div class="hero-info">
        <h1>${esc(SITE.name)}</h1>
        <div class="hero-role">${esc(SITE.role)}</div>
        <div class="hero-motto">${esc(SITE.motto)}</div>
        <div class="hero-meta">
          <span class="chip">📍 ${esc(SITE.location)}</span>
          <span class="chip">🎓 ${esc(EDUCATION[0].school)}</span>
          <a class="chip chip-link" href="mailto:${esc(SITE.email)}">📧 ${esc(SITE.email)}</a>
          <a class="chip chip-link" href="${esc(SITE.github)}" target="_blank" rel="noopener">🐙 GitHub</a>
        </div>
      </div>
    </div>
    <section class="card">
      <h2 class="section-title collapsible" data-toggle="strength-body">
        个人优势
        <span class="collapse-arrow" id="strength-arrow">▾</span>
      </h2>
      <div id="strength-body" class="collapse-wrap collapsed">
        <div class="strength-list">${strengths}</div>
      </div>
    </section>
    <div style="height:18px"></div>
    ${card("教育经历", `<div class="timeline">${edu}</div>`)}
    <div style="height:18px"></div>
    ${card("技能栈", `<div class="skill-tags">${skills}</div>`)}
    <div style="height:18px"></div>
    ${card("项目 / 作品", `<div class="project-grid">${projects}</div>`)}
  `;
}

/* ---------- 瞬间 ---------- */
function renderMoments() {
  const list = MOMENTS.map(
    (m) => `
      <div class="moment">
        <div class="moment-head">
          <span class="moment-date">${esc(m.date)}</span>
          ${m.tag ? `<span class="moment-tag">${esc(m.tag)}</span>` : ""}
        </div>
        <div class="moment-content">${esc(m.content)}</div>
      </div>`
  ).join("");
  return `<h2 class="section-title" style="font-size:24px">瞬间</h2><div class="moments-list">${list}</div>`;
}

/* ---------- 关于 ---------- */
function renderAbout() {
  const interests = ABOUT.interests.map((i) => `<span class="interest">${esc(i)}</span>`).join("");
  const contacts = (ABOUT.contact || []).map(
    (c) => `
      <a class="contact-item" href="${esc(c.link)}" target="_blank" rel="noopener">
        <span class="contact-label">${esc(c.label)}</span>
        <span class="contact-value">${esc(c.value)}</span>
      </a>`
  ).join("");

  return `
    ${card("关于我", `<div class="about-intro">${esc(ABOUT.intro)}</div>
      <div style="height:14px"></div>
      <div class="about-interests">${interests}</div>`)}
    <div style="height:18px"></div>
    ${card("联系我", `<div class="contact-list">${contacts}</div>`)}
  `;
}

/* ---------- 路由 ---------- */
const routes = {
  home: renderHome,
  moments: renderMoments,
  about: renderAbout,
};

/* 可折叠块：点击标题切换展开/收起 */
function bindCollapsibles() {
  document.querySelectorAll("[data-toggle]").forEach((el) => {
    el.addEventListener("click", () => {
      const body = document.getElementById(el.dataset.toggle);
      const arrow = el.querySelector(".collapse-arrow");
      if (!body) return;
      body.classList.toggle("collapsed");
      if (arrow) arrow.classList.toggle("open", !body.classList.contains("collapsed"));
    });
  });
}

function currentRoute() {
  return location.hash.replace(/^#\//, "") || "home";
}

function render(route) {
  const r = routes[route] ? route : "home";
  app.innerHTML = routes[r]();
  bindCollapsibles();
  document.querySelectorAll(".nav-link").forEach((a) => {
    a.classList.toggle("active", a.dataset.route === r);
  });
  return r;
}

/* 点击导航直接切换（不依赖 hash 跳转，兼容预览 iframe 环境） */
function go(route) {
  const r = render(route);
  try { history.replaceState(null, "", "#/" + r); } catch (e) {}
  window.scrollTo({ top: 0 });
}

/* 前进 / 后退时按 hash 渲染 */
window.addEventListener("hashchange", () => render(currentRoute()));

/* 初始化 */
function init() {
  document.getElementById("brand-name").textContent = SITE.name + "的博客";
  document.getElementById("footer-name").textContent = SITE.name;
  document.getElementById("footer-year").textContent = new Date().getFullYear();

  document.querySelectorAll(".nav-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go(a.dataset.route);
    });
  });

  const brand = document.querySelector(".brand");
  if (brand) {
    brand.addEventListener("click", (e) => {
      e.preventDefault();
      go("home");
    });
  }

  render(currentRoute());
  if (!location.hash) {
    try { history.replaceState(null, "", "#/home"); } catch (e) {}
  }
}

document.addEventListener("DOMContentLoaded", init);
