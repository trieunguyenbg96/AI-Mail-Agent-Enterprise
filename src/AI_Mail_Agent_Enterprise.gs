/**
 * ==============================================================
 * AI MAIL AGENT V5.2 PRO (100% STANDALONE - DYNAMIC 4-RULE SETUP)
 * Phiên bản Doanh nghiệp (Xưng hô: Sếp - Em)
 * Tính năng mới V5.2:
 * - Khi bấm /start (hoặc chưa setup Rule): Hiển thị thông báo 4 Rule mặc định
 *   chưa được setup kèm Text Gợi ý cho từng Rule để Sếp chọn hoặc tự nhập Value.
 * - Lưu Value riêng của từng Rule vào bộ nhớ và áp dụng trực tiếp khi lọc Gmail.
 * ==============================================================
 */

const CONFIG = {
  DEFAULT_MODEL: 'gemini-3.5-flash',
  FALLBACK_MODEL: 'gemini-3.5-flash-lite',
  PAGE_SIZE: 6,
  MAX_ALERTS_PER_RUN: 3,
  MAX_BODY_LENGTH: 6000,
  CACHE_TTL: 21600
};

// Bộ Gợi ý mặc định cho 4 Rule tương ứng với 4 nút chức năng
const RULE_SUGGESTIONS = {
  CRITICAL: 'phỏng vấn, interview, mã xác minh, otp, cảnh báo, bảo mật, gia hạn, hết hạn, khẩn, hóa đơn',
  UNREAD: 'tất cả thư chưa đọc (hoặc thêm từ khóa: hợp đồng, báo giá, thanh toán)',
  INBOX: 'tất cả thư mới trong hộp thư đến (hoặc thêm: -quảng cáo)',
  SPAM: 'tất cả thư trong mục Spam + từ khóa: khuyến mãi, giảm giá, trúng thưởng, vay tiền'
};

const RULE_TITLES = {
  CRITICAL: '🔴 Khẩn cấp & Quan trọng',
  UNREAD: '📩 Email Chưa đọc (Unread)',
  INBOX: '📥 Mới nhất trong Hộp thư đến',
  SPAM: '⚫ Kiểm tra Hòm thư Rác (Spam)'
};

// ==============================================================
// 1. CẤU HÌNH & QUẢN LÝ BỘ NHỚ 4 RULE EMAIL
// ==============================================================

function getProp(key, required = false, defaultVal = '') {
  const val = PropertiesService.getScriptProperties().getProperty(key);
  if (required && !val) throw new Error('Thiếu cấu hình Script Property: ' + key);
  return val ? val.trim() : defaultVal;
}

function isAllowedChat(chatId) {
  const rawAllowed = getProp('TELEGRAM_CHAT_ID', true);
  const allowedList = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
  return allowedList.includes(String(chatId).trim());
}

function fmtText(val, maxLen = 500, datePattern = '') {
  if (val === null || val === undefined || val === '') return '—';
  if (val instanceof Date && !isNaN(val.getTime())) {
    const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
    return Utilities.formatDate(val, tz, datePattern || 'dd/MM/yyyy');
  }
  let text = String(val).replace(/\s+/g, ' ').trim();
  return text.length > maxLen ? text.substring(0, maxLen - 3) + '...' : (text || '—');
}

function getOwnEmails() {
  const own = new Set();
  try {
    const email = Session.getEffectiveUser().getEmail();
    if (email) own.add(email.toLowerCase());
    GmailApp.getAliases().forEach(a => a && own.add(a.toLowerCase()));
  } catch (e) {}
  return own;
}

function extractEmail(raw) {
  const text = String(raw || '').trim().toLowerCase();
  const match = text.match(/<([^>]+)>/) || text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  return match ? (match[1] || match[0]).trim() : text;
}

