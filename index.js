import figlet from 'figlet';
import fs from 'fs/promises';
import { createInterface } from 'readline/promises';
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import randomUseragent from 'random-useragent';
import ora from 'ora';
import chalk from 'chalk';
import moment from 'moment-timezone';
import crypto from 'crypto';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';

function getTimestamp() {
  return moment().tz('Asia/Jakarta').format('D/M/YYYY, HH:mm:ss');
}

function displayBanner() {
  const width = process.stdout.columns || 80;
  const banner = figlet.textSync('\n NT EXHAUST', { font: "ANSI Shadow", horizontalLayout: 'Speed' });
  banner.split('\n').forEach(line => {
    console.log(chalk.cyanBright(line.padStart(line.length + Math.floor((width - line.length) / 2))));
  });
  console.log(chalk.cyanBright(' '.repeat((width - 50) / 2) + '=== Telegram Channel 🚀 : NT Exhaust ( @NTExhaust ) ==='));
  console.log(chalk.yellowBright(' '.repeat((width - 30) / 2) + '✪ BOT AUTO CHAT ASK_SURF ✪\n'));
}

function displayHeader(text, color, forceClear = false) {
  if (isSpinnerActive) return;
  if (forceClear) console.clear();
  console.log(color(text));
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptUser(question) {
  const answer = await rl.question(chalk.white(question));
  return answer.trim();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function clearConsoleLine() {
  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
}

function createProgressBar(current, total) {
  const barLength = 30;
  const filled = Math.round((current / total) * barLength);
  return `[${'█'.repeat(filled)}${' '.repeat(barLength - filled)} ${current}/${total}]`;
}

let isSpinnerActive = false;

function generateDeviceId() {
  return uuidv4();
}

async function refreshToken(refreshToken, proxy = null) {
  const maxRetries = 5;
  await clearConsoleLine();
  const spinner = ora({ text: chalk.cyan(` ┊ → Refreshing Token`), prefixText: '', spinner: 'bouncingBar', interval: 120 }).start();
  isSpinnerActive = true;
  try {
    let config = {
      method: 'post',
      url: 'https://api.asksurf.ai/muninn/v2/auth/refresh',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': randomUseragent.getRandom(),
      },
      data: { refresh_token: refreshToken },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios(config);
    const data = response.data;
    if (!data.success || !data.data.access_token) throw new Error('Failed to refresh token');
    spinner.succeed(chalk.green(` ┊ ✓ Token Refreshed Successfully`));
    await sleep(500);
    return { access_token: data.data.access_token, refresh_token: data.data.refresh_token };
  } catch (err) {
    spinner.fail(chalk.red(` ┊ ✗ Failed Refreshing Token: ${err.message}`));
    await sleep(500);
    throw err;
  } finally {
    spinner.stop();
    isSpinnerActive = false;
    await clearConsoleLine();
  }
}

async function getUserInfo(bearerToken, deviceId, proxy = null, retryCount = 0) {
  const maxRetries = 5;
  await clearConsoleLine();
  const spinner = ora({ text: chalk.cyan(` ┊ → Getting User Info${retryCount > 0 ? ` [Retry ${retryCount}/${maxRetries}]` : ''}`), prefixText: '', spinner: 'bouncingBar', interval: 120 }).start();
  isSpinnerActive = true;
  try {
    let config = {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Authorization': `Bearer ${bearerToken}`,
        'Cache-Control': 'no-cache',
        'Origin': 'https://asksurf.ai',
        'Pragma': 'no-cache',
        'Priority': 'u=1, i',
        'Referer': 'https://asksurf.ai/',
        'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': randomUseragent.getRandom(),
        'X-Device-Id': deviceId,
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.get('https://api.asksurf.ai/muninn/v1/auth/me', config);
    const userData = response.data.data;
    if (!userData.id) throw new Error('Invalid response: user ID missing');
    spinner.succeed(chalk.green(` ┊ ✓ User Info Fetched Successfully`));
    await sleep(500);
    return userData;
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) { 
      throw new Error('Token expired');
    }
    if (retryCount < maxRetries - 1) {
      spinner.text = chalk.cyan(` ┊ → Getting User Info [Retry ${retryCount + 1}/${maxRetries}]`);
      await sleep(5000);
      return getUserInfo(bearerToken, deviceId, proxy, retryCount + 1);
    }
    spinner.fail(chalk.red(` ┊ ✗ Failed Getting User Info: ${err.message}`));
    await sleep(500);
    throw err;
  } finally {
    spinner.stop();
    isSpinnerActive = false;
    await clearConsoleLine();
  }
}

async function getLimits(bearerToken, deviceId, proxy = null, retryCount = 0) {
  const maxRetries = 5;
  await clearConsoleLine();
  const spinner = ora({ text: chalk.cyan(` ┊ → Getting Limits${retryCount > 0 ? ` [Retry ${retryCount}/${maxRetries}]` : ''}`), prefixText: '', spinner: 'bouncingBar', interval: 120 }).start();
  isSpinnerActive = true;
  try {
    let config = {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Authorization': `Bearer ${bearerToken}`,
        'Cache-Control': 'no-cache',
        'Origin': 'https://asksurf.ai',
        'Pragma': 'no-cache',
        'Priority': 'u=1, i',
        'Referer': 'https://asksurf.ai/',
        'Sec-Ch-Ua': '"Chromium";v="134", "Not:A-Brand";v="24", "Google Chrome";v="134"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-site',
        'User-Agent': randomUseragent.getRandom(),
        'X-Device-Id': deviceId,
      },
    };
    if (proxy) {
      config.httpAgent = new HttpsProxyAgent(proxy);
      config.httpsAgent = new HttpsProxyAgent(proxy);
    }
    const response = await axios.get('https://api.asksurf.ai/muninn/v1/chat/sessions/limits', config);
    const limitsData = response.data.data;
    spinner.succeed(chalk.green(` ┊ ✓ Limits Fetched Successfully`));
    await sleep(500);
    return limitsData.remain_items.reduce((acc, item) => {
      acc[item.feature] = item.remain;
      return acc;
    }, {});
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      throw new Error('Token expired');
    }
    if (retryCount < maxRetries - 1) {
      spinner.text = chalk.cyan(` ┊ → Getting Limits [Retry ${retryCount + 1}/${maxRetries}]`);
      await sleep(5000);
      return getLimits(bearerToken, deviceId, proxy, retryCount + 1);
    }
    spinner.fail(chalk.red(` ┊ ✗ Failed Getting Limits: ${err.message}`));
    await sleep(500);
    throw err;
  } finally {
    spinner.stop();
    isSpinnerActive = false;
    await clearConsoleLine();
  }
}

