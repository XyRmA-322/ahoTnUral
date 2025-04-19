const TelegramBot = require('node-telegram-bot-api');
const token = '7886214781:AAH0PBuylmrBen4hLR6Q66NVtCyCCFo_vog';
const TARGET_CHAT_ID = '-4632010105';

const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('Server started'));

// Хранилище для связи сообщений
const messageStore = new Map();

const bot = new TelegramBot(token, { polling: true });

// Обработка всех входящих сообщений
bot.on('message', (msg) => {
  // Если это ответ в целевой группе
  //console.log(messageStore);
  if (msg.chat.id.toString() === TARGET_CHAT_ID && msg.reply_to_message) {
    handleGroupReply(msg);
    return;
  }

  // Если обычное сообщение от пользователя
  if (msg.chat.type === 'private' && !msg.reply_to_message) {
    handleUserMessage(msg);
  }
});

async function handleUserMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const messageId = msg.message_id;

  // Игнорируем команды
  if (text.startsWith('/')) {
    await bot.sendMessage(chatId, 'ℹ️ Сообщения-команды не пересылаются.');
    return;
  }

  try {
    // Пересылаем сообщение в группу
    const forwardedMsg = await bot.forwardMessage(TARGET_CHAT_ID, chatId, messageId);

    // Сохраняем связь: ID в группе → оригинальный чат и сообщение
    messageStore.set(forwardedMsg.message_id, {
      originalChatId: chatId,
      originalMessageId: messageId
    });

    await bot.sendMessage(chatId, '✅ Ваше сообщение переслано!');
  } catch (err) {
    console.error('Ошибка пересылки:', err);
    await bot.sendMessage(chatId, '❌ Не удалось переслать сообщение.');
  }
}

async function handleGroupReply(msg) {
  const repliedMsgId = msg.reply_to_message.message_id;
  const originalData = messageStore.get(repliedMsgId);

  if (!originalData) {
    console.log('Не найдено оригинальное сообщение для ответа');
    return;
  }

  try {
    // Отправляем ответ пользователю
    await bot.sendMessage(
      originalData.originalChatId,
      `📨 Ответ на ваше сообщение:\n\n${msg.text || '[медиа-сообщение]'}`,
      { reply_to_message_id: originalData.originalMessageId }
    );

    // Можно добавить реакцию в группе (опционально)
    await bot.sendMessage(TARGET_CHAT_ID, '✅ Ответ отправлен пользователю', {
      reply_to_message_id: msg.message_id
    });
  } catch (err) {
    console.error('Ошибка отправки ответа:', err);
  }
}

console.log('Бот запущен и готов к работе!');
