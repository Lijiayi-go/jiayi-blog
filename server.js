/* ============================================================
 * server.js —— 零依赖 Node 后端
 * 职责：
 *   1. 托管 public/ 静态文件（博客前端）
 *   2. POST /api/chat —— 代理转发到你的模型（OpenAI 兼容接口），
 *      key 只存在服务端，绝不下发到浏览器
 * ============================================================ */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

/* 保活兜底：偶发的流/网络错误只记日志，不让进程退出 */
process.on("uncaughtException", (err) =>
  console.error("[uncaughtException]", err && err.message)
);
process.on("unhandledRejection", (err) =>
  console.error("[unhandledRejection]", err)
);

/* ---------- 读取 .env（零依赖） ---------- */
function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = fs.readFileSync(path.join(__dirname, ".env"), "utf8");
    txt.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    });
  } catch (e) {
    /* .env 不存在则忽略 */
  }
  return env;
}
const env = loadEnv();

const API_KEY = env.OPENAI_API_KEY || "";
const BASE_URL = (env.OPENAI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
const MODEL = env.OPENAI_MODEL || "deepseek-chat";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1_000_000) {
        reject(new Error("body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

/* ---------- AI 对话代理 ---------- */
async function handleChat(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, { error: "服务器未配置 API key，请联系站长。" });
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (e) {
    return sendJson(res, 400, { error: "请求体格式错误。" });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) return sendJson(res, 400, { error: "messages 不能为空。" });

  /* 简单防护：限制条数与总长度，避免恶意刷额度 */
  if (messages.length > 40) return sendJson(res, 400, { error: "消息条数过多。" });
  const totalLen = messages.reduce(
    (s, m) => s + (m && m.content ? String(m.content).length : 0),
    0
  );
  if (totalLen > 20000) return sendJson(res, 400, { error: "内容过长。" });

  const url = BASE_URL + "/chat/completions";
  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + API_KEY,
      },
      body: JSON.stringify({ model: MODEL, messages, stream: true }),
    });
  } catch (e) {
    return sendJson(res, 502, { error: "无法连接模型服务，请稍后重试。" });
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return sendJson(res, upstream.status, { error: "模型返回错误：" + text.slice(0, 300) });
  }

  /* 把上游 SSE 流原样转发给前端 */
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  const stream = Readable.fromWeb(upstream.body);
  /* 关键：必须挂 error 处理，否则任何流错误都会让进程崩溃 */
  stream.on("error", () => {
    try { res.end(); } catch (e) {}
  });
  stream.pipe(res);
  res.on("close", () => {
    /* 仅在客户端提前断开时才中断上游；正常结束后不要动流，
       避免取消竞态触发未处理错误导致进程退出 */
    if (!res.writableEnded) {
      try { stream.destroy(); } catch (e) {}
    }
  });
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (e) {
    return sendJson(res, 400, { error: "Bad Request" });
  }

  if (pathname === "/api/chat" && req.method === "POST") {
    return handleChat(req, res);
  }
  if (pathname.startsWith("/api/")) {
    return sendJson(res, 404, { error: "Not Found" });
  }

  /* 静态文件服务 */
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      /* SPA 回退到 index.html */
      return fs.readFile(path.join(PUBLIC_DIR, "index.html"), (e2, d2) => {
        if (e2) return sendJson(res, 404, { error: "Not Found" });
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(d2);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("jiayi-blog 已启动：http://localhost:" + PORT);
  console.log(
    API_KEY
      ? "模型已配置：" + MODEL
      : "⚠️  未配置 OPENAI_API_KEY，AI 暂不可用（请编辑 .env）"
  );
});
