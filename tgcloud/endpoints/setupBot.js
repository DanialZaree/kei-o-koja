import { api, InputFile, fetch } from 'sdk';

export default async function (input, ctx) {
  const results = {};

  // 1. Set Bot Profile Photo (using square logo)
  try {
    const photoUrl = input?.photoUrl || 'https://raw.githubusercontent.com/DanialZaree/kei-o-koja/main/public/logo.png';
    const res = await fetch(photoUrl);
    if (res.ok) {
      const chunks = [];
      for await (const chunk of res.body) {
        chunks.push(chunk);
      }
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const bytes = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }

      const photoRes = await api.setMyProfilePhoto({
        photo: {
          type: 'static',
          photo: new InputFile(bytes, 'logo.png', { type: 'image/png' }),
        },
      });
      results.profilePhoto = { ok: true, result: photoRes };
    } else {
      results.profilePhoto = { ok: false, error: `HTTP ${res.status}` };
    }
  } catch (err) {
    results.profilePhoto = { ok: false, error: err.message };
  }

  // 2. Set Bot Description (shown on empty chat before user presses Start)
  try {
    const description =
      `🗓️ به ربات «کی و کجا» خوش آمدید!\n\n` +
      `دیگه برای هماهنگی دورهمی‌ها، کافه‌گردی، فوتسال، بازی یا قرارهای کاری نیازی به پیام‌های طولانی و کل‌کل نیست!\n\n` +
      `✨ قابلیت‌های ربات:\n` +
      `• ساخت دورهمی با زمان‌ها و مکان‌های پیشنهادی\n` +
      `• نظرسنجی و رأی‌گیری ۱-کلیکه درون گروه و چت خصوصی\n` +
      `• اطلاع‌رسانی خودکار تغییر زمان یا مکان به گروه\n` +
      `• اعلام خودکار تصمیم نهایی دورهمی در گروه\n` +
      `• هماهنگی دوطرفه با وب‌سایت «کی و کجا»\n\n` +
      `برای شروع دکمه Start را بزنید یا دستور /help را ارسال کنید.`;

    const descRes = await api.setMyDescription({ description });
    results.description = { ok: true, result: descRes };
  } catch (err) {
    results.description = { ok: false, error: err.message };
  }

  // 3. Set Short Description (shown on bot profile & link share)
  try {
    const short_description =
      `هماهنگی آسان زمان و مکان دورهمی، نظرسنجی ۱-کلیکه در گروه و اطلاع‌رسانی خودکار تغییرات 🗓️`;

    const shortDescRes = await api.setMyShortDescription({ short_description });
    results.shortDescription = { ok: true, result: shortDescRes };
  } catch (err) {
    results.shortDescription = { ok: false, error: err.message };
  }

  // 4. Set Bot Menu Commands
  try {
    const commands = [
      { command: 'start', description: 'شروع کار و منوی اصلی ربات' },
      { command: 'new', description: 'ساخت دورهمی جدید با زمان و مکان' },
      { command: 'poll', description: 'مشاهده آمار و وضعیت رأی‌گیری' },
      { command: 'help', description: 'راهنمای کامل استفاده از ربات' },
      { command: 'cancel', description: 'انصراف از عملیات در حال انجام' },
      { command: 'site', description: 'آدرس وبسایت کی و کجا' },
    ];

    const cmdRes = await api.setMyCommands({ commands });
    results.commands = { ok: true, result: cmdRes };
  } catch (err) {
    results.commands = { ok: false, error: err.message };
  }

  return { ok: true, results };
}
