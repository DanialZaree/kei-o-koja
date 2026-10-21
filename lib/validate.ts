export interface ValidationResult<T = void> {
  ok: boolean;
  errors?: Record<string, string>;
  data?: T;
}

export function isValidHttpUrl(str: string): boolean {
  if (!str) return true;
  if (str.length > 300) return false;
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCreateEventInput(data: {
  title?: unknown;
  description?: unknown;
  organizerName?: unknown;
  dates?: unknown;
  places?: unknown;
}): ValidationResult<{
  title: string;
  description: string | null;
  organizerName: string;
  dates: string[];
  places: { name: string; url: string | null; note: string | null }[];
}> {
  const errors: Record<string, string> = {};

  // Title: 3 to 80 chars
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length < 3 || title.length > 80) {
    errors.title = "عنوان دورهمی باید بین ۳ تا ۸۰ کاراکتر باشد.";
  }

  // Description: optional, max 500 chars
  let description: string | null = null;
  if (typeof data.description === "string" && data.description.trim().length > 0) {
    const descTrimmed = data.description.trim();
    if (descTrimmed.length > 500) {
      errors.description = "توضیحات دورهمی نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.";
    } else {
      description = descTrimmed;
    }
  }

  // Organizer Name: 2 to 30 chars
  const organizerName = typeof data.organizerName === "string" ? data.organizerName.trim() : "";
  if (!organizerName || organizerName.length < 2 || organizerName.length > 30) {
    errors.organizerName = "نام شما باید بین ۲ تا ۳۰ کاراکتر باشد.";
  }

  // Dates: 1 to 10 dates, must be valid and in the future
  const rawDates = Array.isArray(data.dates) ? data.dates : [];
  const cleanDates: string[] = [];

  if (rawDates.length === 0) {
    errors.dates = "حداقل یک تاریخ پیشنهادی الزامی است.";
  } else if (rawDates.length > 10) {
    errors.dates = "حداکثر ۱۰ تاریخ پیشنهادی مجاز است.";
  } else {
    for (let i = 0; i < rawDates.length; i++) {
      const res = validateDateOptionInput(rawDates[i]);
      if (!res.ok && res.errors?.startsAt) {
        errors[`date_${i}`] = res.errors.startsAt;
      } else if (res.data) {
        cleanDates.push(res.data.toISOString());
      }
    }
  }

  // Places: optional, max 10
  const rawPlaces = Array.isArray(data.places) ? data.places : [];
  const cleanPlaces: { name: string; url: string | null; note: string | null }[] = [];

  if (rawPlaces.length > 10) {
    errors.places = "حداکثر ۱۰ مکان پیشنهادی مجاز است.";
  } else {
    for (let i = 0; i < rawPlaces.length; i++) {
      const p = rawPlaces[i];
      if (!p || typeof p !== "object") continue;
      const pObj = p as { name?: unknown; url?: unknown; note?: unknown };
      const name = typeof pObj.name === "string" ? pObj.name.trim() : "";
      const rawUrl = typeof pObj.url === "string" ? pObj.url.trim() : "";
      const rawNote = typeof pObj.note === "string" ? pObj.note.trim() : "";

      // If entirely empty row, ignore
      if (!name && !rawUrl && !rawNote) continue;

      const res = validatePlaceOptionInput(pObj);
      if (!res.ok && res.errors) {
        if (res.errors.name) errors[`place_${i}_name`] = res.errors.name;
        if (res.errors.url) errors[`place_${i}_url`] = res.errors.url;
        if (res.errors.note) errors[`place_${i}_note`] = res.errors.note;
      } else if (res.data) {
        cleanPlaces.push(res.data);
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      organizerName,
      dates: cleanDates,
      places: cleanPlaces,
    },
  };
}

export function validateVoteInput(data: {
  name?: unknown;
  dateIds?: unknown;
  placeIds?: unknown;
}): ValidationResult<{
  name: string;
  dateIds: string[];
  placeIds: string[];
}> {
  const errors: Record<string, string> = {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length < 2 || name.length > 30) {
    errors.name = "نام شما باید بین ۲ تا ۳۰ کاراکتر باشد.";
  }

  const dateIds = Array.isArray(data.dateIds)
    ? data.dateIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  const placeIds = Array.isArray(data.placeIds)
    ? data.placeIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      dateIds,
      placeIds,
    },
  };
}

export function validateEventInfoUpdate(data: {
  title?: unknown;
  description?: unknown;
}): ValidationResult<{
  title: string;
  description: string | null;
}> {
  const errors: Record<string, string> = {};

  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title || title.length < 3 || title.length > 80) {
    errors.title = "عنوان دورهمی باید بین ۳ تا ۸۰ کاراکتر باشد.";
  }

  let description: string | null = null;
  if (typeof data.description === "string" && data.description.trim().length > 0) {
    const descTrimmed = data.description.trim();
    if (descTrimmed.length > 500) {
      errors.description = "توضیحات نمی‌تواند بیشتر از ۵۰۰ کاراکتر باشد.";
    } else {
      description = descTrimmed;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      title,
      description,
    },
  };
}

export function validateDateOptionInput(startsAtIso?: unknown): ValidationResult<Date> {
  if (typeof startsAtIso !== "string" || !startsAtIso) {
    return { ok: false, errors: { startsAt: "تاریخ الزامی است." } };
  }
  const date = new Date(startsAtIso);
  if (isNaN(date.getTime())) {
    return { ok: false, errors: { startsAt: "فرمت تاریخ نامعتبر است." } };
  }
  if (date.getTime() <= Date.now()) {
    return { ok: false, errors: { startsAt: "تاریخ انتخابی گذشته است و باید در آینده باشد." } };
  }
  return { ok: true, data: date };
}

export function validatePlaceOptionInput(data: {
  name?: unknown;
  url?: unknown;
  note?: unknown;
}): ValidationResult<{
  name: string;
  url: string | null;
  note: string | null;
}> {
  const errors: Record<string, string> = {};

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name || name.length > 60) {
    errors.name = "نام مکان الزامی است و حداکثر ۶۰ کاراکتر می‌باشد.";
  }

  let validUrl: string | null = null;
  if (typeof data.url === "string" && data.url.trim().length > 0) {
    const trimmedUrl = data.url.trim();
    if (!isValidHttpUrl(trimmedUrl)) {
      errors.url = "لینک مکان باید با http:// یا https:// شروع شود و حداکثر ۳۰۰ کاراکتر باشد.";
    } else {
      validUrl = trimmedUrl;
    }
  }

  let validNote: string | null = null;
  if (typeof data.note === "string" && data.note.trim().length > 0) {
    const trimmedNote = data.note.trim();
    if (trimmedNote.length > 120) {
      errors.note = "یادداشت مکان نمی‌تواند بیشتر از ۱۲۰ کاراکتر باشد.";
    } else {
      validNote = trimmedNote;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      name,
      url: validUrl,
      note: validNote,
    },
  };
}