async function performChat(bearerToken, deviceId, mode, prompt, proxy = null) {
  const sessionId = uuidv4();
  const requestId = uuidv4().replace(/-/g, '').slice(0, 20); 
  const wsUrl = `wss://api.asksurf.ai/muninn/v3/chat/sessions/${sessionId}/ws?token=${bearerToken}&lang=en&session_type=${mode}&platform=WEB`;

  await clearConsoleLine();
  const spinner = ora({ text: chalk.cyan(` ┊ → Starting Chat in ${mode} mode`), prefixText: '', spinner: 'bouncingBar', interval: 120 }).start();
  isSpinnerActive = true;

  let content = '';
  let sent = false;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, { agent: proxy ? new HttpsProxyAgent(proxy) : null });

    ws.on('open', () => {
      spinner.text = chalk.cyan(` ┊ → WebSocket Connected, Sending Prompt`);
      ws.send(JSON.stringify({
        type: "chat_request",
        messages: [{ role: "user", content: prompt }],
        request_id: requestId,
      }));
      spinner.succeed(chalk.green(` ┊ ✓ Chat Sent Successfully`));
      sent = true;
    });

    ws.on('message', async (message) => {
      const data = JSON.parse(message.toString());
      if (data.event_type === 'message_chunk') {
        content += data.data.content;
      } else if (data.event_type === 'end' || (data.event_type === 'custom' && data.data.event_data.type === 'FINAL')) {
        console.log(chalk.green(` ┊ ✓ Chat Completed Successfully`));
        ws.close();
        resolve();
      }
    });

    ws.on('error', (err) => {
      if (spinner.isSpinning) spinner.fail(chalk.red(` ┊ ✗ WebSocket Error: ${err.message}`));
      reject(err);
    });

    ws.on('close', () => {
      if (spinner.isSpinning) {
        spinner.stop();
      }
      isSpinnerActive = false;
      clearConsoleLine();
    });
  });
}

