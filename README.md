# jiayi-blog · 李嘉翊的个人博客

一个带 AI 问答的个人博客，含三个页面（首页简历 / 瞬间 / 关于）+ 右下角「小嘉翊」AI 助手。采用「Node 后端 + 静态前端」架构，模型 API key 只存在服务端，不会泄露给访客。

## 目录结构

```
E:\jiayi-blog\
├── server.js          # Node 后端（零依赖）：托管静态 + /api/chat 代理
├── package.json
├── .env               # ⭐ 模型配置（key 填这里）
├── .env.example
└── public\            # 前端（静态）
    ├── index.html
    ├── style.css
    ├── data.js        # ⭐ 全部内容（姓名/教育/技能/项目/瞬间/关于）改这里
    ├── app.js
    └── chat.js
```

## 1. 配置模型（必做）

编辑 `.env`，填入你的模型信息：

```env
OPENAI_BASE_URL=https://api.deepseek.com     # 平台接口地址
OPENAI_API_KEY=sk-xxxxxxxx                    # 你的 API Key
OPENAI_MODEL=deepseek-chat                    # 模型 ID
```

| 平台 | OPENAI_BASE_URL | 模型 ID 示例 |
|---|---|---|
| DeepSeek | https://api.deepseek.com | deepseek-chat |
| 豆包/火山方舟 | https://ark.cn-beijing.volces.com/api/v3 | ep-xxx 或 doubao-xxx |
| 通义千问 | https://dashscope.aliyuncs.com/compatible-mode/v1 | qwen-plus |
| OpenAI | https://api.openai.com/v1 | gpt-4o-mini |

## 2. 本地运行

```bash
cd E:\jiayi-blog
node server.js
```

浏览器打开 http://localhost:3000 即可。key 填好后，「小嘉翊」就能回复。

## 3. 部署

本项目是标准的 Node HTTP 服务（监听 `PORT` 环境变量），可部署到任意支持 Node 的托管：

- **Railway / Render / VPS / 宝塔**：上传整个文件夹，`npm start`（或 `node server.js`），监听端口由平台注入。
- **注意**：`server.js` 已监听 `0.0.0.0`（`server.listen(PORT)`），无需额外配置。

部署后把你的域名 `lijiayi.top` 解析到该服务即可，AI 与静态页面都能正常工作。

## 4. 修改内容

- 改简历/技能/项目/瞬间/关于 → 编辑 `public/data.js`
- 改 AI 人设 → 编辑 `public/chat.js` 里的 `buildSystemPrompt()`
- 改模型 → 编辑 `.env`

## 安全说明

- API key 只在 `.env`（服务端），前端和访客都看不到。
- 后端对消息条数/长度做了上限，避免被恶意刷额度。
- 部署时确保 `.env` 不被公开（不要把 `.env` 提交到公开仓库）。
