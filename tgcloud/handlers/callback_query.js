import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { chatEvents, tgVotes, botSessions } from '../schema.js';
import { toPersianDigits, renderProgressBar } from '../lib/format.js';
import { createAndSendGathering } from './message.js';

const SITE_URL = 'https://kei-o-koja.vercel.app';

export default async function (cb, ctx) {
  const data = cb.data || '';
  const userId = String(cb.from.id);
  const userName = cb.from.first_name || 'کاربر';
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;

  // 1. Voting for Date: vote:<publicId>:<index>
  if (data.startsWith('vote:')) {
    const [, publicId, rawIndex] = data.split(':');
    const index = parseInt(rawIndex, 10);

    const event = await db.select()
      .from(chatEvents)
      .where(eq(chatEvents.publicId, publicId))
      .get();

    if (!event) {
      await api.answerCallbackQuery({
        callback_query_id: cb.id,
        text: 'دورهمی یافت نشد یا منقضی شده است.',
        show_alert: true,
      });
      return;
    }

    const existing = await db.select()
      .from(tgVotes)
      .where(
        and(
          eq(tgVotes.publicId, publicId),
          eq(tgVotes.userId, userId),
          eq(tgVotes.optionType, 'date'),
          eq(tgVotes.optionIndex, index)
        )
      )
      .get();

    let alertMsg = '';
    if (existing) {
      await db.delete(tgVotes).where(eq(tgVotes.id, existing.id)).run();
      alertMsg = '❌ رأی شما برای این زمان برداشته شد.';
    } else {
      await db.insert(tgVotes).values({
        publicId,
        userId,
        userName,
        optionType: 'date',
        optionIndex: index,
      }).run();
      alertMsg = '✅ رأی شما برای این زمان ثبت شد!';
    }

    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: alertMsg,
    });

    await updatePollMessage(chatId, messageId, publicId);
    return;
  }

  // 2. Voting for Place: place_vote:<publicId>:<index>
  if (data.startsWith('place_vote:')) {
    const [, publicId, rawIndex] = data.split(':');
    const index = parseInt(rawIndex, 10);

    const event = await db.select()
      .from(chatEvents)
      .where(eq(chatEvents.publicId, publicId))
      .get();

    if (!event) {
      await api.answerCallbackQuery({
        callback_query_id: cb.id,
        text: 'دورهمی یافت نشد.',
      });
      return;
    }

    const existing = await db.select()
      .from(tgVotes)
      .where(
        and(
          eq(tgVotes.publicId, publicId),
          eq(tgVotes.userId, userId),
          eq(tgVotes.optionType, 'place'),
          eq(tgVotes.optionIndex, index)
        )
      )
      .get();

    let alertMsg = '';
    if (existing) {
      await db.delete(tgVotes).where(eq(tgVotes.id, existing.id)).run();
      alertMsg = '❌ رأی شما برای این مکان حذف شد.';
    } else {
      await db.insert(tgVotes).values({
        publicId,
        userId,
        userName,
        optionType: 'place',
        optionIndex: index,
      }).run();
      alertMsg = '✅ رأی شما به این مکان ثبت شد!';
    }

    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: alertMsg,
    });

    await updatePollMessage(chatId, messageId, publicId);
    return;
  }

  // 3. Stats / breakdown: stats:<publicId>
  if (data.startsWith('stats:')) {
    const [, publicId] = data.split(':');
    await updatePollMessage(chatId, messageId, publicId, true);
    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: 'آمار و اسامی به‌روزرسانی شدند.',
    });
    return;
  }

  // 4. Refresh: refresh:<publicId>
  if (data.startsWith('refresh:')) {
    const [, publicId] = data.split(':');
    await updatePollMessage(chatId, messageId, publicId, false);
    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: 'لیست به‌روز شد.',
    });
    return;
  }

  // 5. Command shortcut: cmd:new
  if (data === 'cmd:new') {
    await api.answerCallbackQuery({ callback_query_id: cb.id });
    if (chatId) {
      try {
        await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
      } catch (e) {}

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
          `عنوان دورهمی را بفرست یا از گزینه‌های سریع زیر انتخاب کن:`,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '☕ کافه‌گردی', callback_data: 'preset_title:کافه‌گردی' },
              { text: '🍕 شام و رستوران', callback_data: 'preset_title:شام و رستوران' },
            ],
            [
              { text: '⚽ فوتسال و ورزش', callback_data: 'preset_title:فوتسال' },
              { text: '🎲 بردگیم و مافیا', callback_data: 'preset_title:بردگیم' },
            ],
            [
              { text: '🎬 سینما', callback_data: 'preset_title:سینما' },
              { text: '🏞️ طبیعت‌گردی', callback_data: 'preset_title:طبیعت‌گردی' },
            ],
          ],
        },
      });
    }
    return;
  }

  // 6. Wizard preset title selection
  if (data.startsWith('preset_title:')) {
    const title = data.replace('preset_title:', '').trim();
    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: `عنوان انتخاب شد: ${title}`,
    });

    try {
      await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();
    } catch (e) {}

    await db.insert(botSessions).values({
      userId,
      chatId: String(chatId),
      step: 'awaiting_dates',
      draftTitle: title,
      draftDatesJson: JSON.stringify([]),
      draftPlacesJson: JSON.stringify([]),
      updatedAt: Date.now(),
    }).run();

    await api.sendMessage({
      chat_id: chatId,
      text:
        `عنوان دورهمی: <b>${title}</b> ✍️\n\n` +
        `🗓️ <b>گام ۲ از ۳: انتخاب زمان‌ها</b>\n` +
        `روی دکمه‌های زیر کلیک کن تا زمان‌ها اضافه شوند، یا زمان دلخواهت را تایپ کن:\n\n` +
        `<i>زمان‌های انتخاب شده تا الان: (هنوز انتخابی ثبت نشده)</i>`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: getDateSelectionKeyboard([]),
      },
    });
    return;
  }

  // 7. Add preset date
  if (data.startsWith('add_date:')) {
    const dateText = data.replace('add_date:', '').trim();

    const session = await db.select()
      .from(botSessions)
      .where(eq(botSessions.userId, userId))
      .get();

    let currentDates = [];
    try {
      currentDates = JSON.parse(session?.draftDatesJson || '[]');
    } catch (e) {}

    if (!currentDates.includes(dateText)) {
      currentDates.push(dateText);
    }

    await db.update(botSessions)
      .set({
        draftDatesJson: JSON.stringify(currentDates),
        updatedAt: Date.now(),
      })
      .where(eq(botSessions.userId, userId))
      .run();

    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: `«${dateText}» اضافه شد.`,
    });

    const datesListStr = currentDates
      .map((d, i) => `<b>${toPersianDigits(i + 1)}.</b> ${d}`)
      .join('\n');

    await api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text:
        `عنوان دورهمی: <b>${session?.draftTitle || 'دورهمی'}</b> ✍️\n\n` +
        `🗓️ <b>زمان‌های انتخاب شده:</b>\n${datesListStr}\n\n` +
        `می‌توانی زمان‌های بیشتری اضافه کنی یا برای رفتن به مرحله بعد دکمه تایید را بزنی:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: getDateSelectionKeyboard(currentDates),
      },
    });
    return;
  }

  // 8. Done selecting dates -> Move to Places
  if (data === 'done_dates') {
    const session = await db.select()
      .from(botSessions)
      .where(eq(botSessions.userId, userId))
      .get();

    let currentDates = [];
    try {
      currentDates = JSON.parse(session?.draftDatesJson || '[]');
    } catch (e) {}

    if (currentDates.length === 0) {
      // Default to weekend if none chosen
      currentDates = ['پنج‌شنبه ۱۹:۰۰', 'جمعه ۱۸:۰۰'];
    }

    await db.update(botSessions)
      .set({
        draftDatesJson: JSON.stringify(currentDates),
        step: 'awaiting_places',
        updatedAt: Date.now(),
      })
      .where(eq(botSessions.userId, userId))
      .run();

    await api.answerCallbackQuery({ callback_query_id: cb.id });

    const datesListStr = currentDates
      .map((d, i) => `${toPersianDigits(i + 1)}. ${d}`)
      .join('\n');

    await api.sendMessage({
      chat_id: chatId,
      text:
        `✅ <b>زمان‌ها ثبت شدند:</b>\n${datesListStr}\n\n` +
        `📍 <b>گام ۳ از ۳: مکان‌های پیشنهادی</b>\n` +
        `مکان‌ها را با دکمه‌های زیر انتخاب کن یا نام کافه/مکان را تایپ کن:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: getPlaceSelectionKeyboard([]),
      },
    });
    return;
  }

  // 9. Add preset place
  if (data.startsWith('add_place:')) {
    const placeText = data.replace('add_place:', '').trim();

    const session = await db.select()
      .from(botSessions)
      .where(eq(botSessions.userId, userId))
      .get();

    let currentPlaces = [];
    try {
      currentPlaces = JSON.parse(session?.draftPlacesJson || '[]');
    } catch (e) {}

    if (!currentPlaces.includes(placeText)) {
      currentPlaces.push(placeText);
    }

    await db.update(botSessions)
      .set({
        draftPlacesJson: JSON.stringify(currentPlaces),
        updatedAt: Date.now(),
      })
      .where(eq(botSessions.userId, userId))
      .run();

    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: `«${placeText}» اضافه شد.`,
    });

    const placesListStr = currentPlaces.map((p) => `• ${p}`).join('\n');

    await api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text:
        `📍 <b>مکان‌های انتخاب شده:</b>\n${placesListStr}\n\n` +
        `می‌توانی مکان‌های بیشتری اضافه کنی یا برای ساخت نهایی دکمه تایید را بزنی:`,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: getPlaceSelectionKeyboard(currentPlaces),
      },
    });
    return;
  }

  // 10. Finish creating event (skip or done places)
  if (data === 'skip_places' || data === 'done_places') {
    await api.answerCallbackQuery({
      callback_query_id: cb.id,
      text: 'در حال ساخت دورهمی...',
    });

    const session = await db.select()
      .from(botSessions)
      .where(eq(botSessions.userId, userId))
      .get();

    const title = session?.draftTitle || 'دورهمی دوستانه';
    let dates = [];
    try {
      dates = JSON.parse(session?.draftDatesJson || '[]');
    } catch (e) {}
    if (dates.length === 0) dates = ['پنج‌شنبه ۱۹:۰۰', 'جمعه ۱۸:۰۰'];

    let places = [];
    if (data === 'done_places') {
      try {
        places = JSON.parse(session?.draftPlacesJson || '[]');
      } catch (e) {}
    }

    const targetChatId = session?.chatId || chatId;
    await db.delete(botSessions).where(eq(botSessions.userId, userId)).run();

    await createAndSendGathering(chatId, targetChatId, title, userName, dates, places);
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: cb.id });
}

