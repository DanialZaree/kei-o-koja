import { api, InputFile, fetch } from 'sdk';

export default async function (input, ctx) {
  try {
    const url = input?.url || 'https://raw.githubusercontent.com/DanialZaree/kei-o-koja/main/public/logo.png';
    const res = await fetch(url);
    if (!res.ok) {
      return { ok: false, error: `Failed to download image: ${res.status}` };
    }

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

    // InputProfilePhotoStatic requires { type: 'static', photo: InputFile }
    const result = await api.setMyProfilePhoto({
      photo: {
        type: 'static',
        photo: new InputFile(bytes, 'logo.png', { type: 'image/png' }),
      },
    });

    return { ok: true, result };
  } catch (err) {
    return { ok: false, error: err.message, code: err.code };
  }
}
