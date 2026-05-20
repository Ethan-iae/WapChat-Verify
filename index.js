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

        const ADMIN_SECRET = env.ADMIN_SECRET;
        const APPROVE_API = env.APPROVE_API;
        const REJECT_API = env.REJECT_API;

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

            let html = `<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <title>管理后台 - 审核列表</title>
    <style type="text/css">
        body { 
            font-family: "MS PGothic", Arial, Tahoma, sans-serif; 
            margin: 0; 
            padding: 15px;
            background: #e6e6e6; 
            color: #333333; 
            font-size: 12px;
            line-height: 1.5;
        }
        .container { max-width: 600px; margin: 0 auto; }
        .header { 
            background: #a3a3a3; 
            color: #ffffff; 
            padding: 4px 8px; 
            font-size: 11px;
            font-weight: bold;
            letter-spacing: 1px;
            margin-bottom: 15px;
        }
        .card { 
            background: #ffffff; 
            border: 1px solid #cccccc; 
            margin-bottom: 15px; 
            padding: 12px; 
        }
        .meta { 
            font-size: 10px; 
            color: #777777; 
            margin-bottom: 10px; 
            padding-bottom: 8px; 
            border-bottom: 1px dotted #cccccc; 
        }
        .meta div { display: inline-block; margin-right: 15px; }
        .label { 
            font-size: 11px; 
            font-weight: bold; 
            color: #cc0033;
        }
        .account-name { 
            font-size: 14px; 
            font-weight: bold; 
            color: #333333; 
            margin-left: 5px;
        }
        .reason-box { 
            padding: 10px; 
            background: #f9f9f9;
            border: 1px solid #eeeeee;
            color: #555555; 
            margin: 10px 0; 
            white-space: pre-wrap;
        }
        .btn { 
            padding: 3px 8px;
            font-size: 11px;
            font-family: "MS PGothic", Arial, sans-serif;
            border: 1px solid #999999;
            background: #efefef;
            color: #333333;
            cursor: pointer;
        }
        .btn:hover { background: #dddddd; }
        .action-links { 
            border-top: 1px dotted #cccccc;
            padding-top: 10px;
            text-align: right;
        }
        .action-links form { display: inline; margin: 0 0 0 5px; }
        .empty-state { text-align: center; padding: 30px; border: 1px dotted #cccccc; color: #777777; background: #ffffff; }
        .warning-banner { background: #fff3cd; border: 1px solid #ffeeba; padding: 10px; margin-bottom: 15px; color: #856404; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">&gt;&gt; ADMIN PANEL : 审核列表</div>
`;

            if (list.keys.length === 0) {
                html += `<div class="empty-state">目前没有积压的审核请求。</div>`;
            }

            const reversedKeys = list.keys.reverse();
            let subRequestCount = 0;
            const MAX_ALLOWED = 45;

            for (const key of reversedKeys) {
                const account = key.name;
                if (account.startsWith("IP_")) continue;

                if (subRequestCount >= MAX_ALLOWED) {
                    html += `<div class="warning-banner">提示：由于限制，剩余记录未显示。请处理完当前记录后刷新。</div>`;
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

                html += `
                <div class="card">
                    <div class="meta">
                        <div>[ DATE ] ${data.time || '-'}</div>
                        <div>[ LOC ] ${data.location || '-'}</div>
                        <div>[ IP ] ${data.ip || '-'}</div>
                    </div>
                    <div>
                        <span class="label">&gt;&gt; ACCOUNT</span>
                        <span class="account-name">${escapeHtml(account)}</span>
                    </div>
                    <div class="reason-box">${escapeHtml(data.reason)}</div>
                    
                    <div class="action-links">
                        <form method="POST" action="/admin/approve_action">
                            <input type="hidden" name="token" value="${ADMIN_SECRET}">
                            <input type="hidden" name="account" value="${account}">
                            <button type="submit" class="btn">激活并清理 (APPROVE)</button>
                        </form>
                        <form method="POST" action="/admin/delete">
                            <input type="hidden" name="token" value="${ADMIN_SECRET}">
                            <input type="hidden" name="account" value="${account}">
                            <button type="submit" class="btn" style="color: #cc0033;">拒绝并清理 (REJECT)</button>
                        </form>
                    </div>
                </div>`;
            }
            html += `</div></body></html>`;
            return new Response(html, { headers: { "content-type": "text/html;charset=UTF-8" } });
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 激活失败</h2><p>无法连接主站激活 MongoDB 的数据，因此验证站本地的记录被保留，以防止数据不一致。</p><p style="color: red;">错误详情：${escapeHtml(e.message)}</p><br/><br/><a href="/admin?token=${ADMIN_SECRET}" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">返回后台</a></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
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
                return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>激活报错</title></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 激活时发生报错</h2><p>${escapeHtml(err.message)}</p></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 拒绝失败</h2><p>无法连接主站删除 MongoDB 的数据，因此验证站本地的记录被保留，以防止数据不一致。</p><p style="color: red;">错误详情：${escapeHtml(e.message)}</p><br/><br/><a href="/admin?token=${ADMIN_SECRET}" style="padding: 10px 20px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px;">返回后台</a></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
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
                return new Response(`<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//WAPFORUM//DTD XHTML Mobile 1.0//EN" "http://www.wapforum.org/DTD/xhtml-mobile10.dtd">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="application/xhtml+xml; charset=utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>删除报错</title></head><body style="padding: 20px; font-family: sans-serif;"><h2>❌ 删除时发生报错</h2><p>${escapeHtml(err.message)}</p></body></html>`, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" } });
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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" /><title>系统错误</title></head><body style="padding:5px;font-family:sans-serif;"><h2 style="color:red;font-size:16px;">提交失败</h2><p>系统报错：<b>${escapeHtml(err.message)}</b></p><p>请检查 Cloudflare 设置。</p></body></html>`;
                return new Response(errorHtml, { headers: { "content-type": "application/xhtml+xml;charset=UTF-8" }, status: 500 });
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