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
  const closeBtn = document.getElementById("chat-close");

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
    const strengths = (window.STRENGTHS || []).map((s, i) => `${i + 1}. ${s}`).join("\n");
    const friends = (window.FRIENDS || [])
      .map((f) => {
        const detail = [f.realName, f.school, f.degree, f.major, f.direction]
          .filter(Boolean)
          .join("，");
        return `${f.nickname}（${detail}；${f.note}）`;
      })
      .join("；\n");
    const features = (window.SITE_FEATURES || []).map((f, i) => `${i + 1}. ${f}`).join("\n");
    return (
      `你是「小嘉翊」，是「${window.SITE.name}」个人博客的 AI 助手，负责接待访客。\n` +
      `你可以基于以下真实信息回答关于博主的问题：\n` +
      `- 姓名：${window.SITE.name}；定位：${window.SITE.role}；所在地：${window.SITE.location}\n` +
      `- 出生年份：2003 年（如果访客问博主多大了，用当前年份减去 2003 计算后回答，不要报错数字）\n` +
      `- 教育经历：${edu || "暂无"}（博主已毕业，是 2026 届毕业生，不是在校生）\n` +
      `- 技能：${skills || "暂无"}\n` +
      `- 项目：${projs || "暂无"}\n` +
      `- 博主的个人优势：\n${strengths || "暂无"}\n` +
      `- 博主的好朋友：\n${friends || "暂无"}\n` +
      `- 这个博客网站自带的功能：\n${features || "暂无"}\n` +
      `要求：回答简洁友好、用中文。\n` +
      `【问题分类】如果访客问的是关于博主本人或其好友的问题（姓名、身份、学校、经历、好友关系等）：` +
      `严格基于以上信息回答，绝不编造；信息里没有的，礼貌说明你不知道；` +
      `问到某位好友时只介绍被问到的那一位，不要主动罗列其他好友，也不要罗列好友清单；` +
      `被问到的人不在信息里时，直接说博主资料里没有这个人。\n` +
      `如果访客问的是关于这个网站本身的功能（比如右下角的宠物、AI 对话、页面布局等）：` +
      `基于上面的「网站自带的功能」信息回答，可以顺便邀请他去体验。\n` +
      `如果访客问的是技术问题（编程、Go、RAG、Agent、架构等）或通用知识：` +
      `不用参考上面的人物信息，直接以你自身的知识专业地回答。`
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

  /* 模拟打字机效果：把一次性文本逐字渲染（FC 环境无 SSE 流时用） */
  function typewrite(el, text) {
    return new Promise((resolve) => {
      let i = 0;
      const step = () => {
        if (i >= text.length) {
          el.textContent = text;
          body.scrollTop = body.scrollHeight;
          resolve();
          return;
        }
        /* 每次多吐几个字符，兼顾速度与流畅 */
        i = Math.min(text.length, i + 2);
        el.textContent = text.slice(0, i);
        body.scrollTop = body.scrollHeight;
        setTimeout(step, 12);
      };
      step();
    });
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

      /* 判断后端类型：SSE 流式 or 一次性 JSON（FC 环境返回 JSON）
         - Content-Type 含 text/event-stream → 走流式解析
         - 否则尝试按 JSON 一次性解析，并做前端模拟打字 */
      const contentType = resp.headers.get("Content-Type") || "";
      if (contentType.indexOf("text/event-stream") !== -1) {
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
      } else {
        /* FC 一次性 JSON 返回：{ content: "..." }，前端做模拟打字 */
        const j = await resp.json();
        const text = (j && j.content) || "";
        fullText = text;
        await typewrite(answerDiv, text);
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

  /* 关闭对话面板 */
  closeBtn.addEventListener("click", () => {
    panel.hidden = true;
    widget.classList.remove("open");
  });
})();
