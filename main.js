/**
 * GLaDOS 自动签到脚本 (多账号防拦截版)
 * 支持通知：Discord, ServerChan, PushPlus
 */

// 接收单独的 cookie 和账号序号
const glados = async (cookie, index) => {
  try {
    // 根据抓包截图，深度伪装请求头以绕过 "Automated check-in detected" 检测
    const headers = {
      'cookie': cookie,
      'origin': 'https://glados.cloud',
      'referer': 'https://glados.cloud/console/checkin',
      'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
      'content-type': 'application/json;charset=UTF-8',
      'accept': 'application/json, text/plain, */*',
      'sec-ch-ua': '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"Android"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'priority': 'u=1, i'
    }

    // 1. 执行签到
    const checkin = await fetch('https://glados.cloud/api/user/checkin', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ "token": "glados.cloud" }), 
    }).then((r) => r.json())

    // 2. 获取会员状态
    const status = await fetch('https://glados.cloud/api/user/status', {
      method: 'GET',
      headers: headers,
    }).then((r) => r.json())

    const isSuccess = checkin.code === 0;
    return {
      success: isSuccess,
      message: [
        `**[账号 ${index + 1}]**: ${isSuccess ? '✅ 签到成功' : '❌ 签到失败'}`,
        `返回信息: ${checkin.message}`,
        `剩余天数: ${status.data ? Math.floor(status.data.leftDays) : '未知'}天`
      ]
    };
  } catch (error) {
    return {
      success: false,
      message: [
        `**[账号 ${index + 1}]**: ❌ 执行异常`,
        `错误详情: ${error.message}`
      ]
    };
  }
}

/**
 * Discord 通知 (Webhook)
 */
const notifyDiscord = async (contents) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;

  const isError = contents[0].includes('失败');
  const prefix = isError ? "🚨 **[警报]** " : "🎉 ";
  const textContent = `${prefix}**${contents[0]}**\n\n${contents.slice(1).join('\n')}`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: textContent })
    });
    console.log("Discord 通知发送成功");
  } catch (e) {
    console.error("Discord 通知发送失败:", e);
  }
}

/**
 * Server酱 通知
 */
const notifyServerChan = async (contents) => {
  const sctKey = process.env.SCTKEY;
  if (!sctKey) return;

  try {
    await fetch(`https://sctapi.ftqq.com/${sctKey}.send`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: contents[0],
        desp: contents.slice(1).join('\n\n')
      })
    });
    console.log("Server酱通知发送成功");
  } catch (e) {
    console.error("Server酱通知发送失败:", e);
  }
}

/**
 * PushPlus 通知
 */
const notifyPushPlus = async (contents) => {
  const token = process.env.NOTIFY;
  if (!token) return;

  try {
    await fetch(`https://www.pushplus.plus/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        token,
        title: contents[0],
        content: contents.slice(1).join('<br>'),
        template: 'markdown',
      }),
    });
    console.log("PushPlus 通知发送成功");
  } catch (e) {
    console.error("PushPlus 通知发送失败:", e);
  }
}

const main = async () => {
  const gladosSecret = process.env.GLADOS;
  if (!gladosSecret) {
    console.log("未配置 GLADOS Cookie，脚本终止");
    return;
  }

  // 核心逻辑：按换行符(\n)或 & 符号切分多个 cookie，并过滤掉空行
  const cookies = gladosSecret.split(/[\n&]/).map(c => c.trim()).filter(c => c.length > 0);
  console.log(`检测到 ${cookies.length} 个账号，开始依次签到...`);

  let allMessages = [];
  let failCount = 0;

  // 循环执行签到
  for (let i = 0; i < cookies.length; i++) {
    const result = await glados(cookies[i], i);
    if (!result.success) failCount++;
    
    // 将单个账号的结果推入消息池，并加个分割线
    allMessages.push(...result.message, '---------------------');
  }

  // 构建统一的标题
  const title = failCount > 0 
    ? `GLaDOS 签到: ${cookies.length}个账号 (${failCount}个失败)` 
    : `GLaDOS 签到: ${cookies.length}个账号全部成功`;

  // 组装最终通知内容 (第一行是标题，后面是正文)
  const finalContents = [title, ...allMessages];

  // 1. 打印本地日志
  console.log(finalContents.join('\n'));
  
  // 2. 批量发送多平台通知
  await Promise.allSettled([
    notifyPushPlus(finalContents),
    notifyServerChan(finalContents),
    notifyDiscord(finalContents)
  ]);
}

main();
