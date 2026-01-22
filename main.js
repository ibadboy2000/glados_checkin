const glados = async () => {
  const cookie = process.env.GLADOS
  if (!cookie) return
  try {
    // 1. 修改 Headers 以匹配截图
    const headers = {
      'cookie': cookie,
      'origin': 'https://glados.cloud',
      'user-agent': 'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36',
      'content-type': 'application/json;charset=UTF-8'
    }

    // 2. 修改请求体 (Payload)
    // 截图 Content-Length 为 24，对应 '{"token":"glados.cloud"}'
    const checkin = await fetch('https://glados.cloud/api/user/checkin', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ "token": "glados.cloud" }), 
    }).then((r) => r.json())

    // 3. 获取状态 (Headers 复用即可)
    const status = await fetch('https://glados.cloud/api/user/status', {
      method: 'GET',
      headers: headers,
    }).then((r) => r.json())

    return [
      'Checkin OK',
      `${checkin.message}`,
      `Left Days ${Number(status.data.leftDays)}`,
    ]
  } catch (error) {
    return [
      'Checkin Error',
      `${error}`,
      `<${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}>`,
    ]
  }
}

const notify = async (contents) => {
  const token = process.env.NOTIFY
  if (!token || !contents) return
  await fetch(`https://www.pushplus.plus/send`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      token,
      title: contents[0],
      content: contents.join('<br>'),
      template: 'markdown',
    }),
  })
}

const main = async () => {
  await notify(await glados())
}

main()
