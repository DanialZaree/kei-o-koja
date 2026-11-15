import { api, db } from 'sdk';
import { eq, desc } from 'sdk/db';
import { chatEvents, tgVotes, botSessions } from '../schema.js';
import { toPersianDigits, renderProgressBar } from '../lib/format.js';

const SITE_URL = 'https://kei-o-koja.vercel.app';

export default async function (message, ctx) {
  const text = (message.text || '').trim();
  const chatId = message.chat.id;
  const userId = String(message.from?.id || chatId);
  const isGroup = message.chat.type === 'group' || message.chat.type === 'supergroup';
  const senderName = message.from?.first_name || 'دوست عزیز';

  // 1. Bot added to group
  if (message.new_chat_members?.some((m) => m.username === 'keiokojabot')) {
    await api.sendMessage({
      chat_id: chatId,
      text:
        `👋 <b>سلام به همه اعضای گروه!</b>\n\n` +
        `من ربات <b>«کی و کجا»</b> هستم 🗓️\n` +
        `دیگه نیازی به کل‌کل و گم شدن پیام‌ها نیست! برای ساخت دورهمی کافیه بنویسید:\n\n` +
        `<code>/new عنوان دورهمی</code>\n\n` +
        `یا در یک خط همراه با تاریخ و مکان:\n` +
        `<code>/new کافه | پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰ | کافه نادری</code>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ ساخت دورهمی با زمان و مکان دلخواه', callback_data: 'cmd:new' }],
          [{ text: '🌐 وبسایت کی و کجا', url: SITE_URL }],
        ],
      },
    });
    return;
  }

  // 2. Command: /cancel (Cancel active session)
  if (text === '/cancel' || text === 'انصراف' || text === 'لغو') {
    await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
    await api.sendMessage({
      chat_id: chatId,
      text: 'عملیات ساخت دورهمی لغو شد.',
    });
    return;
  }

  // 3. Check for active multi-step wizard session
  const activeSession = await db.select()
    .from(botSessions)
    .where(eq(botSessions.userId, userId))
    .get();

  if (activeSession && !text.startsWith('/')) {
    // Step A: Awaiting Title
    if (activeSession.step === 'awaiting_title') {
      const title = text;
      await db.update(botSessions)
        .set({
          draftTitle: title,
          step: 'awaiting_dates',
          updatedAt: Date.now(),
        })
        .where(eq(botSessions.userId, userId))
        .run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `عالی! عنوان: <b>${title}</b>\n\n` +
          `🗓️ حالا <b>تاریخ‌ها و ساعت‌های پیشنهادی</b> رو بفرست.\n` +
          `هر زمان رو توی یک خط بنویس یا با ویرگول (،) جدا کن.\n\n` +
          `مثال:\n` +
          `<code>پنج‌شنبه ساعت ۱۹:۰۰\nجمعه ساعت ۱۸:۳۰\nشنبه ساعت ۲۰:۰۰</code>`,
        parse_mode: 'HTML',
      });
      return;
    }

    // Step B: Awaiting Dates
    if (activeSession.step === 'awaiting_dates') {
      const rawDates = text.split(/[\n,،]/).map((d) => d.trim()).filter((d) => d.length > 0);

      if (rawDates.length === 0) {
        await api.sendMessage({
          chat_id: chatId,
          text: 'لطفاً حداقل یک تاریخ یا ساعت پیشنهادی بفرستید (مثلاً: پنج‌شنبه ساعت ۱۹:۰۰).',
        });
        return;
      }

      await db.update(botSessions)
        .set({
          draftDatesJson: JSON.stringify(rawDates),
          step: 'awaiting_places',
          updatedAt: Date.now(),
        })
        .where(eq(botSessions.userId, userId))
        .run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `زمان‌های پیشنهادی ثبت شد (${toPersianDigits(rawDates.length)} مورد).\n\n` +
          `📍 حالا <b>مکان‌های پیشنهادی</b> رو بفرست (هر کدوم در یک خط یا با ویرگول).\n` +
          `اگر هنوز مکان مشخص نیست، کافیه کلمه <b>«رد»</b> رو بفرستی.\n\n` +
          `مثال:\n` +
          `<code>کافه نادری\nکافه لمیز میدان ولیعصر</code>`,
        parse_mode: 'HTML',
      });
      return;
    }

    // Step C: Awaiting Places -> Create Event!
    if (activeSession.step === 'awaiting_places') {
      let rawPlaces = [];
      const cleanText = text.trim();
      if (cleanText !== 'رد' && cleanText !== 'ندارد' && cleanText !== 'خالی') {
        rawPlaces = cleanText.split(/[\n,،]/).map((p) => p.trim()).filter((p) => p.length > 0);
      }

      const title = activeSession.draftTitle || 'دورهمی دوستانه';
      const dates = JSON.parse(activeSession.draftDatesJson || '["پنج‌شنبه ۱۹:۰۰"]');
      const places = rawPlaces;
      const targetChatId = activeSession.chatId;

      // Clean session
      await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();

      // Create gathering
      await createAndSendGathering(chatId, targetChatId, title, senderName, dates, places);
      return;
    }
  }

  // 4. Command: /start
  if (text.startsWith('/start')) {
    if (isGroup) {
      await api.sendMessage({
        chat_id: chatId,
        text:
          `👋 <b>ربات «کی و کجا» در خدمت گروه شماست!</b>\n\n` +
          `برای ایجاد یک دورهمی با زمان و مکان دلخواه بنویسید:\n` +
          `<code>/new عنوان دورهمی</code>\n\n` +
          `یا به صورت یک‌خطی کامل:\n` +
          `<code>/new کافه‌گردی | پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰ | کافه نادری</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ شروع ساخت دورهمی', callback_data: 'cmd:new' }],
          ],
        },
      });
      return;
    }

    // Private chat
    await api.sendMessage({
      chat_id: chatId,
      text:
        `سلام <b>${senderName}</b> عزیز! 👋\n\n` +
        `به ربات <b>«کی و کجا»</b> خوش آمدید 🗓️\n\n` +
        `اینجا می‌تونی با زمان‌ها و مکان‌های دلخواهت دورهمی بسازی، نظرسنجی کنی و با دوستانت به تصمیم قطعی برسی.\n\n` +
        `• برای شروع ساخت دورهمی، روی دکمه زیر بزن یا بنویس: <code>/new</code>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ ساخت دورهمی با زمان و مکان دلخواه', callback_data: 'cmd:new' }],
          [{ text: '👥 افزودن ربات به گروه دوستان', url: 'https://t.me/keiokojabot?startgroup=true' }],
          [{ text: '🌐 ورود به وبسایت کی و کجا', url: SITE_URL }],
        ],
      },
    });
    return;
  }

  // 5. Command: /new or /create
  if (text.startsWith('/new') || text.startsWith('/create')) {
    const rawInput = text.replace(/^(\/new|\/create)(@keiokojabot)?/i, '').trim();

    // Check if user used one-line pipe format: /new Title | Dates | Places
    if (rawInput.includes('|')) {
      const parts = rawInput.split('|').map((p) => p.trim());
      const title = parts[0] || 'دورهمی دوستانه';
      const rawDates = (parts[1] || '')
        .split(/[\n,،]/)
        .map((d) => d.trim())
        .filter((d) => d.length > 0);
      const rawPlaces = (parts[2] || '')
        .split(/[\n,،]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);

      const dates = rawDates.length > 0 ? rawDates : ['پنج‌شنبه ۱۹:۰۰', 'جمعه ۱۸:۰۰'];
      await createAndSendGathering(chatId, chatId, title, senderName, dates, rawPlaces);
      return;
    }

    // If title was given on command line, e.g. "/new کوهنوردی توچال"
    if (rawInput.length > 0) {
      // Save session with this title and ask for dates!
      await db.insert(botSessions).values({
        userId,
        chatId: String(chatId),
        step: 'awaiting_dates',
        draftTitle: rawInput,
        updatedAt: Date.now(),
      }).run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `عنوان: <b>${rawInput}</b> ✍️\n\n` +
          `🗓️ حالا <b>تاریخ‌ها و ساعت‌های پیشنهادی</b> رو بفرست.\n` +
          `هر کدوم رو در یک خط بنویس یا با ویرگول جدا کن.\n\n` +
          `مثال:\n` +
          `<code>پنج‌شنبه ساعت ۱۹:۰۰\nجمعه ساعت ۱۸:۳۰\nشنبه ساعت ۲۰:۰۰</code>`,
        parse_mode: 'HTML',
      });
      return;
    }

    // No arguments: Start step 1
    await db.insert(botSessions).values({
      userId,
      chatId: String(chatId),
      step: 'awaiting_title',
      updatedAt: Date.now(),
    }).run();

    await api.sendMessage({
      chat_id: chatId,
      text:
        `📌 <b>ساخت دورهمی جدید</b>\n\n` +
        `عنوان دورهمی رو بفرست:\n` +
        `(مثلاً: <code>کافه‌گردی آخر هفته</code> یا <code>فوتسال سه‌شنبه</code>)\n\n` +
        `<i>برای لغو در هر مرحله، کلمه /cancel را ارسال کنید.</i>`,
      parse_mode: 'HTML',
    });
    return;
  }

  // 6. Command: /poll or /status
  if (text.startsWith('/poll') || text.startsWith('/status')) {
    const event = await db.select()
      .from(chatEvents)
      .where(eq(chatEvents.chatId, String(chatId)))
      .orderBy(desc(chatEvents.id))
      .get();

    if (!event) {
      await api.sendMessage({
        chat_id: chatId,
        text: `هنوز دورهمی فعالی در این چت ثبت نشده است.\nبرای ساخت دورهمی بنویسید: <code>/new عنوان دورهمی</code>`,
        parse_mode: 'HTML',
      });
      return;
    }

    const dates = JSON.parse(event.datesJson || '[]');
    const places = JSON.parse(event.placesJson || '[]');
    const votes = await db.select()
      .from(tgVotes)
      .where(eq(tgVotes.publicId, event.publicId))
      .all();

    const totalVoters = new Set(votes.map((v) => v.userId)).size;

    let body = `📊 <b>وضعیت دورهمی: ${event.title}</b>\n`;
    body += `👤 برگزارکننده: <b>${event.organizerName}</b>\n`;
    body += `👥 تعداد رأی‌دهندگان: <b>${toPersianDigits(totalVoters)} نفر</b>\n\n`;

    body += `📅 <b>زمان‌های پیشنهادی:</b>\n`;
    dates.forEach((d, idx) => {
      const optionVotes = votes.filter((v) => v.optionType === 'date' && v.optionIndex === idx);
      const count = optionVotes.length;
      const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
      const voters = optionVotes.map((v) => v.userName).join('، ');

      body += `<b>${toPersianDigits(idx + 1)}. ${d}</b>\n`;
      body += `${renderProgressBar(pct)} ${toPersianDigits(pct)}٪ (${toPersianDigits(count)} رأی)\n`;
      if (voters) {
        body += `  👥 <i>${voters}</i>\n`;
      }
      body += `\n`;
    });

    if (places.length > 0) {
      body += `📍 <b>مکان‌های پیشنهادی:</b>\n`;
      places.forEach((p, idx) => {
        const optionVotes = votes.filter((v) => v.optionType === 'place' && v.optionIndex === idx);
        const count = optionVotes.length;
        body += `• ${p} (${toPersianDigits(count)} رأی)\n`;
      });
    }

    await api.sendMessage({
      chat_id: chatId,
      text: body,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 به‌روزرسانی آمار', callback_data: `stats:${event.publicId}` }],
          [{ text: '🌐 مشاهده در وبسایت', url: SITE_URL }],
        ],
      },
    });
    return;
  }

  // 7. Command: /site
  if (text.startsWith('/site')) {
    await api.sendMessage({
      chat_id: chatId,
      text: `🌐 وبسایت رسمی «کی و کجا»:\n${SITE_URL}`,
    });
    return;
  }

  // 8. Command: /help
  if (text.startsWith('/help')) {
    await api.sendMessage({
      chat_id: chatId,
      text:
        `📖 <b>راهنمای ربات کی و کجا:</b>\n\n` +
        `• <code>/new</code> — شروع ویزارد ساخت دورهمی با زمان و مکان دلخواه\n` +
        `• <code>/new عنوان | زمان‌ها | مکان‌ها</code> — ساخت سریع یک‌خطی\n` +
        `• <code>/poll</code> یا <code>/status</code> — نمایش آمار زنده دورهمی\n` +
        `• <code>/cancel</code> — انصراف از ساخت در حال انجام\n` +
        `• <code>/site</code> — آدرس وبسایت\n\n` +
        `💡 <b>مثال یک‌خطی:</b>\n` +
        `<code>/new کافه‌گردی | جمعه ۱۸:۰۰، شنبه ۱۹:۰۰ | کافه نادری</code>`,
      parse_mode: 'HTML',
    });
    return;
  }
}

async function createAndSendGathering(currentChatId, targetChatId, title, organizerName, dates, places) {
  const publicId = Math.random().toString(36).substring(2, 10);

  // Save in SQLite database
  await db.insert(chatEvents).values({
    chatId: String(targetChatId),
    publicId,
    title,
    organizerName,
    datesJson: JSON.stringify(dates),
    placesJson: JSON.stringify(places),
    status: 'OPEN',
  }).run();

  let pollText =
    `🗓️ <b>دورهمی جدید: ${title}</b>\n` +
    `👤 برگزارکننده: <b>${organizerName}</b>\n\n` +
    `📅 <b>زمان‌های پیشنهادی:</b>\n` +
    dates
      .map((d, i) => `<b>${toPersianDigits(i + 1)}.</b> ${d} (۰ رأی)`)
      .join('\n');

  if (places.length > 0) {
    pollText += `\n\n📍 <b>مکان‌های پیشنهادی:</b>\n` + places.map((p) => `• ${p}`).join('\n');
  }

  pollText += `\n\n👇 <i>برای ثبت یا تغییر رأی، روی زمان مورد نظرتان کلیک کنید:</i>`;

  const keyboard = dates.map((d, i) => [
    {
      text: `⚡ رأی به: ${d}`,
      callback_data: `vote:${publicId}:${i}`,
    },
  ]);

  if (places.length > 0) {
    places.forEach((p, i) => {
      keyboard.push([
        {
          text: `📍 رأی به مکان: ${p}`,
          callback_data: `place_vote:${publicId}:${i}`,
        },
      ]);
    });
  }

  keyboard.push([
    { text: '📊 مشاهده آمار و اسامی', callback_data: `stats:${publicId}` },
    { text: '🔄 به‌روزرسانی', callback_data: `refresh:${publicId}` },
  ]);

  keyboard.push([
    { text: '🌐 باز کردن در وبسایت', url: SITE_URL },
  ]);

  const sent = await api.sendMessage({
    chat_id: targetChatId,
    text: pollText,
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: keyboard },
  });

  await db.update(chatEvents)
    .set({ messageId: sent.message_id })
    .where(eq(chatEvents.publicId, publicId))
    .run();
}