async function processAccount(account, proxy, prompts, noType) {
  let { bearer, refresh_token } = account;
  const deviceId = generateDeviceId();

  let refreshed = false;
  do {
    try {
      let userInfo = await getUserInfo(bearer, deviceId, proxy);
      let limits = await getLimits(bearer, deviceId, proxy);

      console.log(chalk.yellow(' ┊ ┌── Initial User Information ──'));
      console.log(chalk.white(` ┊ │ User ID: ${userInfo.id}`));
      console.log(chalk.white(` ┊ │ Email: ${userInfo.google_account ? userInfo.google_account.email : 'N/A'}`));
      console.log(chalk.white(` ┊ │ Limit ASK: ${limits.ASK || 0}`));
      console.log(chalk.white(` ┊ │ Limit RESEARCH: ${limits.RESEARCH || 0}`));
      console.log(chalk.yellow(' ┊ └──'));

      let availableModes = [];
      if (limits.ASK > 0) availableModes.push('ASK');
      if (limits.RESEARCH > 0) availableModes.push('RESEARCH');

      const maxChats = (limits.ASK || 0) + (limits.RESEARCH || 0);
      let chatCount = 0;
      console.log(chalk.magentaBright(' ┊ ┌── Proses Chat ──'));
      while (availableModes.length > 0 && prompts.length > 0) {
        chatCount++;
        console.log(chalk.yellow(` ┊ ├─ Chat ${createProgressBar(chatCount, maxChats)} ──`));
        const mode = availableModes[crypto.randomInt(0, availableModes.length)];
        const promptIndex = crypto.randomInt(0, prompts.length);
        const prompt = prompts[promptIndex];

        console.log(chalk.white(` ┊ │ Prompt: ${prompt}`));
        console.log(chalk.white(` ┊ │ Using mode: ${mode}`));

        try {
          await performChat(bearer, deviceId, mode, prompt, proxy);
          limits[mode]--;
          if (limits[mode] <= 0) {
            availableModes = availableModes.filter(m => m !== mode);
          }
          await sleep(8000); 
        } catch (err) {
          if (err.message === 'Token expired') {
            const refreshedTokens = await refreshToken(refresh_token, proxy);
            bearer = refreshedTokens.access_token;
            refresh_token = refreshedTokens.refresh_token;
            console.log(chalk.yellow(` ┊ Token refreshed, retrying...`));
            chatCount--;
            continue;
          }
          console.log(chalk.red(` ┊ ✗ Chat failed: ${err.message}`));
          chatCount--;
        }

        limits = await getLimits(bearer, deviceId, proxy);
        availableModes = [];
        if (limits.ASK > 0) availableModes.push('ASK');
        if (limits.RESEARCH > 0) availableModes.push('RESEARCH');
      }
      console.log(chalk.magentaBright(' ┊ └──'));

      userInfo = await getUserInfo(bearer, deviceId, proxy);
      limits = await getLimits(bearer, deviceId, proxy);

      console.log(chalk.yellow(' ┊ ┌── Final User Information ──'));
      console.log(chalk.white(` ┊ │ User ID: ${userInfo.id}`));
      console.log(chalk.white(` ┊ │ Email: ${userInfo.google_account ? userInfo.google_account.email : 'N/A'}`));
      console.log(chalk.white(` ┊ │ Limit ASK: ${limits.ASK || 0}`));
      console.log(chalk.white(` ┊ │ Limit RESEARCH: ${limits.RESEARCH || 0}`));
      console.log(chalk.yellow(' ┊ └──'));

      return chatCount;
    } catch (err) {
      if (err.message === 'Token expired' && !refreshed) {
        const refreshedTokens = await refreshToken(refresh_token, proxy);
        bearer = refreshedTokens.access_token;
        refresh_token = refreshedTokens.refresh_token;
        console.log(chalk.yellow(` ┊ Token refreshed, retrying initial fetch...`));
        refreshed = true;
        continue;
      }
      console.log(chalk.red(` ┊ ✗ Error: ${err.message}`));
      return 0;
    }
  } while (refreshed);
  return 0;
}

async function processAccounts(accounts, accountProxies, prompts, noType) {
  let successCount = 0;
  let failCount = 0;
  let totalChats = 0;

  for (let i = 0; i < accounts.length; i++) {
    const account = accounts[i];
    const proxy = accountProxies[i];
    const shortToken = `${account.bearer.slice(0, 8)}...${account.bearer.slice(-6)}`;

    displayHeader(`═════[ Account ${i + 1}/${accounts.length} | @ ${getTimestamp()} ]═════`, chalk.blue);
    console.log(chalk.cyan(` ┊ ${proxy ? `Used Proxy: ${proxy}` : 'Not Using Proxy'}`));

    const chats = await processAccount(account, proxy, prompts, noType);
    totalChats += chats;

    if (chats > 0) {
      successCount++;
    } else {
      failCount++;
    }

    console.log(chalk.gray(' ┊ ══════════════════════════════════════'));
  }

  displayHeader(`═════[ Selesai @ ${getTimestamp()} ]═════`, chalk.blue, false);
  console.log(chalk.gray(` ┊ ✅ ${successCount} akun sukses, ❌ ${failCount} akun gagal`));
  console.log(chalk.gray(` ┊ Total Chats: ${totalChats}`));
  const nextRunTime = moment().add(24, 'hours');
  startCountdown(nextRunTime);
}