function getGmailDirectUrl(id) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(String(id || '').trim())}`;
}

// Lấy dữ liệu 4 Rule mà Sếp đã lưu (Nếu chưa setup thì trả về rỗng cho từng mục)
function getSavedRules() {
  const raw = PropertiesService.getScriptProperties().getProperty('USER_4_RULES_V52');
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch (e) {}
  }
  return { CRITICAL: '', UNREAD: '', INBOX: '', SPAM: '' };
}

function saveUserRules(rulesObj) {
  PropertiesService.getScriptProperties().setProperty('USER_4_RULES_V52', JSON.stringify(rulesObj));
}

function isAllRulesEmpty() {
  const r = getSavedRules();
  return !r.CRITICAL && !r.UNREAD && !r.INBOX && !r.SPAM;
}

// Chuyển đổi Value của Sếp ở từng Rule thành câu lệnh tìm kiếm Gmail (Gmail Search Query)
function buildGmailQueryFromRule(category) {
  const saved = getSavedRules();
  const rawVal = String(saved[category] || '').trim();

  // Tách các từ khóa người dùng đã nhập (bỏ qua các câu mô tả mặc định)
  const parseKeywords = (str) => {
    if (!str || str.includes('tất cả thư')) return [];
    return str.split(',')
      .map(s => s.trim())
      .filter(s => s.length > 1 && !s.startsWith('tất cả'));
  };

  const kws = parseKeywords(rawVal || RULE_SUGGESTIONS[category]);

  if (category === 'CRITICAL') {
    const list = kws.length ? kws : ['phỏng vấn', 'interview', 'mã xác minh', 'otp', 'cảnh báo', 'bảo mật', 'gia hạn', 'hết hạn', 'khẩn', 'hóa đơn'];
    const orGroup = list.map(k => k.includes(' ') ? `"${k}"` : k).join(' OR ');
    return `in:inbox (${orGroup})`;
  }

  if (category === 'UNREAD') {
    if (!kws.length) return 'in:inbox is:unread';
    const orGroup = kws.map(k => k.includes(' ') ? `"${k}"` : k).join(' OR ');
    return `in:inbox is:unread (${orGroup})`;
  }

  if (category === 'INBOX') {
    if (!kws.length) return 'in:inbox';
    const orGroup = kws.map(k => k.startsWith('-') ? k : (k.includes(' ') ? `"${k}"` : k)).join(' ');
    return `in:inbox ${orGroup}`;
  }

  if (category === 'SPAM') {
    if (!kws.length) return 'in:spam';
    const orGroup = kws.map(k => k.includes(' ') ? `"${k}"` : k).join(' OR ');
    return `in:spam OR (${orGroup})`;
  }

  return 'in:inbox';
}

// ==============================================================
// 2. MÀN HÌNH HỎI & SETUP 4 RULE EMAIL (ONBOARDING & CUSTOM INPUT)
// ==============================================================

function sendRuleSetupScreen(chatId, isFromStart = false) {
  const saved = getSavedRules();
  const hasAnySetup = !isAllRulesEmpty();

  const statusLine = (key) => saved[key]
    ? `✅ Đã setup: ${saved[key]}`
    : `⚠️ Chưa được setup sẵn\n   💡 Gợi ý: ${RULE_SUGGESTIONS[key]}`;

  const headerText = (!hasAnySetup || isFromStart)
    ? `🤖 THIẾT LẬP RULE LỌC EMAIL\n\n` +
      `Dạ em chào Sếp ạ! Hiện tại đang có 4 Rule Email mặc định ${!hasAnySetup ? 'chưa được setup sẵn' : ''}, Sếp vui lòng setup các value cho từng rule để sau này em lọc Email cho Sếp dễ hơn nhé:\n\n`
    : `⚙️ QUẢN LÝ 4 RULE EMAIL CỦA SẾP\n\nDưới đây là cấu hình Value hiện tại cho 4 Rule lọc Email:\n\n`;

  const bodyText =
    `1️⃣ ${RULE_TITLES.CRITICAL}\n` +
    `   ↳ ${statusLine('CRITICAL')}\n\n` +
    `2️⃣ ${RULE_TITLES.UNREAD}\n` +
    `   ↳ ${statusLine('UNREAD')}\n\n` +
    `3️⃣ ${RULE_TITLES.INBOX}\n` +
    `   ↳ ${statusLine('INBOX')}\n\n` +
    `4️⃣ ${RULE_TITLES.SPAM}\n` +
    `   ↳ ${statusLine('SPAM')}\n\n` +
    `👇 Sếp có thể bấm nút "Áp dụng luôn toàn bộ Gợi ý" hoặc bấm vào từng Rule bên dưới để tự nhập Value riêng nhé ạ:`;

  const keyboard = [
    [{ text: '✅ Áp dụng luôn toàn bộ Gợi ý mẫu ở trên', callback_data: 'RSET|USE_SUGGESTIONS' }],
    [
      { text: '✏️ 1. Khẩn cấp & Quan trọng', callback_data: 'RSET|ASK|CRITICAL' },
      { text: '✏️ 2. Email Chưa đọc', callback_data: 'RSET|ASK|UNREAD' }
    ],
    [
      { text: '✏️ 3. Mới nhất Hộp thư đến', callback_data: 'RSET|ASK|INBOX' },
      { text: '✏️ 4. Hòm thư Rác (Spam)', callback_data: 'RSET|ASK|SPAM' }
    ],
    [{ text: '📝 Tự nhập cả 4 Rule trong 1 tin nhắn', callback_data: 'RSET|ASK|ALL' }]
  ];

  if (hasAnySetup) {
    keyboard.push([
      { text: '🔄 Xóa về trạng thái Chưa setup', callback_data: 'RSET|CLEAR_ALL' },
      { text: '🏠 Vào Menu chính', callback_data: 'MAIN_MENU' }
    ]);
  } else {
    keyboard.push([{ text: '⏭️ Bỏ qua, vào Menu chính trước', callback_data: 'MAIN_MENU' }]);
  }

  sendTelegram(chatId, headerText + bodyText, keyboard);
}

function askUserForRuleValue(chatId, ruleKey) {
  const cache = CacheService.getScriptCache();
  cache.put(`WAIT_RULE_V52_${chatId}`, ruleKey, 600);

  if (ruleKey === 'ALL') {
    const text =
      `📝 SETUP CẢ 4 RULE TRONG 1 LẦN\n\n` +
      `Dạ Sếp hãy copy mẫu 4 dòng dưới đây, sửa lại các từ khóa theo ý Sếp (cách nhau bằng dấu phẩy) rồi gửi vào khung chat cho em nhé:\n\n` +
      `1: phỏng vấn, otp, mã xác minh, cảnh báo bảo mật, gia hạn, hóa đơn\n` +
      `2: hợp đồng, báo giá, khách hàng, sếp\n` +
      `3: tất cả thư mới\n` +
      `4: khuyến mãi, giảm giá, trúng thưởng, quảng cáo`;

    return sendTelegram(chatId, text, [
      [{ text: '💡 Dùng luôn Gợi ý cho cả 4 Rule', callback_data: 'RSET|USE_SUGGESTIONS' }],
      [{ text: '🔙 Quay lại bảng Rule', callback_data: 'RSET|SCREEN' }]
    ]);
  }

  const saved = getSavedRules();
  const currentVal = saved[ruleKey] || '(Chưa setup)';
  const suggestion = RULE_SUGGESTIONS[ruleKey];

  const text =
    `✏️ SETUP VALUE CHO RULE:\n${RULE_TITLES[ruleKey]}\n\n` +
    `📌 Trạng thái hiện tại: ${currentVal}\n` +
    `💡 Gợi ý mẫu của em:\n"${suggestion}"\n\n` +
    `👉 Sếp hãy gõ trực tiếp các từ khóa / value mà Sếp muốn lọc cho Rule này (cách nhau bằng dấu phẩy) rồi gửi cho em nhé!\n` +
    `Hoặc Sếp bấm nút bên dưới để lấy luôn Value gợi ý ạ:`;

  sendTelegram(chatId, text, [
    [{ text: '✅ Lấy luôn Value Gợi ý cho Rule này', callback_data: `RSET|FILL_ONE|${ruleKey}` }],
    [{ text: '🔙 Quay lại bảng Rule', callback_data: 'RSET|SCREEN' }]
  ]);
}

function processUserRuleTextInput(chatId, text) {
  const cache = CacheService.getScriptCache();
  const waitingKey = cache.get(`WAIT_RULE_V52_${chatId}`);
  if (!waitingKey) return false;

  const saved = getSavedRules();

  if (waitingKey === 'ALL') {
    const lines = text.split('\n');
    lines.forEach(line => {
      const clean = line.trim();
      if (!clean.includes(':')) return;
      const [prefix, ...rest] = clean.split(':');
      const val = rest.join(':').trim();
      if (!val) return;
      const p = prefix.toLowerCase();

      if (p.includes('1') || p.includes('khẩn') || p.includes('quan trọng')) saved.CRITICAL = val;
      else if (p.includes('2') || p.includes('chưa đọc') || p.includes('unread')) saved.UNREAD = val;
      else if (p.includes('3') || p.includes('mới nhất') || p.includes('hộp thư')) saved.INBOX = val;
      else if (p.includes('4') || p.includes('rác') || p.includes('spam')) saved.SPAM = val;
    });

    saveUserRules(saved);
    cache.remove(`WAIT_RULE_V52_${chatId}`);
    sendTelegram(chatId, '🎉 Dạ em đã lưu đầy đủ Value cho cả 4 Rule của Sếp rồi ạ!');
    sendRuleSetupScreen(chatId, false);
    return true;
  }

  saved[waitingKey] = text.trim();
  saveUserRules(saved);
  cache.remove(`WAIT_RULE_V52_${chatId}`);

  sendTelegram(chatId, `✅ Dạ em đã lưu Value cho [${RULE_TITLES[waitingKey]}] thành công rồi ạ!`);
  sendRuleSetupScreen(chatId, false);
  return true;
}

// ==============================================================
// 3. BỘ NÃO GEMINI AI & PHÂN LOẠI NHANH THEO RULE ĐÃ SETUP
// ==============================================================

function classifyByRules(emailData) {
  const saved = getSavedRules();
  const critRaw = saved.CRITICAL || RULE_SUGGESTIONS.CRITICAL;
  const spamRaw = saved.SPAM || RULE_SUGGESTIONS.SPAM;

  const critKws = critRaw.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 1 && !s.startsWith('tất cả'));
  const spamKws = spamRaw.split(',').map(s => s.trim().toLowerCase()).filter(s => s.length > 1 && !s.startsWith('tất cả'));

  const from = String(emailData.from || '').toLowerCase();
  const text = `${from} ${emailData.subject || ''} ${emailData.body || ''}`.toLowerCase();

  const matchedCrit = critKws.find(k => text.includes(k));
  if (matchedCrit) {
    return { matched: true, mail_level: 'VERY_IMPORTANT', reason: `Khớp Rule Khẩn cấp & Quan trọng (Từ khóa: "${matchedCrit}").` };
  }

  const matchedSpam = spamKws.find(k => text.includes(k));
  if (matchedSpam) {
    return { matched: true, mail_level: 'JUNK', reason: `Khớp Rule Hòm thư Rác / Spam (Từ khóa: "${matchedSpam}").` };
  }

  return { matched: false, mail_level: 'NORMAL', reason: 'Email thông tin định kỳ.' };
}

function getAvailableGeminiModels(apiKey) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('STANDALONE_GEMINI_MODELS');
  if (cached) return JSON.parse(cached);

  try {
    const res = UrlFetchApp.fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
      { method: 'get', muteHttpExceptions: true }
    );
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      const models = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''))
        .filter(name => !name.includes('vision') && !name.includes('embedding') && !name.includes('tts') && !name.includes('image') && !name.includes('aqa'));

      models.sort((a, b) => (b.includes('flash') ? 1 : 0) - (a.includes('flash') ? 1 : 0));
      if (models.length) {
        const top = models.slice(0, 5);
        cache.put('STANDALONE_GEMINI_MODELS', JSON.stringify(top), 21600);
        return top;
      }
    }
  } catch (e) {}
  return [];
}

function callGeminiAPI(apiKey, payload) {
  if (!apiKey) return { success: false };
  const discovered = getAvailableGeminiModels(apiKey);
  const modelsToTry = [
    ...discovered,
    getProp('GEMINI_MODEL', false, CONFIG.DEFAULT_MODEL),
    getProp('GEMINI_FALLBACK_MODEL', false, CONFIG.FALLBACK_MODEL),
    'gemini-3.5-flash',
    'gemini-2.5-flash'
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  for (let m = 0; m < modelsToTry.length; m++) {
    const currentModel = modelsToTry[m];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;

    try {
      const res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      });
      if (res.getResponseCode() === 200) {
        return { success: true, data: JSON.parse(res.getContentText()) };
      }
    } catch (e) {}
  }
  return { success: false };
}

function summarizeEmailWithAI(emailData) {
  const cache = CacheService.getScriptCache();
  const cacheKey = emailData.msgId ? `AI_SUM_${emailData.msgId}` : '';
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const rule = classifyByRules(emailData);
  const fallbackResult = {
    summary: fmtText(emailData.body, 450),
    action_items: 'Sếp kiểm tra nội dung chi tiết và phản hồi nếu cần thiết ạ.',
    deadline: '—',
    mail_level: rule.mail_level,
    reason: rule.reason
  };

  const apiKey = getProp('GEMINI_API_KEY', false, '');
  if (!apiKey) return fallbackResult;

  const savedRules = getSavedRules();
  const body = String(emailData.body || '').substring(0, CONFIG.MAX_BODY_LENGTH);
  const prompt = `Bạn là Trợ lý AI chuyên nghiệp của Sếp.
