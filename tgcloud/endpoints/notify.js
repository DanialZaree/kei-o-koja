import { api } from 'sdk';

export default async function (input, ctx) {
  const { chat_id, text, reply_markup } = input || {};

  if (!chat_id || !text) {
    return { ok: false, error: 'پارامترهای chat_id و text الزامی هستند.' };
  }

  try {
    const res = await api.sendMessage({
      chat_id,
      text,
      parse_mode: 'HTML',
      reply_markup,
    });
    return { ok: true, message_id: res.message_id };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

