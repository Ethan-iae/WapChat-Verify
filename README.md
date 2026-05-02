# WapChat QQ - 独立验证与审核站 (VERIFY)

这是一个基于 Cloudflare Workers + KV 数据库构建的独立验证与审核后台，作为 **wapQQ MAIN** (主站) 的配套设施使用。

## ✨ 核心功能
* **用户留言**：注册后引导用户提交申请理由。
* **管理后台**：拥有统一的管理界面，直观查看申请用户的账号、留言、申请时间、IP地址及归属地。
* **一键审批 / 拒绝**：在后台点击按钮，即刻通过 API 联动主站的 MongoDB 数据库，完成放行或清理。
* **安全防护**：内置表单蜜罐 (Honeypot)、IP 限流机制、禁用词过滤，并一键清理恶意攻击刷屏数据。

## 🚀 部署教程 (基于 Cloudflare Workers)

### 1. 准备工作
确保你已经注册了 [Cloudflare](https://dash.cloudflare.com/) 账号，并已经部署好了 `wapQQ MAIN` 主站。

### 2. 创建 KV 数据库
1. 登录 Cloudflare 控制台。
2. 在左侧菜单找到 **Workers & Pages** -> **KV**。
3. 点击 **Create a namespace** (创建命名空间)，命名为 `VERIFY_KV` (或其他你喜欢的名字)。
4. 创建成功后，复制该命名空间的 **ID**。

### 3. 修改配置文件
打开本项目文件夹内的 `wrangler.toml`，修改以下信息：
1. 将 `kv_namespaces` 下的 `id` 替换为你刚刚复制的 KV Namespace ID。
2. 修改 `[vars]` 下的变量，填入你主站的真实接口地址：
   * `APPROVE_API = "https://你的主站域名/admin/approve"`
   * `REJECT_API = "https://你的主站域名/admin/reject"`

### 4. 设置后台管理密码
在 Cloudflare 部署时，不要把密码明文写在代码里。请使用以下两种方式之一设置 `ADMIN_SECRET` (此秘钥需与你主站设置的 `ADMIN_SECRET_TOKEN` 一致)：

* **本地通过 Wrangler 设置** (如果使用命令行)：
  运行 `npx wrangler secret put ADMIN_SECRET` 并输入你的秘钥。
* **网页控制台设置**：
  部署完成后，进入 Cloudflare 控制台 -> Workers -> 你的应用 -> **Settings** -> **Variables and Secrets**，添加一个名为 `ADMIN_SECRET` 的加密机密变量。

### 5. 部署到 Cloudflare
如果你在本地有 Node.js 环境：
1. 在本目录打开终端，运行 `npm install -g wrangler` 安装 Cloudflare CLI 工具。
2. 运行 `wrangler login` 登录你的账号。
3. 运行 `wrangler deploy` 即可一键推送到线上。

如果你没有 Node.js，也可以直接在 Cloudflare 网页端新建一个 Worker，然后把 `index.js` 的代码全选复制进去，并手动在 Settings 里绑定 KV 数据库（绑定变量名为 `VERIFY_KV`）和设置环境变量与 Secret。

---

## 👨‍💻 如何使用

### 访问管理后台
部署成功后，Cloudflare 会分配给你一个域名 (如 `wapchat-verify.xxx.workers.dev`)。
访问以下链接进入管理后台：
`https://你的审核站域名/admin?token=你设置的ADMIN_SECRET`

### 引导用户验证
在 `wapQQ MAIN` 的设置或前端页面报错提示中，可以将验证地址指向：
`https://你的审核站域名/?account=新注册账号名`
用户即可在此页面填写申请理由并提交，数据将自动归集到管理后台中。
