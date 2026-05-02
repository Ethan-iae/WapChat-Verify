export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        const escapeHtml = (unsafe) => {
            return String(unsafe)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        // 1. 从 Cloudflare 环境变量/机密中读取
        const ADMIN_SECRET = env.ADMIN_SECRET;
        const APPROVE_API = env.APPROVE_API;
        const REJECT_API = env.REJECT_API;

        // 2. 检查必须的机密是否已配置
        if (!ADMIN_SECRET) {
            return new Response("系统配置错误：未设置 ADMIN_SECRET 环境变量/机密。", { status: 500, headers: { "content-type": "text/plain;charset=UTF-8" } });
        }
        if (!APPROVE_API || !REJECT_API) {
            console.warn("警告：未设置 APPROVE_API 或 REJECT_API 环境变量。如果需要联动主站，请务必设置。");
        }

        if (url.pathname === "/admin") {
            const token = url.searchParams.get("token");
            if (token !== ADMIN_SECRET) return new Response("权限拒绝：秘钥错误", { status: 403 });

            if (!env.VERIFY_KV) {
                return new Response("错误：找不到 VERIFY_KV 数据库绑定！请去 Cloudflare 设置页面绑定。", { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
            }

            const list = await env.VERIFY_KV.list();

            let html = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />


    
    <title>管理后台 - 审核列表</title>
    
    <style type="text/css">
/* <![CDATA[ */

        :root {
            --primary: #000;
            --bg: #f8f9fa;
            --card-bg: #fff;
            --text: #1a1a1a;
            --text-muted: #666;
            --border: #000;
            --danger: #d00;
            --warning: #b70;
        }
        * { box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
            margin: 0; 
            background: var(--bg); 
            color: var(--text); 
            line-height: 1.5; 
        }
        .container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        header { 
            border-bottom: 3px solid var(--primary); 
            margin-bottom: 30px; 
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
        
        .admin-tools { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 30px; 
        }
        @media (max-width: 600px) { 
            .admin-tools { grid-template-columns: 1fr; } 
            header { flex-direction: column; align-items: flex-start; gap: 10px; }
        }

        .tool-card { 
            background: var(--card-bg); 
            border: 1px solid var(--primary); 
            padding: 15px; 
        }
        .tool-card p { margin: 0 0 10px 0; font-size: 13px; font-weight: bold; }

        .list-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        @media (max-width: 350px) {
            .list-grid { grid-template-columns: 1fr; }
        }

        .card { 
            background: var(--card-bg); 
            border: 1px solid var(--primary); 
            padding: 20px; 
            display: flex; 
            flex-direction: column; 
            position: relative;
        }
        .card:hover { box-shadow: 4px 4px 0 var(--primary); }

        .meta { 
            font-size: 12px; 
            color: var(--text-muted); 
            margin-bottom: 15px; 
            padding-bottom: 10px; 
            border-bottom: 1px dashed #ccc; 
        }
        .meta div { margin-bottom: 2px; }
        
        .account-info { margin-bottom: 15px; }
        .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: var(--text-muted); display: block; }
        .account-name { font-size: 18px; font-weight: bold; color: var(--danger); word-break: break-all; }
        
        .reason-box { 
            background: #f0f0f0; 
            padding: 10px; 
            font-size: 14px; 
            margin-bottom: 20px; 
            flex-grow: 1; 
            white-space: pre-wrap;
            border-left: 3px solid var(--primary);
        }

        .btn { 
            display: inline-block;
            width: 100%;
            padding: 10px;
            font-size: 13px;
            font-weight: bold;
            text-align: center;
            text-decoration: none;
            border: 1px solid var(--primary);
            background: #fff;
            color: var(--primary);
            cursor: pointer;
            border-radius: 0;
            transition: all 0.1s;
            margin-bottom: 8px;
        }
        .btn:hover { background: var(--primary); color: #fff; }
        .btn-danger { color: var(--danger); border-color: var(--danger); }
        .btn-danger:hover { background: var(--danger); color: #fff; }
        .btn-warn { color: var(--warning); border-color: var(--warning); }
        .btn-warn:hover { background: var(--warning); color: #fff; }
        
        .action-links { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
        .action-links .btn { margin-bottom: 0; }

        .warning-banner { 
            background: #fff3cd; 
            color: #856404; 
            padding: 15px; 
            border: 1px solid #ffeeba; 
            margin-bottom: 20px; 
            font-size: 14px; 
            font-weight: bold;
        }
        .empty-state { text-align: center; padding: 50px 20px; border: 2px dashed #ccc; color: #999; }
    
/* ]]> */
</style>
</head>
<body>
    <div class="container">
        <header>
            <h1>审核列表</h1>
            <span style="font-size: 12px; font-weight: bold; background: #000; color: #fff; padding: 2px 6px;">ADMIN PANEL</span>
        </header>

        <div class="admin-tools">
            <div class="tool-card">
                <p>🛡️ 攻击防御</p>
                <form method="POST" action="/admin/clear-all-attacks">
                    <input type="hidden" name="token" value="${ADMIN_SECRET}" />
                    <button type="submit" class="btn btn-danger" onclick="return confirm('确定要清空所有攻击记录吗？');">一键清理攻击记录</button>
                </form>
            </div>
            <div class="tool-card">
                <p>☢️ 终极清理</p>
                <form method="POST" action="/admin/nuke-all">
                    <input type="hidden" name="token" value="${ADMIN_SECRET}" />
                    <button type="submit" class="btn btn-warn" onclick="return confirm('警告：这将删除所有待审核记录并同步 MongoDB！确定吗？');">暴力清空所有记录</button>
                </form>
            </div>
        </div>
`;

            if (list.keys.length === 0) {
                html += `<div class="empty-state"><h3>太棒了！</h3><p>目前没有积压的审核请求。</p></div>`;
            }

            const reversedKeys = list.keys.reverse();
            let subRequestCount = 0;
            const MAX_ALLOWED = 45;

            html += `<div class="list-grid">`;

            for (const key of reversedKeys) {
                const account = key.name;
                if (account.startsWith("IP_")) continue;

                if (subRequestCount >= MAX_ALLOWED) {
                    html += `</div><div class="warning-banner">⚠️ 提示：由于 Cloudflare 限制，剩余记录未显示。请处理完当前记录后刷新。</div><div>`;
                    break;
                }

                subRequestCount++;
                const rawValue = await env.VERIFY_KV.get(account);
                if (!rawValue) continue;

                let data;
                try {
                    data = JSON.parse(rawValue);
                } catch (e) {
                    data = { reason: rawValue, time: "旧数据", ip: "-", location: "-" };
                }

                const approveUrl = `${APPROVE_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(account)}`;
                const rejectUrl = `${REJECT_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(account)}`;

                html += `
                <div class="card">
                    <div class="meta">
                        <div>🕒 ${data.time || '-'}</div>
                        <div>📍 ${data.location || '-'}</div>
                        <div>🌐 ${data.ip || '-'}</div>
                    </div>
                    <div class="account-info">
                        <span class="label">申请账号</span>
                        <span class="account-name">${escapeHtml(account)}</span>
                    </div>
                    <span class="label">留言内容</span>
                    <div class="reason-box">${escapeHtml(data.reason)}</div>
                    
                    <div class="action-links">
                        <form method="POST" action="/admin/approve_action" style="margin: 0;">
                            <input type="hidden" name="token" value="${ADMIN_SECRET}" />
                            <input type="hidden" name="account" value="${account}" />
                            <button type="submit" class="btn" style="background: #eef; border-color: #008;">1. 激活并清理</button>
                        </form>
                        <form method="POST" action="/admin/delete" style="margin: 0;">
                            <input type="hidden" name="token" value="${ADMIN_SECRET}" />
                            <input type="hidden" name="account" value="${account}" />
                            <button type="submit" class="btn btn-danger" style="background: #fff3e0; border-color: #f60; color: #f60;">2. 拒绝并清理</button>
                        </form>
                    </div>
                </div>`;
            }
            html += `</div></div></body></html>`;
            return new Response(html, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
        }

        if (url.pathname === "/admin/approve_action" && request.method === "POST") {
            try {
                const formData = await request.formData();
                if (formData.get("token") !== ADMIN_SECRET) return new Response("拒绝访问", { status: 403 });

                const account = formData.get("account");
                if (account) {
                    const accountStr = account.toString();
                    
                    try {
                        const approveUrl = `${APPROVE_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(accountStr)}`;
                        const res = await fetch(approveUrl);
                        if (!res.ok) {
                            const errText = await res.text();
                            throw new Error(`主站返回状态码 ${res.status}: ${errText}`);
                        }
                    } catch (e) {
                        console.error("同步 MongoDB 失败:", e);
                        return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 激活失败</h2><p>无法连接主站激活 MongoDB 的数据，因此验证站本地的记录被保留，以防止数据不一致。</p><p style="color: red;">错误详情：${e.message}</p><br/><br/><a href="/admin?token=${ADMIN_SECRET}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">返回后台</a></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
                    }

                    const rawValue = await env.VERIFY_KV.get(accountStr);
                    if (rawValue) {
                        try {
                            const data = JSON.parse(rawValue);
                            if (data.ip && data.ip !== "未知IP") {
                                await env.VERIFY_KV.delete(`IP_${data.ip}`);
                            }
                        } catch (e) {}
                    }
                    await env.VERIFY_KV.delete(accountStr);
                }
                return Response.redirect(`${url.origin}/admin?token=${ADMIN_SECRET}`, 302);
            } catch (err) {
                return new Response(`❌ 激活时发生报错：${err.message}`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
            }
        }

        if (url.pathname === "/admin/delete" && request.method === "POST") {
            try {
                const formData = await request.formData();
                if (formData.get("token") !== ADMIN_SECRET) return new Response("拒绝访问", { status: 403 });

                const account = formData.get("account");
                if (account) {
                    const accountStr = account.toString();
                    
                    try {
                        const rejectUrl = `${REJECT_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(accountStr)}`;
                        const res = await fetch(rejectUrl);
                        if (!res.ok) {
                            const errText = await res.text();
                            throw new Error(`主站返回状态码 ${res.status}: ${errText}`);
                        }
                    } catch (e) {
                        console.error("同步 MongoDB 失败:", e);
                        return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 拒绝失败</h2><p>无法连接主站删除 MongoDB 的数据，因此验证站本地的记录被保留，以防止数据不一致。</p><p style="color: red;">错误详情：${e.message}</p><br/><br/><a href="/admin?token=${ADMIN_SECRET}" style="padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px;">返回后台</a></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
                    }

                    const rawValue = await env.VERIFY_KV.get(accountStr);
                    if (rawValue) {
                        try {
                            const data = JSON.parse(rawValue);
                            if (data.ip && data.ip !== "未知IP") {
                                await env.VERIFY_KV.delete(`IP_${data.ip}`);
                            }
                        } catch (e) {}
                    }
                    await env.VERIFY_KV.delete(accountStr);
                }
                return Response.redirect(`${url.origin}/admin?token=${ADMIN_SECRET}`, 302);
            } catch (err) {
                return new Response(`❌ 删除时发生报错：${err.message}`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
            }
        }

        if (url.pathname === "/admin/nuke-all" && request.method === "POST") {
            try {
                const formData = await request.formData();
                if (formData.get("token") !== ADMIN_SECRET) return new Response("拒绝访问", { status: 403 });

                const list = await env.VERIFY_KV.list();
                let subRequestCount = 0;
                let deletedCount = 0;

                for (const key of list.keys) {
                    const account = key.name;
                    
                    let needed = account.startsWith("IP_") ? 1 : 2;
                    if (subRequestCount + needed > 48) break;

                    if (!account.startsWith("IP_")) {
                        try {
                            const rejectUrl = `${REJECT_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(account)}`;
                            await fetch(rejectUrl);
                            subRequestCount++;
                        } catch (e) {}
                    }

                    await env.VERIFY_KV.delete(account);
                    subRequestCount++;
                    deletedCount++;
                }

                return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                
                <style type="text/css">
/* <![CDATA[ */

                    body { font-family: sans-serif; padding: 40px 20px; text-align: center; background: #f8f9fa; }
                    .box { display: inline-block; background: #fff; border: 2px solid #000; padding: 30px; max-width: 400px; width: 100%; }
                    h2 { margin-top: 0; }
                    .btn { display: block; margin-top: 20px; padding: 10px; background: #000; color: #fff; text-decoration: none; font-weight: bold; }
                
/* ]]> */
</style>
                </head><body><div class="box"><h2>清理完成</h2><p>已处理 ${deletedCount} 条记录。</p><p>如有剩余请再次执行。</p><a href="/admin?token=${ADMIN_SECRET}" class="btn">返回后台</a></div></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
            } catch (err) {
                return new Response(`❌ 暴力清理报错：${err.message}`, { status: 500 });
            }
        }

        if (request.method === "POST" && url.pathname === "/") {

            try {
                const formData = await request.formData();
                const account = formData.get("account") ? formData.get("account").toString().trim() : "";
                const reason = formData.get("reason") ? formData.get("reason").toString().trim() : "";
                
                const honeyPot = formData.get("username"); 
                if (honeyPot && honeyPot.length > 0) {
                    return new Response("检测到异常操作", { status: 403 });
                }

                const blacklist = ["auth_err", "err_", "error"];
                if (blacklist.some(word => reason.toLowerCase().includes(word))) {
                    return new Response("留言包含禁止字符，请重新输入真实原因", { status: 403 });
                }

                if (account.length > 20 || reason.length > 300) {
                    return new Response("提交内容过长", { status: 400 });
                }

                if (!account || !reason) {
                    const emptyHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>提交失败</title></head><body style="padding:5px;font-family:sans-serif;"><h2 style="color:red;font-size:16px;">提交失败</h2><p style="font-size:14px;">您的账号或留言为空，请返回重新填写。</p></body></html>`;
                    return new Response(emptyHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 400 });
                }

                if (!env.VERIFY_KV) {
                    throw new Error("后台未正确绑定 VERIFY_KV 数据库！");
                }

                const clientIP = request.headers.get("X-My-Custom-Real-IP") || request.headers.get("CF-Connecting-IP") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "未知IP";

                const isCFProxy = clientIP.startsWith("2a06:98c0");

                if (clientIP !== "未知IP") {
                    const hasSubmitted = await env.VERIFY_KV.get(`IP_${clientIP}`);
                    if (hasSubmitted) {
                        const rejectHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>拒绝提交</title></head><body style="padding:5px;font-family:sans-serif;"><h2 style="color:red;font-size:16px;">提交失败</h2><p style="font-size:14px;">检测到您的网络 (IP: ${clientIP}) 已经提交过申请。</p><p style="font-size:14px;">每人仅限申请一次，请耐心等待管理员审核。</p></body></html>`;
                        return new Response(rejectHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 403 });
                    }
                }

                if (account && reason) {
                    const timeFormatter = new Intl.DateTimeFormat('zh-CN', {
                        timeZone: 'Asia/Shanghai',
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                        hour12: false
                    });
                    const submitTime = timeFormatter.format(new Date());

                    let location = "";
                    let isUS = false;

                    const country = request.headers.get("X-Real-Country") || (request.cf && request.cf.country) || "";
                    const region = request.headers.get("X-Real-Region") || (request.cf && (request.cf.regionName || request.cf.region)) || "";
                    const city = request.headers.get("X-Real-City") || (request.cf && request.cf.city) || "";

                    if (country) {
                        location = `${country} ${region} ${city}`.trim();
                        if (country === "US") isUS = true;
                    }

                    const isIPv6 = clientIP.includes(":");
                    
                    if (!isCFProxy && (!location || location === "未知地域" || (isUS && isIPv6))) {
                        try {
                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 1500);

                            const ipResp = await fetch(`http://ip-api.com/json/${clientIP}?lang=zh-CN`, {
                                signal: controller.signal
                            });
                            clearTimeout(timeoutId);
                            
                            const ipData = await ipResp.json();
                            if (ipData.status === "success") {
                                const newLoc = `${ipData.country || ""} ${ipData.regionName || ""} ${ipData.city || ""}`.trim();
                                if (newLoc) {
                                    location = newLoc + (isUS ? " (CF修正)" : "");
                                }
                            }
                        } catch (e) {
                            if (!location) location = "位置查询超时";
                        }
                    }

                    if (!location) location = "未知地域";
                    
                    if (isCFProxy) {
                        location += " (隐私代理)";
                    }
                    location += ` [${isIPv6 ? "IPv6" : "IPv4"}]`;

                    const logData = {
                        reason: reason,
                        time: submitTime,
                        ip: clientIP,
                        location: location
                    };

                    await env.VERIFY_KV.put(account, JSON.stringify(logData));
                    if (clientIP !== "未知IP") {
                        await env.VERIFY_KV.put(`IP_${clientIP}`, account);
                    }
                }

                const successHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>提交成功</title></head><body style="padding:5px;font-family:sans-serif;"><h2 style="color:green;font-size:16px;">提交成功</h2><p style="font-size:14px;">您的验证信息已安全存入数据库。</p><p style="font-size:14px;">请等待管理员审核。通过后即可在原网站登录。</p></body></html>`;
                return new Response(successHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });

            } catch (err) {
                const errorHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>系统错误</title></head><body style="padding:5px;font-family:sans-serif;"><h2 style="color:red;font-size:16px;">提交失败</h2><p>系统报错：<b>${err.message}</b></p><p>请检查 Cloudflare 设置。</p></body></html>`;
                return new Response(errorHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
            }
        }

        if (url.pathname === "/admin/clear-all-attacks" && request.method === "POST") {
            try {
                const formData = await request.formData();
                if (formData.get("token") !== ADMIN_SECRET) return new Response("拒绝访问", { status: 403 });

                const list = await env.VERIFY_KV.list();
                let subRequestCount = 0;
                let deletedCount = 0;

                for (const key of list.keys) {
                    const account = key.name;
                    if (account.startsWith("IP_")) continue;

                    if (subRequestCount + 4 > 48) break; 

                    subRequestCount++;
                    const rawValue = await env.VERIFY_KV.get(account);
                    if (!rawValue) continue;

                    let isAttack = false;
                    let clientIP = null;

                    try {
                        const data = JSON.parse(rawValue);
                        const reason = data.reason ? data.reason.toLowerCase() : "";
                        clientIP = data.ip;
                        if (reason.includes("auth_err") || reason.includes("err_") || reason.includes("error")) {
                            isAttack = true;
                        }
                    } catch (e) {
                        if (rawValue.includes("auth_err") || rawValue.includes("err_")) {
                            isAttack = true;
                        }
                    }

                    if (isAttack) {
                        try {
                            const rejectUrl = `${REJECT_API}?token=${encodeURIComponent(ADMIN_SECRET)}&account=${encodeURIComponent(account)}`;
                            await fetch(rejectUrl);
                            subRequestCount++;
                        } catch (e) {}

                        await env.VERIFY_KV.delete(account);
                        subRequestCount++;

                        if (clientIP && clientIP !== "未知IP") {
                            await env.VERIFY_KV.delete(`IP_${clientIP}`);
                            subRequestCount++;
                        }
                        deletedCount++;
                    }
                }

                let msg = `已处理 <b>${deletedCount}</b> 条攻击记录。如有剩余请再次点击。`;
                return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                
                <style type="text/css">
/* <![CDATA[ */

                    body { font-family: sans-serif; padding: 40px 20px; text-align: center; background: #f8f9fa; }
                    .box { display: inline-block; background: #fff; border: 2px solid #000; padding: 30px; max-width: 400px; width: 100%; }
                    h2 { margin-top: 0; }
                    .btn { display: block; margin-top: 20px; padding: 10px; background: #000; color: #fff; text-decoration: none; font-weight: bold; }
                
/* ]]> */
</style>
                </head><body><div class="box"><h2>清理完成</h2><p>${msg}</p><a href="/admin?token=${ADMIN_SECRET}" class="btn">返回后台</a></div></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
            } catch (err) {
                return new Response(`❌ 清理时发生报错：${err.message}`, { status: 500 });
            }
        }

        const account = url.searchParams.get('account') || '未知';
        const safeAccount = escapeHtml(account);
        const formHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    
    
        
        
        <title>账号审核</title>
        <style type="text/css">
/* <![CDATA[ */

            /* 全局盒模型重置，确保 100% 宽度不溢出 */
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: sans-serif; background-color: #ffffff; color: #000000; }
            
            /* 1. 标题排版与 nokia.html 完全一致 */
            h2 { 
                font-size: 14px; 
                width: 95%; 
                margin: 0 auto; 
                padding: 2px 0; 
                border-bottom: 2px solid #000; 
                line-height: 18px; 
                height: 24px; 
            }
            
            /* 页面内容容器，保持与标题对齐 */
            .container { width: 95%; margin: 0 auto; }
            p { margin: 5px 0; }
            label { font-weight: bold; display: block; margin-top: 10px; font-size: 13px; }
            
            /* 2. 文本框禁止拖动，宽度占满 */
            textarea { 
                width: 100%; 
                border: 1px solid #000; 
                padding: 3px; 
                font-size: 14px; 
                margin-top: 3px; 
                border-radius: 0; 
                resize: none; /* 禁止拖动 */
                display: block; 
            }
            
            /* 3. 按钮高度与 nokia.html 一致 (27px)，宽度占满 */
            button { 
                width: 100%; 
                height: 27px; 
                border: 1px solid #000; 
                background-color: #dddddd; 
                color: #000;
                font-weight: bold; 
                font-size: 13px;
                margin-top: 15px; 
                cursor: pointer; 
                border-radius: 0; 
                display: block; 
            }
            button:active { background-color: #999999; color: #fff; }
        
/* ]]> */
</style>
    </head>
    <body>
        <h2>安全验证</h2>
        <div class="container">
            <p style="font-size: 12px; color: red;">账号 [<b>${safeAccount}</b>] 需要审核。</p>
            <form method="POST" action="/">
                <!-- 蜜罐陷阱：人类看不见，Bot 会自动填这个字段 -->
                <input type="text" name="username" style="display:none !important;" tabindex="-1" autocomplete="off" />
                
                <input type="hidden" name="account" value="${safeAccount}" />
                <label>请介绍一下您自己：</label>
                <textarea name="reason" rows="3" required='required'></textarea>
                <button type="submit">提 交 审 核</button>
            </form>
        </div>
    </body>
    </html>`;

        return new Response(formHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
    }
};