Quy tắc ưu tiên của Sếp: ${JSON.stringify(savedRules)}
Hãy phân tích email dưới đây và trả về ĐÚNG 1 OBJECT JSON:
{
  "summary": "Tóm tắt nội dung cốt lõi trong tối đa 3 câu tiếng Việt rõ ràng, lịch sự",
  "action_items": "Việc Sếp cần làm (nếu không có ghi 'Không cần thao tác')",
  "deadline": "Hạn chót nếu email có nêu rõ (nếu không có ghi '—')",
  "mail_level": "VERY_IMPORTANT" | "IMPORTANT" | "NORMAL" | "JUNK",
  "reason": "Giải thích ngắn gọn 1 câu vì sao phân loại như vậy"
}

FROM: ${emailData.from || ''}
SUBJECT: ${emailData.subject || ''}
BODY:
${body}`;

  const res = callGeminiAPI(apiKey, {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });

  if (res.success) {
    try {
      const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim());
      const finalObj = {
        summary: parsed.summary || fallbackResult.summary,
        action_items: parsed.action_items || fallbackResult.action_items,
        deadline: parsed.deadline || '—',
        mail_level: rule.matched ? rule.mail_level : (parsed.mail_level || 'NORMAL'),
        reason: rule.matched ? rule.reason : (parsed.reason || fallbackResult.reason)
      };
      if (cacheKey) cache.put(cacheKey, JSON.stringify(finalObj), 21600);
      return finalObj;
    } catch (e) {}
  }

  return fallbackResult;
}

// ==============================================================
// 4. GIAO DIỆN TELEGRAM & LỌC EMAIL THEO RULE ĐÃ SETUP
// ==============================================================

function telegramApi(method, payload = {}) {
  const token = getProp('TELEGRAM_BOT_TOKEN', true);
  const res = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'post',
    payload: payload,
    muteHttpExceptions: true
  });
  const data = JSON.parse(res.getContentText());
  if (!data.ok) throw new Error(`Telegram ${method} lỗi: ${res.getContentText()}`);
  return data;
}

function sendTelegram(chatId, text, keyboard = null) {
  const payload = { chat_id: String(chatId), text: String(text) };
  if (keyboard) payload.reply_markup = JSON.stringify({ inline_keyboard: keyboard });
  return telegramApi('sendMessage', payload);
}

function sendTelegramMenu(chatId = getProp('TELEGRAM_CHAT_ID', true).split(',')[0].trim()) {
  const keyboard = [
    [{ text: '🔴 Khẩn cấp & Quan trọng', callback_data: 'GMENU|CRITICAL|0' }],
    [{ text: '📩 Email Chưa đọc (Unread)', callback_data: 'GMENU|UNREAD|0' }],
    [{ text: '📥 Mới nhất trong Hộp thư đến', callback_data: 'GMENU|INBOX|0' }],
    [{ text: '⚫ Kiểm tra Hòm thư Rác (Spam)', callback_data: 'GMENU|SPAM|0' }],
    [{ text: '⚙️ Setup / Chỉnh sửa 4 Rule Email', callback_data: 'RSET|SCREEN' }]
  ];
  sendTelegram(
    chatId,
    '🤖 TRỢ LÝ EMAIL AI (LIVE GMAIL V5.2)\n\n' +
    'Dạ em chào Sếp ạ! Sếp muốn kiểm tra nhanh nhóm email nào bên dưới, thiết lập lại Rule hay nhắn trực tiếp nội dung cần tìm cho em nhé ạ:',
    keyboard
  );
}

function sendLiveCategoryPage(chatId, category, page) {
  const gmailQuery = buildGmailQueryFromRule(category);
  const saved = getSavedRules();
  const ruleValText = saved[category] || `(Theo gợi ý: ${RULE_SUGGESTIONS[category]})`;

  const ownEmails = getOwnEmails();
  const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';

  let threads = [];
  try {
    threads = GmailApp.search(gmailQuery, 0, 36);
  } catch (e) {
    threads = GmailApp.search('in:inbox', 0, 20);
  }

  const items = [];
  threads.forEach(t => {
    const msgs = t.getMessages();
    const msg = msgs[msgs.length - 1];
    if (ownEmails.has(extractEmail(msg.getFrom()))) return;
    const dt = msg.getDate();
    items.push({
      msgId: msg.getId(),
      subject: msg.getSubject() || '(Không có tiêu đề)',
      shortDate: dt ? Utilities.formatDate(dt, tz, 'dd/MM') : '--/--',
      isUnread: msg.isUnread()
    });
  });

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / CONFIG.PAGE_SIZE));
  const safePage = Math.max(0, Math.min(Math.floor(Number(page) || 0), totalPages - 1));
  const pageItems = items.slice(safePage * CONFIG.PAGE_SIZE, (safePage + 1) * CONFIG.PAGE_SIZE);

  let text = `${RULE_TITLES[category] || category}\n` +
             `🎯 Rule đang áp dụng: ${fmtText(ruleValText, 90)}\n` +
             `📬 Tìm thấy: ${total} luồng thư  |  📄 Trang ${safePage + 1}/${totalPages}`;
  const keyboard = [];

  if (!pageItems.length) {
    text += '\n\n📭 Dạ hiện không có email nào khớp với Rule này thưa Sếp.';
  } else {
    text += '\n👇 Sếp chạm trực tiếp vào tiêu đề email bên dưới để xem chi tiết nhé ạ:';
    pageItems.forEach((item, i) => {
      const num = safePage * CONFIG.PAGE_SIZE + i + 1;
      const icon = item.isUnread ? '🔵' : '✅';
      keyboard.push([{
        text: `${icon} ${num}. [${item.shortDate}] ${fmtText(item.subject, 42)}`,
        callback_data: `GVIEW|${item.msgId}|${category}|${safePage}`
      }]);
    });
  }

  const nav = [];
  if (safePage > 0) nav.push({ text: '◀️ Trang trước', callback_data: `GMENU|${category}|${safePage - 1}` });
  if (safePage + 1 < totalPages) nav.push({ text: 'Trang sau ▶️', callback_data: `GMENU|${category}|${safePage + 1}` });
  if (nav.length) keyboard.push(nav);

  keyboard.push([
    { text: '✏️ Sửa Rule này', callback_data: `RSET|ASK|${category}` },
    { text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }
  ]);

  sendTelegram(chatId, text, keyboard);
}

function sendLiveGmailDetail(chatId, msgId, backCat = '', backPage = 0) {
  let msg = null;
  try { msg = GmailApp.getMessageById(String(msgId)); } catch (e) {}

  if (!msg) {
    return sendTelegram(chatId, '⚠️ Dạ thưa Sếp, em không tìm thấy email này (có thể thư đã bị xóa khỏi Gmail) ạ.');
  }

  const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  const from = msg.getFrom();
  const subject = msg.getSubject() || '(Không có tiêu đề)';
  const dateStr = Utilities.formatDate(msg.getDate(), tz, 'dd/MM/yyyy HH:mm');
  const plainBody = msg.getPlainBody() || '';
  const isRead = !msg.isUnread();
  const gmailUrl = getGmailDirectUrl(msgId);

  const ai = summarizeEmailWithAI({
    msgId: msgId,
    from: from,
    subject: subject,
    body: plainBody
  });

  const text =
    `📧 CHI TIẾT EMAIL (Mã: #${msgId})\n\n` +
    `📌 Tiêu đề: ${fmtText(subject, 280)}\n` +
    `👤 Người gửi: ${fmtText(from, 220)}\n` +
    `🕐 Thời gian: ${dateStr}\n\n` +
    `📝 Tóm tắt nội dung:\n${fmtText(ai.summary, 650)}\n\n` +
    `✅ Đề xuất xử lý:\n${fmtText(ai.action_items, 450)}\n\n` +
    `⏰ Hạn chót (Deadline): ${fmtText(ai.deadline, 150)}\n` +
    `🏷 Mức độ: ${ai.mail_level} — ${fmtText(ai.reason, 200)}\n` +
    `👁 Trạng thái Gmail: ${isRead ? 'Đã đọc' : 'Chưa đọc'}\n` +
    `🔗 Truy cập nhanh: ${gmailUrl}\n\n` +
    `💡 Mẹo: Để soạn thư nháp trả lời, Sếp nhắn:\n"Trả lời mã #${msgId} là [nội dung ý chính]"`;

  const bottomRow = [{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }];
  if (backCat) {
    bottomRow.unshift({ text: '🔙 Quay lại danh sách', callback_data: `GMENU|${backCat}|${backPage}` });
  }

  sendTelegram(chatId, text, [
    [{ text: '🔗 Mở trực tiếp email này trên Gmail', url: gmailUrl }],
    [{
      text: isRead ? '✅ Đã đọc trên Gmail' : '☑️ Đánh dấu ĐÃ ĐỌC trên Gmail',
      callback_data: `GREVIEW|${msgId}|${backCat}|${backPage}`
    }],
    bottomRow
  ]);
}

