import { api, InputFile, fetch } from 'sdk';

export default async function (input, ctx) {
  try {
    const url = input?.url || 'https://raw.githubusercontent.com/DanialZaree/kei-o-koja/main/public/logo.png';
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: `Failed to download image: ${res.status}` };
    }

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Call Telegram Bot API setMyProfilePhoto
    const result = await api.setMyProfilePhoto({
      photo: new InputFile(bytes, 'logo.png', { type: 'image/png' }),
    });

    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message, code: err.code };
  }
}
