/* ============================================================
 * fc-index.js —— 阿里云函数计算（FC）HTTP 触发器入口
 *
 * 为什么需要这个文件：
 *   server.js 是「自己 listen 端口」的传统 HTTP 服务，跑在普通服务器上；
 *   函数计算 FC 不让你自己监听端口，而是要求你导出一个 handler 函数。
 *
 * 本文件复用 server.js 的 AI 代理逻辑 + 静态托管逻辑，只是：
 *   1. 把请求/响应包成 FC 的 event / 返回对象
 *   2. AI 接口改为「一次性返回完整文本」（FC 不支持 SSE 流式）
 *
 * 部署时在控制台把「请求处理程序」填： fc-index.handler
 * ============================================================ */

const fs = require("fs");
const path = require("path");

const PUBLIC_DIR = path.join(__dirname, "public");

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

/* 从 FC 环境变量读模型配置（在控制台「环境变量」里填） */
function getConfig() {
  const key = process.env.OPENAI_API_KEY || "";
  const base = (process.env.OPENAI_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = process.env.OPENAI_MODEL || "deepseek-chat";
  return { key, base, model };
}

/* 读静态文件（同步，FC 里文件在代码包内） */
function readStatic(rel) {
  const filePath = path.join(PUBLIC_DIR, rel);
  if (!filePath.startsWith(PUBLIC_DIR)) return null;
  try {
    return fs.readFileSync(filePath);
  } catch (e) {
    return null;
  }
}

/* 一次性调用模型，返回完整文本 */
async function callModel(messages) {
  const { key, base, model } = getConfig();
  if (!key) {
    return { error: "服务器未配置 API key，请联系站长。" };
  }

  const url = base + "/chat/completions";
  let upstream;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify({ model, messages, stream: false }),
    });
  } catch (e) {
    return { error: "无法连接模型服务，请稍后重试。" };
  }

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return { error: "模型返回错误：" + text.slice(0, 300) };
  }

  try {
    const json = await upstream.json();
    const content =
      json.choices && json.choices[0] && json.choices[0].message
        ? json.choices[0].message.content
        : "";
    return { content: content || "" };
  } catch (e) {
    return { error: "解析模型返回失败。" };
  }
}

/* FC 的 handler：event 是 JSON 字符串，含 path/method/body/headers 等 */
exports.handler = async (event, context) => {
  let req;
  try {
    req = JSON.parse(event);
  } catch (e) {
    req = {};
  }

  const pathname = (req.rawPath || req.path || "/").split("?")[0];
  /* FC 3.0 的 method 在 requestContext.http.method 里，兼容多种格式 */
  const method = (
    (req.requestContext && req.requestContext.http && req.requestContext.http.method) ||
    req.method || "GET"
  ).toUpperCase();

  /* ---------- AI 接口 ---------- */
  if (pathname === "/api/chat" && method === "POST") {
    let body = {};
    try {
      const raw = req.body || "";
      body = JSON.parse(req.isBase64Encoded ? Buffer.from(raw, "base64").toString("utf-8") : raw);
    } catch (e) {}

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (messages.length === 0) {
      return { statusCode: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "messages 不能为空。" }) };
    }
    if (messages.length > 40) {
      return { statusCode: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "消息条数过多。" }) };
    }
    const totalLen = messages.reduce((s, m) => s + (m && m.content ? String(m.content).length : 0), 0);
    if (totalLen > 20000) {
      return { statusCode: 400, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "内容过长。" }) };
    }

    const result = await callModel(messages);
    if (result.error) {
      return { statusCode: 500, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: result.error }) };
    }
    /* 一次性返回完整文本；前端会做「模拟打字」效果 */
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ content: result.content }),
    };
  }

  /* ---------- 其他 /api/ 返回 404 ---------- */
  if (pathname.startsWith("/api/")) {
    return { statusCode: 404, headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ error: "Not Found" }) };
  }

  /* ---------- 静态文件 ---------- */
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const data = readStatic(rel) || readStatic("index.html"); // 未命中回退首页
  if (!data) {
    return { statusCode: 404, headers: { "Content-Type": "text/plain; charset=utf-8" }, body: "Not Found" };
  }
  const ext = path.extname(rel).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  /* 纯文本类直接返回；二进制（图片等）需 base64 */
  const isText = /^(text\/|application\/(json|javascript)|image\/svg)/.test(contentType);
  if (isText) {
    return { statusCode: 200, headers: { "Content-Type": contentType }, body: data.toString("utf-8") };
  }
  return {
    statusCode: 200,
    headers: { "Content-Type": contentType },
    body: data.toString("base64"),
    isBase64Encoded: true,
  };
};