// ==============================================================
// 5. TÌM KIẾM TỰ NHIÊN & SOẠN THƯ NHÁP TRỰC TIẾP GMAIL
// ==============================================================

function buildLiveSearchPlan(userQuery) {
  const q = String(userQuery || '').toLowerCase().trim();

  const idMatch = q.match(/#([a-z0-9]{10,25})/i);
  if ((q.includes('trả lời') || q.includes('phản hồi') || q.includes('soạn')) && idMatch) {
    return { intent: 'DRAFT_REPLY', msgId: idMatch[1], instruction: userQuery };
  }

  if (q.includes('đánh dấu') && (q.includes('hết') || q.includes('tất cả') || q.includes('hàng loạt'))) {
    return { intent: 'BULK_READ' };
  }

  let limit = 8;
  const limitMatch = q.match(/(\d+)\s*(email|mail|thư|tin)/i) || q.match(/(top|xem)\s*(\d+)/i);
  if (limitMatch) {
    const num = Number(limitMatch[1]) || Number(limitMatch[2]);
    if (num > 0) limit = Math.min(num, 15);
  }

  const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  const todaySlash = Utilities.formatDate(new Date(), tz, 'yyyy/MM/dd');

  const isSpamBoxQuery =
    q.includes('thư rác') || q.includes('hòm thư rác') || q.includes('hộp thư rác') ||
    q.includes('mail rác') || q.includes('email rác') || q.includes('mục rác') || q.includes('spam');
  const isTrashQuery = q.includes('thùng rác') || q.includes('đã xóa') || q.includes('trash');
  const isSentQuery = q.includes('đã gửi') || q.includes('thư gửi đi') || q.includes('sent');

  if (isSpamBoxQuery && !q.includes('từ ')) {
    return {
      intent: 'SEARCH',
      specialBox: 'SPAM',
      gmailQuery: buildGmailQueryFromRule('SPAM'),
      isTodayQuery: false,
      priorityKeywords: [],
      sortBy: 'NEWEST',
      limit: limit
    };
  }

  if (isTrashQuery) {
    return { intent: 'SEARCH', specialBox: 'TRASH', gmailQuery: 'in:trash', isTodayQuery: false, priorityKeywords: [], sortBy: 'NEWEST', limit: limit };
  }

  if (isSentQuery) {
    return { intent: 'SEARCH', specialBox: 'SENT', gmailQuery: 'in:sent', isTodayQuery: false, priorityKeywords: [], sortBy: 'NEWEST', limit: limit };
  }

  const queryParts = [];
  let isTodayQuery = false;

  if (q.includes('hôm nay') || q.includes('today')) {
    isTodayQuery = true;
    queryParts.push(`after:${todaySlash}`);
  } else if (q.includes('hôm qua') || q.includes('yesterday')) {
    queryParts.push('newer_than:2d');
  } else if (q.includes('tuần này') || q.includes('7 ngày') || q.includes('tuần qua')) {
    queryParts.push('newer_than:7d');
  } else if (q.includes('tháng này') || q.includes('30 ngày') || q.includes('tháng qua')) {
    queryParts.push('newer_than:30d');
  }

  if (q.includes('chưa đọc') || q.includes('chưa xem') || q.includes('unread')) {
    queryParts.push('is:unread');
  }

  const priorityKeywords = [];
  if (q.includes('thư mời') || q.includes('lịch phỏng vấn') || q.includes('mời phỏng vấn')) {
    priorityKeywords.push('thư mời', 'mời phỏng vấn', 'lịch phỏng vấn', 'invitation', 'schedule');
  }

  if (q.includes('phỏng vấn') || q.includes('interview')) {
    queryParts.push('("phỏng vấn" OR interview OR "tuyển dụng")');
  } else if (q.includes('bảo mật') || q.includes('security') || q.includes('cảnh báo')) {
    queryParts.push('("bảo mật" OR security OR "cảnh báo" OR alert)');
  } else if (q.includes('otp') || q.includes('xác minh') || q.includes('xác thực')) {
    queryParts.push('(otp OR "mã xác minh" OR "mã xác thực" OR "verification code")');
  } else if (q.includes('gia hạn') || q.includes('hết hạn')) {
    queryParts.push('("gia hạn" OR "hết hạn" OR renew OR expire)');
  } else if (q.includes('hóa đơn') || q.includes('thanh toán') || q.includes('báo giá') || q.includes('invoice')) {
    queryParts.push('("hóa đơn" OR "thanh toán" OR "báo giá" OR invoice OR payment)');
  } else {
    const stopWords = new Set([
      'tìm', 'và', 'show', 'cho', 'anh', 'sếp', 'những', 'các', 'email', 'mail', 'thư', 'tin', 'nhắn',
      'có', 'nội', 'dung', 'nhé', 'nha', 'em', 'ơi', 'ưu', 'tiên', 'mời', 'xem', 'giúp', 'về',
      'của', 'nào', 'gì', 'đâu', 'sao', 'thế', 'không', 'mới', 'nhất', 'gần', 'đây', 'hôm', 'nay',
      'qua', 'tuần', 'tháng', 'năm', 'ngày', 'này', 'trước', 'tất', 'cả', 'danh', 'sách', 'top',
      'lấy', 'ra', 'kiểm', 'tra', 'check', 'trong', 'kho', 'hộp', 'hòm', 'mục', 'ngăn', 'đến',
      'vừa', 'nhận', 'được', 'cần', 'quan', 'trọng', 'rất', 'bình', 'thường', 'rác', 'spam',
      'chưa', 'đọc', 'đã', 'trực', 'tiếp', 'từ', 'gmail', 'hiện', 'tại', 'đang', 'bao', 'nhiêu'
    ]);

    const freeWords = q
      .replace(/[.,?!;:"'()]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !/^\d+$/.test(w) && !stopWords.has(w));

    if (freeWords.length) {
      queryParts.push(freeWords.join(' '));
    }
  }

  queryParts.push('-in:trash -in:drafts');
  const wantNewest = q.includes('mới nhất') || q.includes('gần đây') || isTodayQuery;
  const wantPriority = q.includes('ưu tiên') || priorityKeywords.length > 0;

  return {
    intent: 'SEARCH',
    specialBox: '',
    gmailQuery: queryParts.join(' ').trim() || 'in:inbox',
    isTodayQuery: isTodayQuery,
    priorityKeywords: priorityKeywords,
    sortBy: (wantPriority && !wantNewest) ? 'PRIORITY' : 'NEWEST',
    limit: limit
  };
}

function handleNaturalLanguageAgent(chatId, userQuery) {
  const plan = buildLiveSearchPlan(userQuery);
  const tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';

  if (plan.intent === 'BULK_READ') {
    const unreadThreads = GmailApp.search('in:inbox is:unread', 0, 50);
    if (unreadThreads.length > 0) GmailApp.markThreadsRead(unreadThreads);
    return sendTelegram(
      chatId,
      `✅ Dạ báo cáo Sếp! Em đã đánh dấu ĐÃ ĐỌC trực tiếp trên Gmail cho ${unreadThreads.length} luồng thư chưa đọc gần nhất rồi ạ!`,
      [[{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]
    );
  }

  if (plan.intent === 'DRAFT_REPLY' && plan.msgId) {
    let msg = null;
    try { msg = GmailApp.getMessageById(plan.msgId); } catch (e) {}
    if (!msg) return sendTelegram(chatId, `⚠️ Dạ thưa Sếp, em không tìm thấy email mã #${plan.msgId} trên Gmail ạ.`);

    sendTelegram(chatId, '✍️ Dạ Sếp đợi em vài giây để em soạn bản nháp phản hồi vào Gmail nhé ạ...');

    const apiKey = getProp('GEMINI_API_KEY', false, '');
    let draftBody = '';
    if (apiKey) {
      const prompt = `Bạn là Trợ lý soạn thảo email chuyên nghiệp cho Sếp. Hãy viết nội dung email phản hồi lịch sự, chuẩn mực dựa trên:
- Người nhận: ${msg.getFrom()}
- Tiêu đề thư gốc: ${msg.getSubject()}
- Nội dung thư gốc: ${fmtText(msg.getPlainBody(), 1000)}
- Yêu cầu chỉ đạo của Sếp: "${plan.instruction}"
Chỉ trả về nội dung bức thư để gửi đi, không kèm lời giải thích bên ngoài.`;

      const res = callGeminiAPI(apiKey, { contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      draftBody = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    if (!draftBody) {
      draftBody = `Chào anh/chị,\n\nTôi đã nhận được email về việc "${msg.getSubject()}".\n${plan.instruction}\n\nTrân trọng,`;
    }

    msg.createDraftReply(draftBody);
    return sendTelegram(
      chatId,
      `✍️ BÁO CÁO SẾP: ĐÃ TẠO BẢN NHÁP GMAIL!\n\n` +
      `📧 Phản hồi thư: ${fmtText(msg.getSubject(), 120)}\n\n` +
      `📝 Nội dung em đã soạn:\n${fmtText(draftBody, 700)}\n\n` +
      `👉 Sếp mở mục Thư nháp (Drafts) trên Gmail để kiểm tra và bấm Gửi nhé ạ!`,
      [[{ text: '👁 Xem lại thư này', callback_data: `GVIEW|${plan.msgId}` }, { text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]
    );
  }

  let threads = [];
  let customNote = '';

  try {
    threads = GmailApp.search(plan.gmailQuery, 0, 35);
  } catch (e) {
    threads = GmailApp.search('in:inbox', 0, 20);
  }

  if (threads.length === 0 && plan.specialBox === 'SPAM') {
    const trashThreads = GmailApp.search('in:trash', 0, 15);
    if (trashThreads.length > 0) {
      threads = trashThreads;
      customNote = `✨ Dạ báo cáo Sếp, mục Thư Rác (Spam) hiện đang sạch bóng (0 email) ạ!\n🗑️ Tuy nhiên trong Thùng Rác (Trash) đang có ${trashThreads.length} email, em hiển thị bên dưới để Sếp tiện kiểm tra nhé:\n\n`;
    } else {
      return sendTelegram(
        chatId,
        `🎉 Dạ báo cáo Sếp! Em vừa kiểm tra cả Hòm thư Rác (Spam) và Thùng Rác (Trash) trên Gmail của Sếp: Hiện tại hộp thư cực kỳ sạch sẽ, không có email rác nào ạ!`,
        [[{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]
      );
    }
  }

  let fallbackToRecent = false;
  if (threads.length === 0 && plan.isTodayQuery) {
    fallbackToRecent = true;
    threads = GmailApp.search('in:inbox', 0, 20);
  }

  if (!threads.length) {
    return sendTelegram(
      chatId,
      `🕵️‍♀️ Dạ báo cáo Sếp, em đã tra cứu trên toàn bộ hộp thư Gmail (với bộ lọc: ${plan.gmailQuery}) nhưng hiện không có email nào khớp với yêu cầu: "${userQuery}" ạ!`,
      [[{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]
    );
  }

  const ownEmails = getOwnEmails();
  const candidates = [];

  threads.forEach(thread => {
    const msgs = thread.getMessages();
    const msg = msgs[msgs.length - 1];
    const fromRaw = msg.getFrom();
    if (plan.specialBox !== 'SENT' && ownEmails.has(extractEmail(fromRaw))) return;

    const dt = msg.getDate();
    const subj = msg.getSubject() || '(Không có tiêu đề)';
    const snippet = msg.getPlainBody().substring(0, 280).replace(/\s+/g, ' ').trim();
    const isUnread = msg.isUnread();

    const rule = classifyByRules({ from: fromRaw, subject: subj, body: snippet });
    const level = rule.matched ? rule.mail_level : (isUnread ? 'IMPORTANT' : 'NORMAL');

    let score = 0;
    const fullLower = `${fromRaw} ${subj} ${snippet}`.toLowerCase();
    if (plan.priorityKeywords.length > 0) {
      plan.priorityKeywords.forEach(pk => {
        if (fullLower.includes(pk)) score += 50;
      });
    }
    if (level === 'VERY_IMPORTANT') score += 25;
    else if (level === 'IMPORTANT') score += 10;

    candidates.push({
      msgId: msg.getId(),
      timeMs: dt ? dt.getTime() : 0,
      shortDate: dt ? Utilities.formatDate(dt, tz, 'dd/MM/yyyy') : '—',
      from: fmtText(fromRaw, 55),
      subject: fmtText(subj, 90),
      snippet: fmtText(snippet, 120),
      level: level,
      isUnread: isUnread,
      score: score
    });
  });

  if (plan.sortBy === 'PRIORITY') {
    candidates.sort((a, b) => (b.score - a.score) || (b.timeMs - a.timeMs));
  } else {
    candidates.sort((a, b) => (b.timeMs - a.timeMs));
  }

  const topEmails = candidates.slice(0, plan.limit);
  if (!topEmails.length) {
    return sendTelegram(chatId, '📭 Dạ hiện không có email nào phù hợp thưa Sếp.', [[{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]);
  }

  let header = customNote || (fallbackToRecent
    ? `📭 Dạ báo cáo Sếp, hôm nay (${Utilities.formatDate(new Date(), tz, 'dd/MM/yyyy')}) hộp thư Gmail chưa có email mới nào gửi đến ạ.\n💡 Em xin phép hiển thị ${topEmails.length} email mới nhất gần đây để Sếp tiện kiểm tra nhé:\n\n`
    : `⚡ KẾT QUẢ TRA CỨU TRỰC TIẾP GMAIL\n🔎 Bộ lọc: [${plan.gmailQuery}]\n📬 Tìm thấy: ${candidates.length} luồng thư phù hợp (Hiển thị top ${topEmails.length}):\n\n`);

  const preview = topEmails.slice(0, 3).map((e, idx) =>
    `• ${idx + 1}. [${e.shortDate}] ${e.subject}\n   👤 Từ: ${e.from}`
  ).join('\n\n');

  const replyText =
    header +
    `🌟 Điểm nhanh 3 thư đầu danh sách:\n${preview}\n\n` +
    `👇 Sếp chạm trực tiếp vào từng nút tiêu đề bên dưới để em đọc nội dung và tóm tắt chi tiết nhé ạ:`;

  const keyboard = topEmails.map((item, idx) => {
    const icon = !item.isUnread ? '✅' : (item.level === 'VERY_IMPORTANT' ? '🔴' : '🔵');
    return [{
      text: `${icon} ${idx + 1}. [${item.shortDate.slice(0, 5)}] ${fmtText(item.subject, 40)}`,
      callback_data: `GVIEW|${item.msgId}`
    }];
  });

  keyboard.push([{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]);
  sendTelegram(chatId, replyText, keyboard);
}

// ==============================================================
// 6. TELEGRAM WEBHOOK ROUTER (KHÔNG CÓ TRANG CẤU HÌNH WEB)
// ==============================================================

function doPost(e) {
  if (!e?.postData?.contents) return HtmlService.createHtmlOutput('OK');

  const update = JSON.parse(e.postData.contents);
  const chatId = String(update?.callback_query?.message?.chat?.id || update?.message?.chat?.id || '');

  if (!chatId || !isAllowedChat(chatId)) return HtmlService.createHtmlOutput('OK');

  const cache = CacheService.getScriptCache();
  const cacheKey = update.update_id ? `TG_V52_UPD_${update.update_id}` : '';
  if (cacheKey) {
    if (cache.get(cacheKey)) return HtmlService.createHtmlOutput('OK');
    cache.put(cacheKey, '1', CONFIG.CACHE_TTL);
  }

  const msgDate = update?.message?.date || 0;
  if (msgDate > 0 && (Math.floor(Date.now() / 1000) - msgDate) > 120) {
    return HtmlService.createHtmlOutput('OK');
  }

  try {
    if (update.callback_query) {
      const cb = update.callback_query;
      try { telegramApi('answerCallbackQuery', { callback_query_id: String(cb.id) }); } catch (err) {}

      const data = String(cb.data || '');

      if (data === 'MAIN_MENU') {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        sendTelegramMenu(chatId);
      } else if (data === 'RSET|SCREEN') {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        sendRuleSetupScreen(chatId, false);
      } else if (data === 'RSET|USE_SUGGESTIONS') {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        saveUserRules({ ...RULE_SUGGESTIONS });
        sendTelegram(chatId, '✅ Dạ em đã lưu toàn bộ Value Gợi ý cho cả 4 Rule Email của Sếp rồi ạ! Bây giờ Sếp có thể lọc email cực nhanh theo 4 nhóm bên dưới:');
        sendTelegramMenu(chatId);
      } else if (data === 'RSET|CLEAR_ALL') {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        saveUserRules({ CRITICAL: '', UNREAD: '', INBOX: '', SPAM: '' });
        sendRuleSetupScreen(chatId, true);
      } else if (data.startsWith('RSET|ASK|')) {
        const ruleKey = data.split('|')[2];
        askUserForRuleValue(chatId, ruleKey);
      } else if (data.startsWith('RSET|FILL_ONE|')) {
        const ruleKey = data.split('|')[2];
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        const saved = getSavedRules();
        saved[ruleKey] = RULE_SUGGESTIONS[ruleKey];
        saveUserRules(saved);
        sendTelegram(chatId, `✅ Đã áp dụng Value gợi ý cho [${RULE_TITLES[ruleKey]}]!`);
        sendRuleSetupScreen(chatId, false);
      } else if (data.startsWith('GMENU|')) {
        const [, category, page] = data.split('|');
        sendLiveCategoryPage(chatId, category, Number(page || 0));
      } else if (data.startsWith('GVIEW|')) {
        const [, msgId, backCat, backPage] = data.split('|');
        sendLiveGmailDetail(chatId, msgId, backCat || '', Number(backPage || 0));
      } else if (data.startsWith('GREVIEW|')) {
        const [, msgId, backCat, backPage] = data.split('|');
        const msg = GmailApp.getMessageById(msgId);
        if (msg) {
          msg.markRead();
          const backRow = backCat
            ? [[{ text: '🔙 Quay lại danh sách', callback_data: `GMENU|${backCat}|${Number(backPage || 0)}` }, { text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]]
            : [[{ text: '🏠 Menu chính', callback_data: 'MAIN_MENU' }]];
          sendTelegram(chatId, `✅ Dạ em đã đánh dấu ĐÃ ĐỌC trực tiếp trên Gmail cho thư:\n📧 ${fmtText(msg.getSubject(), 120)}`, backRow);
        }
      }
    } else if (update.message) {
      const text = String(update.message.text || '').trim();
      if (!text) return HtmlService.createHtmlOutput('OK');

      // KHI SẾP BẤM /start HOẶC /rules -> HIỆN NGAY BẢNG HỎI SETUP 4 RULE EMAIL!
      if (/^\/(start|rules)(@|$)/.test(text)) {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        sendRuleSetupScreen(chatId, true);
        return HtmlService.createHtmlOutput('OK');
      }

      if (/^\/menu(@|$)/.test(text)) {
        cache.remove(`WAIT_RULE_V52_${chatId}`);
        sendTelegramMenu(chatId);
        return HtmlService.createHtmlOutput('OK');
      }

      // Nếu Sếp đang gõ Value cho Rule thì lưu vào Rule
      if (processUserRuleTextInput(chatId, text)) {
        return HtmlService.createHtmlOutput('OK');
      }

      // Nếu chưa setup Rule nào mà Sếp chat lần đầu, nhắc nhẹ hoặc tìm kiếm luôn
      handleNaturalLanguageAgent(chatId, text);
    }
  } catch (err) {
    Logger.log('❌ Lỗi doPost: ' + err.message);
  }

  return HtmlService.createHtmlOutput('OK');
}

// Web configuration UI and saveWebConfig() intentionally removed.
// Configure credentials manually in Apps Script > Project Settings > Script Properties.
// Web App only receives Telegram webhook POSTs through doPost(e).

function setupBot() {
  const webhookUrl = getProp('TELEGRAM_WEBHOOK_URL', true);
  telegramApi('deleteWebhook', { drop_pending_updates: true });
  Utilities.sleep(1000);
  const res = telegramApi('setWebhook', {
    url: webhookUrl,
    allowed_updates: JSON.stringify(['message', 'callback_query']),
    drop_pending_updates: true
  });
  Logger.log('✅ Đã cài đặt Webhook thành công: ' + JSON.stringify(res));

  // Ngay khi cài đặt xong (hoặc nếu chưa setup Rule), gửi luôn bảng hỏi Setup 4 Rule Email!
  const primaryChatId = getProp('TELEGRAM_CHAT_ID', true).split(',')[0].trim();
  if (isAllRulesEmpty()) {
    sendRuleSetupScreen(primaryChatId, true);
  } else {
    sendTelegramMenu(primaryChatId);
  }
}