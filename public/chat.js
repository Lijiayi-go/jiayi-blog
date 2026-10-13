/* ============================================================
 * chat.js —— AI 问答（「小嘉翊」，流式对话）
 * 调用本服务端 /api/chat 接口（key 在服务端，前端不接触）
 * ============================================================ */

(function () {
  const widget = document.getElementById("chat-widget");
  const toggle = document.getElementById("chat-toggle");
  const panel = document.getElementById("chat-panel");
  const body = document.getElementById("chat-body");
  const input = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const clearBtn = document.getElementById("chat-clear");

  let generating = false;
  let controller = null;

  /* 应用自管的对话历史（有界，最多保留最近 12 条） */
  let history = [];

  /* 系统提示：让 AI 知道它是谁、能答什么 */
  function buildSystemPrompt() {
    const edu = (window.EDUCATION || [])
      .map((e) => `${e.school} ${e.degree}（${e.period}，专业：${e.major}）`)
      .join("；");
    const skills = (window.SKILLS || []).map((s) => (typeof s === "string" ? s : s.name)).join("、");
    const projs = (window.PROJECTS || []).map((p) => p.name).join("、");
    return (
      `你是「小嘉翊」，是「${window.SITE.name}」个人博客的 AI 助手，负责接待访客。\n` +
      `你可以基于以下真实信息回答关于博主的问题：\n` +
      `- 姓名：${window.SITE.name}；定位：${window.SITE.role}；所在地：${window.SITE.location}\n` +
      `- 教育经历：${edu || "暂无"}\n` +
      `- 技能：${skills || "暂无"}\n` +
      `- 项目：${projs || "暂无"}\n` +
      `要求：回答简洁友好、用中文；只基于以上信息作答，不要编造博主没有的经历；` +
      `超出这些信息的问题可以友好闲聊或礼貌说明你不知道。`
    );
  }

  function addMessage(role, text, isError) {
    const div = document.createElement("div");
    div.className = "msg " + role + (isError ? " error" : "");
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function greet() {
    addMessage(
      "ai",
      "你好呀，我是「小嘉翊」🤖，是「" + (window.SITE.name || "博主") + "」的 AI 助手\n关于他的教育经历、技能、项目，或者任何其他问题，都可以问我～"
    );
  }

  async function send() {
    const text = input.value.trim();
    if (!text || generating) return;

    addMessage("user", text);
    input.value = "";
    input.style.height = "auto";
    setGenerating(true);

    /* messages：system + 有界历史 + 本次提问 */
    const messages = [
      { role: "system", content: buildSystemPrompt() },
      ...history,
      { role: "user", content: text },
    ];

    const answerDiv = addMessage("ai", "");
    let fullText = "";
    controller = new AbortController();

    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        let msg = "抱歉，回答出错了，请稍后重试。";
        try {
          const j = await resp.json();
          if (j && j.error) msg = j.error;
        } catch (e) {}
        throw new Error(msg);
      }

      /* 解析 SSE 流，逐段渲染 */
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices && json.choices[0] && json.choices[0].delta;
            if (delta && delta.content) {
              fullText += delta.content;
              answerDiv.textContent = fullText;
              body.scrollTop = body.scrollHeight;
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      if (err && err.name === "AbortError") {
        if (fullText) fullText += "\n\n（已停止）";
      }
      if (!fullText) {
        answerDiv.className = "msg ai error";
        answerDiv.textContent = err && err.message ? err.message : "网络异常，请稍后重试。";
      } else {
        answerDiv.textContent = fullText;
      }
    } finally {
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: fullText || "（未生成）" });
      if (history.length > 12) history = history.slice(-12);
      setGenerating(false);
      controller = null;
    }
  }

  function setGenerating(on) {
    generating = on;
    sendBtn.disabled = on;
    input.disabled = on;
  }

  function clearChat() {
    history = [];
    body.innerHTML = "";
    greet();
  }

  /* ---------- 事件绑定 ---------- */
  toggle.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !opening;
    widget.classList.toggle("open", opening);
    if (opening) {
      if (body.children.length === 0) greet();
      input.focus();
    }
  });

  sendBtn.addEventListener("click", send);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  clearBtn.addEventListener("click", clearChat);
})();
