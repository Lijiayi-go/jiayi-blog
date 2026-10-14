# 部署到 lijiayi.top（阿里云 · 轻量应用服务器）

> 目标：把 `E:\jiayi-blog`（Node.js 后端 + 静态前端 + DeepSeek AI 问答）
> 部署到阿里云，并通过自定义域名 `lijiayi.top` 访问。

---

## 一、总体架构

```
访客浏览器
   │  访问 https://lijiayi.top
   ▼
DNS 解析（阿里云云解析）→ A 记录指向服务器公网 IP
   ▼
Nginx（80/443，做反向代理 + HTTPS）
   │  /            → 静态文件 public/
   │  /api/chat    → 127.0.0.1:3000（Node 进程）
   ▼
Node server.js（进程常驻，pm2 守护）
   │  POST /api/chat → DeepSeek API（key 只在服务器 .env 里）
```

关键点：**API key 只存在于服务器 `.env`，绝不下发浏览器**，GitHub 仓库里也没有（`.gitignore` 已排除）。

---

## 二、准备（一次性）

1. **买一台轻量应用服务器**
   - 阿里云控制台 → 轻量应用服务器（SWAS）
   - 地域选离你近的（如「华东1·杭州」或「华北2·北京」）
   - 镜像选 **Ubuntu 22.04**（推荐）或 Debian 12
   - 配置：2核2G 起步即可（个人博客足够，约 ¥100~200/年）
   - 记下 **公网 IP**（形如 `47.xx.xx.xx`）

2. **安全组 / 防火墙放行端口**
   - 放行 `22`（SSH）、`80`（HTTP）、`443`（HTTPS）
   - 轻量服务器在「防火墙」页面直接添加规则即可

3. **确认域名解析在阿里云**
   - 控制台 → 云解析 DNS → 找到 `lijiayi.top`
   - 后面要在这里加 A 记录

---

## 三、连接服务器

用你本地终端（PowerShell / CMD / Git Bash 均可）：

```bash
ssh root@你的公网IP
```

（轻量服务器默认用户是 `root`，密码在控制台「服务器详情」里可以重置）

---

## 四、安装环境（首次，约 5 分钟）

在服务器上依次执行：

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Node.js 20（官方 NodeSource 源）
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. 验证
node -v    # 应显示 v20.x
npm -v

# 4. 安装 pm2（进程守护，重启服务器后自动拉起）
npm install -g pm2

# 5. 安装 Nginx
apt install -y nginx
```

---

## 五、上传代码

**方式 1：从 GitHub 拉取（推荐，因为代码已推到 GitHub）**

```bash
cd /opt
git clone https://github.com/Lijiayi-go/jiayi-blog.git
cd jiayi-blog
```

**方式 2：本地打包上传**（如果不想用 GitHub）

```bash
# 在本地 E:\jiayi-blog 目录打包
tar -czf blog.tar.gz --exclude=.git --exclude=node_modules .

# 上传到服务器
scp blog.tar.gz root@你的公网IP:/opt/
# 然后在服务器解压
cd /opt && mkdir jiayi-blog && tar -xzf blog.tar.gz -C jiayi-blog
```

---

## 六、配置环境变量（API key 在这里填）

在服务器项目目录创建 `.env`：

```bash
cd /opt/jiayi-blog
cat > .env <<'EOF'
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_API_KEY=sk-你的DeepSeek密钥
OPENAI_MODEL=deepseek-flash
PORT=3000
EOF
```

> 把 `sk-你的DeepSeek密钥` 换成你真实的 key。
> **这个 `.env` 不会提交到 GitHub**，只在服务器本地生效。

---

## 七、启动并守护进程

```bash
cd /opt/jiayi-blog

# 用 pm2 启动
pm2 start server.js --name jiayi-blog

# 设置开机自启
pm2 save
pm2 startup
# 执行上面命令输出的那行 sudo 命令（它会帮你配 systemd）

# 查看状态
pm2 status
pm2 logs jiayi-blog
```

本地验证是否跑起来：

```bash
curl http://127.0.0.1:3000/          # 应返回博客首页 HTML
curl -X POST http://127.0.0.1:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"你好"}]}'
# 应看到流式返回的 AI 回复
```

---

## 八、配置 Nginx 反向代理

编辑 Nginx 配置：

```bash
nano /etc/nginx/sites-available/jiayi-blog
```

写入以下内容：

```nginx
server {
    listen 80;
    server_name lijiayi.top www.lijiayi.top;

    # 静态文件 + 后端都交给 Node 处理（server.js 已自带静态托管）
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # AI 流式响应关键：关闭缓冲，否则回复会卡住
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }

    # SSE 长连接
    location /api/chat {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
```

> `proxy_buffering off` 是**必须的**——AI 回复是流式（SSE），
> 如果 Nginx 开了缓冲，访客会等到最后才一次性看到全部文字。

启用配置：

```bash
ln -s /etc/nginx/sites-available/jiayi-blog /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default   # 删掉默认站点
nginx -t           # 测试配置语法
systemctl reload nginx
```

---

## 九、绑定域名（阿里云云解析）

1. 阿里云控制台 → 云解析 DNS → 选中 `lijiayi.top`
2. 添加记录：

| 记录类型 | 主机记录 | 记录值 | TTL |
|---------|---------|--------|-----|
| A | @ | 你的公网IP | 600 |
| A | www | 你的公网IP | 600 |

3. 保存后等 1~10 分钟生效。浏览器访问 `http://lijiayi.top` 应能看到博客。

---

## 十、配置 HTTPS（强烈建议）

AI 功能走 HTTPS 更安全（也避免浏览器拦截）。用 certbot 一键申请免费证书：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d lijiayi.top -d www.lijiayi.top
```

按提示输入邮箱、同意条款，certbot 会自动改 Nginx 配置并续期。

验证自动续期：

```bash
certbot renew --dry-run
```

完成后访问 `https://lijiayi.top` 即为绿色锁 + 全站 HTTPS。

---

## 十一、日常维护

```bash
# 更新代码
cd /opt/jiayi-blog
git pull
pm2 restart jiayi-blog

# 查看日志
pm2 logs jiayi-blog

# 查看进程
pm2 status
```

---

## 常见问题

- **AI 回复卡住 / 一次性蹦出全部文字** → 检查 Nginx 是否加了 `proxy_buffering off`。
- **访问 502** → `pm2 status` 看 Node 是否在跑；`pm2 logs jiayi-blog` 看报错。
- **域名访问不了** → 先 `ping lijiayi.top` 看解析是否指向服务器 IP；再检查防火墙 80/443 是否放行。
- **`/api/chat` 返回 500「未配置 key」** → 检查 `/opt/jiayi-blog/.env` 是否填了正确的 key。
