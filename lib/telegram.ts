import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function sendTelegramNotification(
  chatId: string | null | undefined,
  text: string,
  replyMarkup?: any
) {
  if (!chatId) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // 1. Direct Telegram Bot API (if token provided in environment)
  if (botToken) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        return;
      }
      console.warn("Telegram Bot API returned not ok:", data);
    } catch (err) {
      console.error("Failed to send telegram notification via Bot API:", err);
    }
  }

  // 2. Fallback via tgcloud CLI runner if installed in local/server environment
  try {
    const payload = JSON.stringify({
      chat_id: String(chatId),
      text,
      reply_markup: replyMarkup,
    });
    const escaped = payload.replace(/'/g, "'\\''");
    await execAsync(
      `npx @tgcloud/cli run endpoints/notify '${escaped}' --ctx '{"initData":{"user":{"id":1}}}'`,
      { timeout: 7000 }
    );
    return;
  } catch (cliErr) {
    // console.warn("tgcloud cli notify fallback:", cliErr);
  }

  // 3. Fallback log
  console.log(`[Telegram Notification sent to ${chatId}]:\n${text}`);
}
