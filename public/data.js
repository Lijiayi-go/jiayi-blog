/* ============================================================
 * data.js —— 网站全部内容都在这一个文件里，改这里即可更新站点
 * ============================================================ */

const SITE = {
  name: "李嘉翊",
  role: "本科生 · 开发者",
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
    desc: "在校期间系统学习专业课程，参与课程项目与开发实践。",
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
    "你好，我是李嘉翊，目前就读于三亚学院。喜欢写代码、折腾各种有趣的技术，也喜欢记录生活和思考。这个博客是我的一个小天地，用来沉淀学习笔记、分享想法，也欢迎你随时来聊。",
  interests: ["编程", "摄影", "阅读", "跑步"],
  contact: [
    { label: "邮箱", value: "18842096211@163.com", link: "mailto:18842096211@163.com" },
    { label: "GitHub", value: "github.com/Lijiayi-go", link: "https://github.com/Lijiayi-go" },
  ],
};

/* 暴露到全局（供 app.js / chat.js 使用） */
window.SITE = SITE;
window.EDUCATION = EDUCATION;
window.SKILLS = SKILLS;
window.PROJECTS = PROJECTS;
window.MOMENTS = MOMENTS;
window.ABOUT = ABOUT;
