/* ============================================================
 * data.js —— 网站全部内容都在这一个文件里，改这里即可更新站点
 * ============================================================ */

const SITE = {
  name: "李嘉翊",
  role: "后端开发 · 开发者",
  location: "海南 · 三亚",
  email: "18842096211@163.com",
  github: "https://github.com/Lijiayi-go",
  motto: "保持好奇，持续构建。",
};

/* ---------- 教育经历（首页时间轴） ---------- */
const EDUCATION = [
  {
    school: "三亚学院",
    degree: "本科",
    major: "数据科学与大数据技术",
    period: "2022 – 2026",
    desc: "2026 届毕业生，系统学习专业课程，参与课程项目与开发实践。",
  },
];

/* ---------- 技能栈 ---------- */
const SKILLS = ["Go", "MySQL", "Redis", "Docker", "Agent", "RAG"];

/* ---------- 项目 / 作品 ---------- */
const PROJECTS = [
  {
    name: "项目一（示例）",
    desc: "一句话介绍这个项目做了什么、解决了什么问题。",
    tags: ["Go", "Docker"],
    link: "",
  },
  {
    name: "项目二（示例）",
    desc: "另一个项目的一句话介绍，突出你的贡献和亮点。",
    tags: ["Python", "MySQL"],
    link: "",
  },
  {
    name: "项目三（示例）",
    desc: "再补一个项目，让简历看起来更立体。",
    tags: ["JavaScript"],
    link: "",
  },
];

/* ---------- 瞬间（短动态流） ---------- */
const MOMENTS = [
  {
    date: "2026-10-13",
    content: "个人博客今天上线了，欢迎你来逛一逛，也可以点右下角的「小嘉翊」和我聊聊。",
    tag: "生活",
  },
  {
    date: "2026-10-01",
    content: "假期给自己定了个小目标：把毕设核心模块先跑通，冲！",
    tag: "学习",
  },
  {
    date: "2026-09-15",
    content: "最近在琢磨 AI 应用的开发，感觉「模型 + 好产品」的组合越来越重要了。",
    tag: "思考",
  },
  {
    date: "2026-08-20",
    content: "三亚的晚霞绝了，随手拍了一张，心情都变好了。",
    tag: "生活",
  },
];

/* ---------- 关于我 ---------- */
const ABOUT = {
  intro:
    "你好，我是李嘉翊，2026 年毕业于三亚学院数据科学与大数据技术专业。喜欢写代码、折腾各种有趣的技术，也喜欢记录生活和思考。这个博客是我的一个小天地，用来沉淀学习笔记、分享想法，也欢迎你随时来聊。",
  interests: ["编程", "摄影", "阅读", "跑步"],
  contact: [
    { label: "邮箱", value: "18842096211@163.com", link: "mailto:18842096211@163.com" },
    { label: "GitHub", value: "github.com/Lijiayi-go", link: "https://github.com/Lijiayi-go" },
  ],
};

/* ---------- 个人优势（首页） ---------- */
const STRENGTHS = [
  "熟练运用 AI 智能体辅助研发，掌握 VibeCoding 工作框架，可沉淀标准化开发 skill，有效提升研发交付效率。",
  "精通 RAG 全链路技术，可独立设计混合检索、重排、语义分块方案，具备垂直领域知识库落地与召回效果优化经验。",
  "熟练 Multi-Agent 分层架构设计，掌握 ReAct 推理、工具调用、MCP 协议，可完成智能体编排与长对话记忆管理。",
  "精通 Go 语言底层原理，熟悉 GMP 调度、GC 机制与并发编程，掌握无锁数据结构设计，具备扎实的系统级编码功底。",
  "具备分布式系统实战经验，精通 MySQL 索引优化、Redis 缓存架构、消息队列中间件，熟练落地分布式锁与幂等设计。",
  "Go 后端研发经验，深耕 AI Agent 与企业级 RAG 工程化落地，参与多个智能体项目从 0 到 1 搭建，具备全链路交付能力。",
];

/* ---------- 好友信息（小嘉翊知识库） ---------- */
const FRIENDS = [
  { nickname: "阿鼠", realName: "郭思锐", school: "沈阳农业大学", degree: "研究生", major: "食品学院", direction: "软枣子方向", note: "阿鼠就是郭思锐一个人" },
  { nickname: "ff / 峰峰", realName: "李雲峰", school: "", degree: "", major: "", direction: "", note: "嘉翊的好朋友" },
  { nickname: "jk", realName: "李康威", school: "华东交通大学", degree: "研究生", major: "", direction: "机械方向", note: "嘉翊的好朋友" },
  { nickname: "阿闵", realName: "闵褀淏", school: "武汉大学", degree: "研究生", major: "", direction: "", note: "嘉翊的好朋友" },
  { nickname: "帅夫", realName: "王帅夫", school: "中科院", degree: "研究生", major: "", direction: "", note: "嘉翊的好朋友" },
  { nickname: "尧子", realName: "张智尧", school: "沈阳理工大学", degree: "研究生", major: "", direction: "", note: "嘉翊的好朋友" },
  { nickname: "李梓恒", realName: "李梓恒", school: "三亚学院（本科）→ 新西兰（研究生）", degree: "本科毕业于三亚学院，现于新西兰读研究生", major: "", direction: "", note: "新西兰人，本科期间来三亚学院就读，本科毕业回国（新西兰）读研究生，嘉翊的好朋友" },
  { nickname: "佳姐", realName: "宋志佳", school: "三亚学院", degree: "本科", major: "", direction: "", note: "没有佳姐，李嘉翊本科都毕业不了；嘉翊的好朋友" },
  { nickname: "py", realName: "王鹏宇", school: "", degree: "", major: "", direction: "", note: "专升本上岸；和阿鼠、尧子都是好朋友，嘉翊的好朋友" },
  { nickname: "犀牛", realName: "胡龙斌", school: "三亚学院", degree: "", major: "", direction: "", note: "三亚学院的一头犀牛，嘉翊的好朋友" },
];

/* 暴露到全局（供 app.js / chat.js 使用） */
window.SITE = SITE;
window.EDUCATION = EDUCATION;
window.SKILLS = SKILLS;
window.STRENGTHS = STRENGTHS;
window.PROJECTS = PROJECTS;
window.MOMENTS = MOMENTS;
window.ABOUT = ABOUT;
window.FRIENDS = FRIENDS;