function startCountdown(nextRunTime) {
  const countdownInterval = setInterval(() => {
    if (isSpinnerActive) return;
    const now = moment();
    const timeLeft = moment.duration(nextRunTime.diff(now));
    if (timeLeft.asSeconds() <= 0) {
      clearInterval(countdownInterval);
      return;
    }
    clearConsoleLine();
    const hours = Math.floor(timeLeft.asHours()).toString().padStart(2, '0');
    const minutes = Math.floor(timeLeft.asMinutes() % 60).toString().padStart(2, '0');
    const seconds = Math.floor(timeLeft.asSeconds() % 60).toString().padStart(2, '0');
    process.stdout.write(chalk.cyan(` ┊ ⏳ Waiting Next Loop: ${hours}:${minutes}:${seconds}\r`));
  }, 1000);
}

let isProcessing = false;

function scheduleNextRun(accounts, accountProxies, prompts, noType) {
  const delay = 24 * 60 * 60 * 1000;
  console.log(chalk.cyan(` ┊ ⏰ Proses akan diulang setiap 24 jam...`));
  setInterval(async () => {
    if (isProcessing || isSpinnerActive) return;
    try {
      isProcessing = true;
      const nextRunTime = moment().add(24, 'hours');
      await processAccounts(accounts, accountProxies, prompts, noType);
      startCountdown(nextRunTime);
    } catch (err) {
      console.log(chalk.red(` ✗ Error selama siklus: ${err.message}`));
    } finally {
      isProcessing = false;
    }
  }, delay);
}

async function main() {
  console.log('\n');
  displayBanner();
  const noType = process.argv.includes('--no-type');
  let accounts = [];
  try {
    const accountsData = await fs.readFile('account.json', 'utf8');
    accounts = JSON.parse(accountsData);
    if (!Array.isArray(accounts) || accounts.length === 0) {
      throw new Error('Invalid or empty account.json');
    }
  } catch (err) {
    console.log(chalk.red('✗ File account.json tidak ditemukan atau tidak valid! Pastikan berisi array objek dengan bearer dan refresh_token.'));
    rl.close();
    return;
  }

  let prompts = [];
  try {
    const promptsData = await fs.readFile('prompt.txt', 'utf8');
    prompts = promptsData.split('\n').filter(line => line.trim() !== '');
    if (prompts.length === 0) {
      console.log(chalk.red('✗ File prompt.txt kosong atau tidak valid!'));
      rl.close();
      return;
    }
  } catch (err) {
    console.log(chalk.red('✗ File prompt.txt tidak ditemukan!'));
    rl.close();
    return;
  }

  let useProxy;
  while (true) {
    const input = await promptUser('Gunakan proxy? (y/n) ');
    if (input.toLowerCase() === 'y' || input.toLowerCase() === 'n') {
      useProxy = input.toLowerCase() === 'y';
      break;
    }
    console.log(chalk.red('✗ Masukkan "y" atau "n"!'));
  }

  let proxies = [];
  if (useProxy) {
    try {
      const proxyData = await fs.readFile('proxy.txt', 'utf8');
      proxies = proxyData.split('\n').filter(line => line.trim() !== '');
      if (proxies.length === 0) {
        console.log(chalk.yellow('✗ File proxy.txt kosong. Lanjut tanpa proxy.'));
      }
    } catch (err) {
      console.log(chalk.yellow('✗ File proxy.txt tidak ditemukan. Lanjut tanpa proxy.'));
    }
  }

  const accountProxies = accounts.map((_, index) => proxies.length > 0 ? proxies[index % proxies.length] : null);

  console.log(chalk.cyan(` ┊ ⏰ Memulai proses untuk ${accounts.length} akun...`));
  await processAccounts(accounts, accountProxies, prompts, noType);
  scheduleNextRun(accounts, accountProxies, prompts, noType);
  rl.close();
}

main();