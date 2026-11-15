export async function sendTelegramNotification(
  chatId: string | null | undefined,
  text: string,
  replyMarkup?: any
) {
  if (!chatId) return;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  // 1. If standard bot token is set in env, send directly via Telegram Bot API
  if (botToken) {
    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          reply_markup: replyMarkup,
        }),
      });
      return;
    } catch (err) {
      console.error("Failed to send telegram notification via Bot API:", err);
    }
  }

  // 2. Also log in dev console
  console.log(`[Telegram Notification to ${chatId}]:\n${text}`);
}