function getDateSelectionKeyboard(selectedDates) {
  return [
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
  ];
}

function getPlaceSelectionKeyboard(selectedPlaces) {
  return [
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
  ];
}

async function updatePollMessage(chatId, messageId, publicId, showDetailedVoters = false) {
  if (!chatId || !messageId) return;

  const event = await db.select()
    .from(chatEvents)
    .where(eq(chatEvents.publicId, publicId))
    .get();

  if (!event) return;

  const dates = JSON.parse(event.datesJson || '[]');
  const places = JSON.parse(event.placesJson || '[]');
  const votes = await db.select()
    .from(tgVotes)
    .where(eq(tgVotes.publicId, publicId))
    .all();

  const totalVoters = new Set(votes.map((v) => v.userId)).size;

  let text = `🗓️ <b>دورهمی: ${event.title}</b>\n`;
  text += `👤 برگزارکننده: <b>${event.organizerName}</b>\n`;
  text += `👥 کل شرکت‌کنندگان: <b>${toPersianDigits(totalVoters)} نفر</b>\n\n`;
  text += `📅 <b>زمان‌های پیشنهادی:</b>\n`;

  dates.forEach((d, idx) => {
    const optionVotes = votes.filter((v) => v.optionType === 'date' && v.optionIndex === idx);
    const count = optionVotes.length;
    const pct = totalVoters > 0 ? Math.round((count / totalVoters) * 100) : 0;
    const voters = optionVotes.map((v) => v.userName).join('، ');

    text += `<b>${toPersianDigits(idx + 1)}.</b> ${d}\n`;
    text += `${renderProgressBar(pct)} ${toPersianDigits(pct)}٪ (${toPersianDigits(count)} رأی)\n`;
    if (showDetailedVoters && voters) {
      text += `  👥 <i>${voters}</i>\n`;
    }
    text += `\n`;
  });

  if (places.length > 0) {
    text += `📍 <b>مکان‌های پیشنهادی:</b>\n`;
    places.forEach((p, idx) => {
      const optionVotes = votes.filter((v) => v.optionType === 'place' && v.optionIndex === idx);
      const count = optionVotes.length;
      text += `• ${p} (${toPersianDigits(count)} رأی)\n`;
    });
    text += `\n`;
  }

  const keyboard = dates.map((d, i) => {
    const count = votes.filter((v) => v.optionType === 'date' && v.optionIndex === i).length;
    return [
      {
        text: `⚡ رأی به زمان ${toPersianDigits(i + 1)} (${toPersianDigits(count)} رأی)`,
        callback_data: `vote:${publicId}:${i}`,
      },
    ];
  });

  if (places.length > 0) {
    places.forEach((p, i) => {
      const count = votes.filter((v) => v.optionType === 'place' && v.optionIndex === i).length;
      keyboard.push([
        {
          text: `📍 رأی به مکان ${toPersianDigits(i + 1)} (${toPersianDigits(count)} رأی)`,
          callback_data: `place_vote:${publicId}:${i}`,
        },
      ]);
    });
  }

  keyboard.push([
    {
      text: showDetailedVoters ? '🔼 بستن اسامی' : '👥 نمایش اسامی رأی‌دهندگان',
      callback_data: showDetailedVoters ? `refresh:${publicId}` : `stats:${publicId}`,
    },
    { text: '🔄 به‌روزرسانی', callback_data: `refresh:${publicId}` },
  ]);

  keyboard.push([
    { text: '🌐 باز کردن در وبسایت', url: `${SITE_URL}/e/${publicId}` },
  ]);

  try {
    await api.editMessageText({
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: keyboard },
    });
  } catch (err) {
    // ignore unchanged message errors
  }
}
