/**
 * GLaDOS 自动签到脚本 (GitHub Actions 版)
 * 支持通知：Discord, ServerChan, PushPlus
 */

const glados = async () => {
  const cookie = process.env.GLADOS
  if (!cookie) return
  try {
    const headers = {
      'cookie': cookie,
      'origin': 'https://glados.cloud',
      'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      'content-type': 'application/json;charset=UTF-8'
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

    return [
      checkin.code === 0 ? 'GLaDOS Checkin Success' : 'GLaDOS Checkin Failed',
      `Message: ${checkin.message}`,
      `Remaining Days: ${status.data ? Math.floor(status.data.leftDays) : 'Unknown'}`,
    ]
  } catch (error) {
    return ['GLaDOS Checkin Error', `${error.message}`, `Check Actions Log`]
  }
}

/**
 * Discord 通知
 * 需要变量：DISCORD_WEBHOOK
 */
const notifyDiscord = async (contents) => {
  const webhookUrl = process.env.DISCORD_WEBHOOK;
  if (!webhookUrl) return;

  const isError = contents[0].includes('Failed') || contents[0].includes('Error');
  // 失败时可以在前面加点表情引起注意，你也可以加上 @everyone (需确保 Discord 频道权限允许)
  const prefix = isError ? "🚨 **[警报]** " : "✅ ";
  const textContent = `${prefix}**${contents[0]}**\n${contents.slice(1).join('\n')}`;

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: textContent
      })
    });
    console.log("Discord 通知发送成功");
  } catch (e) {
    console.error("Discord 通知发送失败:", e);
  }
}

/**
 * Server酱 通知
 * 需要变量：SCTKEY
 */
const notifyServerChan = async (contents) => {
  const sctKey = process.env.SCTKEY;
  if (!sctKey) return;

  const url = `https://sctapi.ftqq.com/${sctKey}.send`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        title: contents[0],
        desp: contents.join('\n\n')
      })
    });
    console.log("Server酱通知发送成功");
  } catch (e) {
    console.error("Server酱通知发送失败:", e);
  }
}

/**
 * PushPlus 通知
 * 需要变量：NOTIFY
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
        content: contents.join('<br>'),
        template: 'markdown',
      }),
    });
    console.log("PushPlus 通知发送成功");
  } catch (e) {
    console.error("PushPlus 通知发送失败:", e);
  }
}

const main = async () => {
  const result = await glados();
  if (!result) {
    console.log("未配置 GLADOS Cookie，脚本终止");
    return;
  }

  // 1. 打印日志
  console.log(result);
  
  // 2. 依次执行多平台通知
  await Promise.allSettled([
    notifyPushPlus(result),
    notifyServerChan(result),
    notifyDiscord(result)
  ]);
}

main();
