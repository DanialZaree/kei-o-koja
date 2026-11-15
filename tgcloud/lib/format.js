export function toPersianDigits(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[0-9]/g, (d) =>
    String.fromCharCode(d.charCodeAt(0) + 0x06F0 - 0x0030)
  );
}

export function renderProgressBar(percentage) {
  const totalBars = 10;
  const filledBars = Math.min(totalBars, Math.max(0, Math.round((percentage / 100) * totalBars)));
  const emptyBars = totalBars - filledBars;
  return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}

