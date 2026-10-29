// Error codes returned by /api/auth/* -> messages (Uzbek source strings, translated with t()).
const CODES = {
  username_taken: 'Bu login band. Boshqasini tanlang.',
  username_invalid: "Login faqat harf, raqam va @ . + - _ belgilaridan iborat bo'lsin.",
  password_too_short: "Parol kamida 8 belgidan iborat bo'lsin.",
  password_too_common: 'Bu parol juda oddiy.',
  password_entirely_numeric: "Parol faqat raqamlardan iborat bo'lmasin.",
  password_too_similar: "Parol loginga juda o'xshash.",
  password_wrong: "Hozirgi parol noto'g'ri.",
  code_invalid: "Kod noto'g'ri yoki muddati o'tgan.",
  email_failed: "Email yuborib bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
};

export const NETWORK_ERROR = "Serverga ulanib bo'lmadi. Internetni tekshiring.";

/** First readable message from an ApiError, checking the given fields in order. */
export function authError(err, fields = []) {
  if (!err || err.status === 0 || err.status >= 500) {
    return err && err.data && CODES[err.data.detail] ? CODES[err.data.detail] : NETWORK_ERROR;
  }
  if (err.status === 429) return "Juda ko'p urinish. Keyinroq qayta urinib ko'ring.";
  const data = err.data && typeof err.data === 'object' ? err.data : {};
  for (const key of fields) {
    const list = data[key];
    if (Array.isArray(list) && list.length) {
      return CODES[list[0]] || (key === 'email' ? "Email noto'g'ri." : list[0]);
    }
  }
  return CODES[data.detail] || "Ma'lumotlarni tekshiring.";
}
