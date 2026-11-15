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

  // 1. Bot added to group or new members
  if (message.new_chat_members?.some((m) => m.username === 'keiokojabot')) {
    await api.sendMessage({
      chat_id: chatId,
      text:
        `👋 <b>سلام به همه اعضای گروه!</b>\n\n` +
        `من ربات <b>«کی و کجا»</b> هستم 🗓️\n` +
        `دیگه نیازی به کل‌کل و پیام‌های طولانی نیست! همه‌چیز رو با رأی‌گیری و اطلاع‌رسانی خودکار هماهنگ می‌کنیم.\n\n` +
        `🔹 برای ساخت دورهمی جدید:\n` +
        `<code>/new عنوان دورهمی</code>\n\n` +
        `🔹 ساخت سریع یک‌خطی با زمان و مکان:\n` +
        `<code>/new کافه‌گردی | پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰ | کافه نادری</code>\n\n` +
        `🔹 یا اگر از سایت رویداد ساختید، دکمه «اتصال به گروه» را از سایت بزنید.`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ ساخت دورهمی جدید', callback_data: 'cmd:new' }],
          [{ text: '🌐 وبسایت کی و کجا', url: SITE_URL }],
        ],
      },
    });
    return;
  }

  // 2. Command: /cancel (Cancel active session)
  if (text === '/cancel' || text === 'انصراف' || text === 'لغو') {
    try {
      await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
    } catch (e) {}
    await api.sendMessage({
      chat_id: chatId,
      text: 'عملیات ساخت دورهمی لغو شد. هر زمان خواستی بنویس: /new',
    });
    return;
  }

  // 3. Command: /start (Supports deep linking from website: /start event_<publicId>)
  if (text.startsWith('/start')) {
    const parts = text.split(/\s+/);
    const startParam = parts[1] || '';

    // A: Event link from website! (e.g. /start event_x1y2z3)
    if (startParam.startsWith('event_')) {
      const publicId = startParam.replace('event_', '').trim();
      try {
        const res = await fetch(`${SITE_URL}/api/tg/events/${publicId}`);
        const data = await res.json();

        if (data && data.ok && data.event) {
          const ev = data.event;
          const dates = (data.results?.dates || []).map((d) => d.label || d.dateIso);
          const places = (data.results?.places || []).map((p) => p.name);

          // Remove prior event link for this chat
          await db.delete(chatEvents).where(eq(chatEvents.chatId, String(chatId))).run();

          // Link chat to event in SQLite
          await db.insert(chatEvents).values({
            chatId: String(chatId),
            publicId,
            title: ev.title,
            organizerName: ev.organizerName,
            datesJson: JSON.stringify(dates.length > 0 ? dates : ['زمان در سایت مشخص شده']),
            placesJson: JSON.stringify(places),
            status: ev.status || 'OPEN',
          }).run();

          // Notify Next.js backend to save telegramChatId
          try {
            await fetch(`${SITE_URL}/api/tg/events/${publicId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chatId: String(chatId) }),
            });
          } catch (patchErr) {
            console.error('PATCH Next.js failed:', patchErr);
          }

          let cardText =
            `🎉 <b>این گروه با موفقیت به دورهمی «${ev.title}» متصل شد!</b>\n` +
            `👤 برگزارکننده: <b>${ev.organizerName}</b>\n\n`;

          if (dates.length > 0) {
            cardText += `📅 <b>زمان‌های پیشنهادی:</b>\n` +
              dates.map((d, i) => `<b>${toPersianDigits(i + 1)}.</b> ${d}`).join('\n') + `\n\n`;
          }

          if (places.length > 0) {
            cardText += `📍 <b>مکان‌های پیشنهادی:</b>\n` +
              places.map((p) => `• ${p}`).join('\n') + `\n\n`;
          }

          cardText +=
            `🔔 <b>اطلاع‌رسانی خودکار فعال است:</b> هرگونه تغییر زمان، مکان یا ثبت تصمیم نهایی در سایت، خودکار در همین گروه اعلام می‌شود.\n\n` +
            `👇 <i>برای ثبت نظر همین حالا روی گزینه‌ها کلیک کنید:</i>`;

          const keyboard = dates.map((d, i) => [
            { text: `⚡ رأی به زمان: ${d}`, callback_data: `vote:${publicId}:${i}` },
          ]);

          if (places.length > 0) {
            places.forEach((p, i) => {
              keyboard.push([
                { text: `📍 رأی به مکان: ${p}`, callback_data: `place_vote:${publicId}:${i}` },
              ]);
            });
          }

          keyboard.push([
            { text: '📊 آمار آرا و اسامی', callback_data: `stats:${publicId}` },
            { text: '🔄 به‌روزرسانی', callback_data: `refresh:${publicId}` },
          ]);

          keyboard.push([
            { text: '🌐 مشاهده در وبسایت کی و کجا', url: `${SITE_URL}/e/${publicId}` },
          ]);

          const sent = await api.sendMessage({
            chat_id: chatId,
            text: cardText,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard },
          });

          await db.update(chatEvents)
            .set({ messageId: sent.message_id })
            .where(eq(chatEvents.publicId, publicId))
            .run();

          return;
        }
      } catch (err) {
        console.error('Error fetching event for startgroup:', err);
      }
    }

    // B: Normal /start in group
    if (isGroup) {
      await api.sendMessage({
        chat_id: chatId,
        text:
          `👋 <b>ربات «کی و کجا» در خدمت گروه شماست!</b>\n\n` +
          `🔹 ساخت دورهمی با دکمه یا متن:\n` +
          `<code>/new عنوان دورهمی</code>\n\n` +
          `🔹 ساخت سریع یک‌خطی:\n` +
          `<code>/new کافه‌گردی | پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰ | کافه نادری</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ شروع ساخت دورهمی', callback_data: 'cmd:new' }],
            [{ text: '🌐 ورود به سایت', url: SITE_URL }],
          ],
        },
      });
      return;
    }

    // C: Normal /start in private chat
    await api.sendMessage({
      chat_id: chatId,
      text:
        `سلام <b>${senderName}</b> عزیز! 👋\n\n` +
        `به ربات <b>«کی و کجا»</b> خوش آمدید 🗓️\n\n` +
        `با این ربات می‌توانید به راحتی زمان و مکان‌های پیشنهادی را برای دورهمی مطرح کنید، نظرسنجی کنید و با دوستانتان به تصمیم قطعی برسید.\n\n` +
        `• برای شروع، روی دکمه زیر بزنید یا بنویسید: <code>/new</code>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ ساخت دورهمی جدید', callback_data: 'cmd:new' }],
          [{ text: '👥 افزودن ربات به گروه دوستان', url: 'https://t.me/keiokojabot?startgroup=true' }],
          [{ text: '🌐 ورود به وبسایت کی و کجا', url: SITE_URL }],
        ],
      },
    });
    return;
  }

  // 4. Command: /new or /create
  if (text.startsWith('/new') || text.startsWith('/create')) {
    const rawInput = text.replace(/^(\/new|\/create)(@keiokojabot)?/i, '').trim();

    // Reset previous session safely
    try {
      await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
    } catch (e) {}

    // A: One-line pipe format: /new Title | Dates | Places
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

    // B: Title supplied on command line: /new کافه‌گردی
    if (rawInput.length > 0) {
      await db.insert(botSessions).values({
        userId,
        chatId: String(chatId),
        step: 'awaiting_dates',
        draftTitle: rawInput,
        draftDatesJson: JSON.stringify([]),
        draftPlacesJson: JSON.stringify([]),
        updatedAt: Date.now(),
      }).run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `عنوان: <b>${rawInput}</b> ✍️\n\n` +
          `🗓️ حالا <b>زمان‌های پیشنهادی</b> را با دکمه‌های زیر انتخاب کنید یا در پاسخ همین پیام تایپ کنید:\n` +
          `<i>(می‌توانید چند زمان را با ویرگول یا خط جدید بنویسید)</i>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'پنج‌شنبه ۱۹:۰۰', callback_data: 'add_date:پنج‌شنبه ۱۹:۰۰' },
              { text: 'پنج‌شنبه ۲۱:۰۰', callback_data: 'add_date:پنج‌شنبه ۲۱:۰۰' },
            ],
            [
              { text: 'جمعه ۱۷:۰۰', callback_data: 'add_date:جمعه ۱۷:۰۰' },
              { text: 'جمعه ۱۹:۰۰', callback_data: 'add_date:جمعه ۱۹:۰۰' },
            ],
            [
              { text: 'شنبه ۱۸:۰۰', callback_data: 'add_date:شنبه ۱۸:۰۰' },
              { text: 'یکشنبه ۱۹:۰۰', callback_data: 'add_date:یکشنبه ۱۹:۰۰' },
            ],
            [
              { text: '✅ اتمام انتخاب زمان و مرحله بعد', callback_data: 'done_dates' },
            ],
          ],
        },
      });
      return;
    }

    // C: No arguments -> Prompt for Title with quick suggestion buttons
    await db.insert(botSessions).values({
      userId,
      chatId: String(chatId),
      step: 'awaiting_title',
      draftDatesJson: JSON.stringify([]),
      draftPlacesJson: JSON.stringify([]),
      updatedAt: Date.now(),
    }).run();

    await api.sendMessage({
      chat_id: chatId,
      text:
        `📌 <b>گام ۱ از ۳: عنوان دورهمی</b>\n\n` +
        `عنوان دورهمی را تایپ کنید یا از گزینه‌های سریع زیر انتخاب کنید:\n\n` +
        `<i>برای لغو در هر مرحله، /cancel را ارسال کنید.</i>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '☕ کافه‌گردی', callback_data: 'preset_title:کافه‌گردی' },
            { text: '🍕 شام و رستوران', callback_data: 'preset_title:شام و رستوران' },
          ],
          [
            { text: '⚽ فوتسال و ورزش', callback_data: 'preset_title:فوتسال' },
            { text: '🎲 بردگیم و بازی', callback_data: 'preset_title:بردگیم' },
          ],
          [
            { text: '🎬 سینما', callback_data: 'preset_title:سینما' },
            { text: '🏞️ طبیعت‌گردی', callback_data: 'preset_title:طبیعت‌گردی' },
          ],
        ],
      },
    });
    return;
  }

  // 5. Active conversational session input
  const activeSession = await db.select()
    .from(botSessions)
    .where(eq(botSessions.userId, userId))
    .get();

  if (activeSession && !text.startsWith('/')) {
    // Step 1: Title input
    if (activeSession.step === 'awaiting_title') {
      const title = text;
      await db.update(botSessions)
        .set({
          draftTitle: title,
          step: 'awaiting_dates',
          draftDatesJson: JSON.stringify([]),
          updatedAt: Date.now(),
        })
        .where(eq(botSessions.userId, userId))
        .run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `عالی! عنوان: <b>${title}</b>\n\n` +
          `🗓️ <b>گام ۲ از ۳: تاریخ‌ها و ساعت‌های پیشنهادی</b>\n` +
          `می‌توانید از دکمه‌های سریع زیر استفاده کنید یا زمان‌های دلخواهتان را ارسال کنید (هر کدوم در یک خط یا با ویرگول):\n\n` +
          `مثال: <code>پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰</code>`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'پنج‌شنبه ۱۹:۰۰', callback_data: 'add_date:پنج‌شنبه ۱۹:۰۰' },
              { text: 'پنج‌شنبه ۲۱:۰۰', callback_data: 'add_date:پنج‌شنبه ۲۱:۰۰' },
            ],
            [
              { text: 'جمعه ۱۷:۰۰', callback_data: 'add_date:جمعه ۱۷:۰۰' },
              { text: 'جمعه ۱۹:۰۰', callback_data: 'add_date:جمعه ۱۹:۰۰' },
            ],
            [
              { text: 'شنبه ۱۸:۰۰', callback_data: 'add_date:شنبه ۱۸:۰۰' },
              { text: 'یکشنبه ۱۹:۰۰', callback_data: 'add_date:یکشنبه ۱۹:۰۰' },
            ],
            [
              { text: '✅ اتمام انتخاب زمان و مرحله بعد', callback_data: 'done_dates' },
            ],
          ],
        },
      });
      return;
    }

    // Step 2: Dates input
    if (activeSession.step === 'awaiting_dates') {
      const rawDates = text.split(/[\n,،]/).map((d) => d.trim()).filter((d) => d.length > 0);

      let currentDates = [];
      try {
        currentDates = JSON.parse(activeSession.draftDatesJson || '[]');
      } catch (e) {}

      const combinedDates = [...currentDates, ...rawDates];

      if (combinedDates.length === 0) {
        await api.sendMessage({
          chat_id: chatId,
          text: 'لطفاً حداقل یک زمان بفرستید (مثلاً: پنج‌شنبه ۱۹:۰۰).',
        });
        return;
      }

      await db.update(botSessions)
        .set({
          draftDatesJson: JSON.stringify(combinedDates),
          step: 'awaiting_places',
          updatedAt: Date.now(),
        })
        .where(eq(botSessions.userId, userId))
        .run();

      const datesListStr = combinedDates.map((d, i) => `${toPersianDigits(i + 1)}. ${d}`).join('\n');

      await api.sendMessage({
        chat_id: chatId,
        text:
          `✅ <b>زمان‌های پیشنهادی ثبت شد:</b>\n${datesListStr}\n\n` +
          `📍 <b>گام ۳ از ۳: مکان‌های پیشنهادی</b>\n` +
          `نام مکان یا کافه مورد نظرت را بنویس یا از دکمه‌های زیر انتخاب کن.\n` +
          `اگر هنوز مکان مشخص نیست، دکمه <b>«بدون مکان»</b> را بزن.`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '☕ کافه', callback_data: 'add_place:کافه' },
              { text: '🍕 رستوران', callback_data: 'add_place:رستوران' },
            ],
            [
              { text: '🌳 پارک / فضای باز', callback_data: 'add_place:پارک / فضای باز' },
              { text: '🏠 خونه', callback_data: 'add_place:خونه' },
            ],
            [
              { text: '⏭️ بدون مکان (رد کردن)', callback_data: 'skip_places' },
              { text: '✅ ساخت نهایی دورهمی', callback_data: 'done_places' },
            ],
          ],
        },
      });
      return;
    }

    // Step 3: Places input
    if (activeSession.step === 'awaiting_places') {
      let rawPlaces = [];
      const cleanText = text.trim();
      if (cleanText !== 'رد' && cleanText !== 'ندارد' && cleanText !== 'خالی') {
        rawPlaces = cleanText.split(/[\n,،]/).map((p) => p.trim()).filter((p) => p.length > 0);
      }

      let currentPlaces = [];
      try {
        currentPlaces = JSON.parse(activeSession.draftPlacesJson || '[]');
      } catch (e) {}

      const allPlaces = [...currentPlaces, ...rawPlaces];
      const title = activeSession.draftTitle || 'دورهمی دوستانه';
      const dates = JSON.parse(activeSession.draftDatesJson || '["پنج‌شنبه ۱۹:۰۰"]');
      const targetChatId = activeSession.chatId;

      await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
      await createAndSendGathering(chatId, targetChatId, title, senderName, dates, allPlaces);
      return;
    }
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
    body += `👥 تعداد شرکت‌کنندگان: <b>${toPersianDigits(totalVoters)} نفر</b>\n\n`;

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
          [{ text: '🌐 مشاهده در وبسایت', url: `${SITE_URL}/e/${event.publicId}` }],
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
  if (text.startsWith('/help') || text === 'راهنما') {
    await api.sendMessage({
      chat_id: chatId,
      text:
        `📖 <b>راهنمای جامع ربات «کی و کجا» 🗓️</b>\n\n` +
        `اینجا یاد می‌گیرید چطور به راحتی با دوستانتان برای دورهمی‌ها هماهنگ شوید:\n\n` +
        `🔹 <b>۱. ساخت دورهمی جدید:</b>\n` +
        `• <b>مرحله‌به‌مرحله با دکمه:</b> دستور <code>/new</code> را بفرستید تا ربات عنوان، زمان‌ها و مکان‌ها را گام‌به‌گام از شما بپرسد.\n` +
        `• <b>سریع در یک خط (ویژه گروه‌ها):</b>\n` +
        `<code>/new کافه‌گردی | پنج‌شنبه ۱۹:۰۰، جمعه ۱۸:۰۰ | کافه نادری</code>\n\n` +
        `🔹 <b>۲. اتصال گروه تلگرام به وبسایت:</b>\n` +
        `اگر دورهمی را در سایت ساخته‌اید، دکمه «افزودن ربات به گروه تلگرام» را در صفحه رویداد بزنید تا ربات به گروه متصل شده و تمام تغییرات را لحظه‌ای اعلام کند.\n\n` +
        `🔹 <b>۳. سایر دستورات پرکاربرد:</b>\n` +
        `• <code>/poll</code> یا <code>/status</code> — مشاهده آمار زنده آرا و اسامی\n` +
        `• <code>/cancel</code> — انصراف از ساخت در حال انجام\n` +
        `• <code>/site</code> — آدرس وبسایت کی و کجا\n` +
        `• <code>/help</code> — مشاهده مجدد این راهنما`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ شروع ساخت دورهمی', callback_data: 'cmd:new' }],
          [{ text: '👥 افزودن ربات به گروه', url: 'https://t.me/keiokojabot?startgroup=true' }],
          [{ text: '🌐 ورود به وبسایت کی و کجا', url: SITE_URL }],
        ],
      },
    });
    return;
  }
}

export async function createAndSendGathering(currentChatId, targetChatId, title, organizerName, dates, places) {
  const publicId = Math.random().toString(36).substring(2, 10);

  // Clean old event for this targetChat
  try {
    await db.delete(chatEvents).where(eq(chatEvents.chatId, String(targetChatId))).run();
  } catch (e) {}

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

  pollText += `\n\n👇 <i>برای ثبت یا تغییر رأی، روی دکمه‌های زیر کلیک کنید:</i>`;

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
    { text: '📊 آمار و اسامی', callback_data: `stats:${publicId}` },
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
