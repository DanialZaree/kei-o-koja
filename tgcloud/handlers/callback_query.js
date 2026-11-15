import { api, db } from 'sdk';
import { eq, and } from 'sdk/db';
import { chatEvents, tgVotes, botSessions } from '../schema.js';
import { toPersianDigits, renderProgressBar } from '../lib/format.js';

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
      // Start session
      await db.insert(botSessions).values({
        userId,
        chatId: String(chatId),
        step: 'awaiting_title',
        updatedAt: Date.now(),
      }).run();

      await api.sendMessage({
        chat_id: chatId,
        text:
          `📌 <b>عنوان دورهمی رو بفرست:</b>\n` +
          `(مثلاً: <code>کافه‌گردی</code>، <code>فوتسال</code> یا <code>سینما</code>)\n\n` +
          `یا به صورت یک‌خطی:\n` +
          `<code>/new عنوان | زمان‌ها | مکان‌ها</code>`,
        parse_mode: 'HTML',
      });
    }
    return;
  }

  await api.answerCallbackQuery({ callback_query_id: cb.id });
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
    { text: '🌐 باز کردن در وبسایت', url: SITE_URL },
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
    // ignore if unchanged
  }
}
