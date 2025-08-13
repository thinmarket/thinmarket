// faq-bot.js

// Глобальные переменные
let faqData = {};
let faqLoaded = false;
let pendingOperatorQuestion = null;
const OPERATOR_KEYWORDS = ["оператор", "саппорт", "поддержка", "человек", "помощь"];
const MIN_QUESTION_LENGTH = 5;

// Загрузка базы знаний
fetch('faq-data.json')
  .then(res => res.json())
  .then(data => {
    faqData = data;
    faqLoaded = true;
    console.log("FAQ data loaded successfully");
  })
  .catch(err => {
    console.error("Error loading FAQ data:", err);
    faqData = {};
    faqLoaded = true;
  });

// Получение имени текущей страницы
function getPageName() {
  const path = window.location.pathname;
  return path.substring(path.lastIndexOf('/') + 1) || 'index.html';
}

// Создание интерфейса бота
(function createBotWidget() {
  // Добавляем CSS стили
  const style = document.createElement('style');
  style.textContent = `
    .faq-bot-button {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 9999;
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    
    .faq-bot-button:hover {
      transform: scale(1.1);
    }
    
    .faq-bot-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: bold;
      transition: all 0.3s ease;
      overflow: hidden;
      padding: 0;
    }
    
    .faq-bot-circle img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
      transition: transform 0.3s ease;
    }
    
    .faq-bot-circle:hover {
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
      transform: translateY(-2px);
    }
    
    .faq-bot-modal {
      display: none;
      position: fixed;
      width: 380px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 40px);
      background: #1a1a1a;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 10000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #ffffff;
      border: 1px solid #333;
      flex-direction: column;
    }
    
    .faq-bot-header {
      background: #252525;
      color: white;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move;
      user-select: none;
      border-bottom: 1px solid #333;
      flex-shrink: 0;
    }
    
    .faq-bot-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
    
    .faq-bot-header .status {
      font-size: 11px;
      opacity: 0.8;
      margin-top: 2px;
    }
    
    .close-faq-bot {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background 0.2s;
    }
    
    .close-faq-bot:hover {
      background: rgba(255,255,255,0.1);
    }
    
    .faq-bot-chat {
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      background: #1a1a1a;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: #333 #1a1a1a;
      min-height: 0;
    }
    
    .faq-bot-chat::-webkit-scrollbar {
      width: 6px;
    }
    
    .faq-bot-chat::-webkit-scrollbar-track {
      background: #1a1a1a;
    }
    
    .faq-bot-chat::-webkit-scrollbar-thumb {
      background: #333;
      border-radius: 3px;
    }
    
    .faq-bot-chat::-webkit-scrollbar-thumb:hover {
      background: #444;
    }
    
    .message {
      display: flex;
      gap: 10px;
      animation: fadeIn 0.3s ease;
      flex-shrink: 0;
    }
    
    .message.user {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      flex-shrink: 0;
    }
    
    .message.user .message-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .message.bot .message-avatar {
      background: #333;
      color: #8BC34A;
      overflow: hidden;
    }
    
    .message.bot .message-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .message-content {
      max-width: 75%;
      padding: 10px 14px;
      border-radius: 16px;
      line-height: 1.4;
      word-wrap: break-word;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .message.user .message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-bottom-right-radius: 4px;
    }
    
    .message.bot .message-content {
      background: #252525;
      color: #ffffff;
      border: 1px solid #333;
      border-bottom-left-radius: 4px;
    }
    
    .faq-bot-input-area {
      padding: 16px;
      background: #252525;
      border-top: 1px solid #333;
      flex-shrink: 0;
    }
    
    .input-container {
      display: flex;
      gap: 10px;
      align-items: flex-end;
    }
    
    .user-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid #444;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s;
      resize: none;
      min-height: 18px;
      max-height: 80px;
      font-family: inherit;
      background: #1a1a1a;
      color: #ffffff;
    }
    
    .user-input:focus {
      border-color: #667eea;
    }
    
    .user-input::placeholder {
      color: #888;
    }
    
    .send-button {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
      font-size: 14px;
    }
    
    .send-button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }
    
    .typing-indicator {
      display: none;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #252525;
      border: 1px solid #333;
      border-radius: 16px;
      border-bottom-left-radius: 4px;
      max-width: 75%;
      flex-shrink: 0;
    }
    
    .typing-indicator .message-avatar {
      overflow: hidden;
    }
    
    .typing-indicator .message-avatar img {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .typing-dots {
      display: flex;
      gap: 3px;
    }
    
    .typing-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #8BC34A;
      animation: typing 1.4s infinite;
    }
    
    .typing-dot:nth-child(2) { animation-delay: 0.2s; }
    .typing-dot:nth-child(3) { animation-delay: 0.4s; }
    
    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-8px); }
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @media (max-width: 768px) {
      .faq-bot-modal {
        width: calc(100vw - 20px);
        height: calc(100vh - 20px);
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
      
      .faq-bot-button {
        bottom: 20px;
        right: 20px;
      }
    }
  `;
  document.head.appendChild(style);

  // Кнопка бота
  const botButton = document.createElement('div');
  botButton.className = 'faq-bot-button';
  botButton.innerHTML = `
    <button class="faq-bot-circle">
      <img src="assets/img/buttons/Robot_bot.png" alt="FAQ Bot" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
    </button>
  `;
  document.body.appendChild(botButton);

  // Модальное окно бота
  const modal = document.createElement('div');
  modal.className = 'faq-bot-modal';
  modal.style.display = 'none'; // Явно скрываем при создании
  modal.innerHTML = `
    <div class="faq-bot-header">
      <div>
        <h3>FAQ Ассистент</h3>
        <div class="status">Онлайн • Готов помочь</div>
      </div>
      <button class="close-faq-bot">×</button>
    </div>
    <div class="faq-bot-chat">
      <div class="message bot">
        <div class="message-avatar">
          <img src="assets/img/buttons/Robot_bot.png" alt="Bot Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
        </div>
        <div class="message-content">
          Привет! 👋 Я FAQ ассистент ThinMarket! Могу ответить на вопросы о котировках, инструментах, навигации по сайту и многом другом. Просто напишите ваш вопрос! Я работаю в тестовом режиме и пока знаю мало ответов, но вы всегда можете обратиться к оператору и вам ответят в телеграм.
        </div>
      </div>
    </div>
    <div class="typing-indicator">
      <div class="message-avatar">
        <img src="assets/img/buttons/Robot_bot.png" alt="Bot Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
      </div>
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
    <div class="faq-bot-input-area">
      <div class="input-container">
        <textarea 
          class="user-input" 
          placeholder="Напишите ваш вопрос..."
          rows="1"
        ></textarea>
        <button class="send-button">➤</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Обработчики событий
  document.querySelector('.faq-bot-circle').addEventListener('click', function() {
    console.log('FAQ bot button clicked!');
    toggleFaqBot();
  });
  document.querySelector('.close-faq-bot').addEventListener('click', closeFaqBot);
  document.querySelector('.send-button').addEventListener('click', findAnswer);
  
  const textarea = document.querySelector('.user-input');
  textarea.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      findAnswer();
    }
  });
  
  // Автоматическое изменение высоты textarea
  textarea.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  // Перетаскивание модального окна
  setupDragAndDrop();
  
  // Обработчик изменения размера окна для прокрутки чата
  window.addEventListener('resize', function() {
    const modal = document.querySelector('.faq-bot-modal');
    const chat = document.querySelector('.faq-bot-chat');
    if (modal && modal.style.display === 'block' && chat) {
      setTimeout(() => {
        chat.scrollTop = chat.scrollHeight;
      }, 100);
    }
  });
})();

// Переключение видимости бота
function toggleFaqBot() {
  const modal = document.querySelector('.faq-bot-modal');
  const currentDisplay = modal.style.display;
  
  if (currentDisplay === 'flex' || currentDisplay === 'block') {
    closeFaqBot();
  } else {
    openFaqBot();
  }
}

// Функция открытия модального окна с гарантированным позиционированием
function openFaqBot() {
  const modal = document.querySelector('.faq-bot-modal');
  const btn = document.querySelector('.faq-bot-button');
  const btnRect = btn.getBoundingClientRect();
  const modalWidth = 380;
  const modalHeight = 600;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  if (isMobile) {
    // Для мобильных - фиксированное положение
    modal.style.bottom = '10px';
    modal.style.left = '10px';
    modal.style.right = '10px';
    modal.style.top = '10px';
    modal.style.transform = 'none';
  } else {
    // Для десктопа - позиционируем над кнопкой
    let left = btnRect.left - modalWidth - 20;
    let top = btnRect.top - modalHeight - 20;

    // Если не хватает места слева - показываем справа
    if (left < 10) {
      left = btnRect.right + 20;
    }

    // Если не хватает места сверху - показываем снизу
    if (top < 10) {
      top = btnRect.bottom + 20;
    }

    // Корректируем по горизонтали
    if (left + modalWidth > window.innerWidth - 10) {
      left = window.innerWidth - modalWidth - 10;
    }
    left = Math.max(10, left);

    // Корректируем по вертикали
    if (top + modalHeight > window.innerHeight - 10) {
      top = window.innerHeight - modalHeight - 10;
    }
    top = Math.max(10, top);

    modal.style.left = left + 'px';
    modal.style.top = top + 'px';
    modal.style.transform = 'none';
  }

  // Явно устанавливаем display: flex для правильной работы flexbox
  modal.style.display = 'flex';
  
  // Проверяем и исправляем структуру модального окна
  const inputArea = modal.querySelector('.faq-bot-input-area');
  const chat = modal.querySelector('.faq-bot-chat');
  
  if (inputArea && chat) {
    // Убеждаемся, что окно ввода видимо
    inputArea.style.display = 'block';
    inputArea.style.visibility = 'visible';
    inputArea.style.opacity = '1';
    
    // Убеждаемся, что чат имеет правильную высоту
    chat.style.flex = '1';
    chat.style.minHeight = '0';
    chat.style.overflowY = 'auto';
  }
  
  // Принудительная прокрутка чата вниз при открытии
  setTimeout(() => {
    if (chat) {
      chat.scrollTop = chat.scrollHeight;
    }
  }, 100);
  
  // Фокус на поле ввода
  const userInput = modal.querySelector('.user-input');
  if (userInput) {
    userInput.focus();
  }
}

// Закрытие модального окна
function closeFaqBot() {
  const modal = document.querySelector('.faq-bot-modal');
  // Явно скрываем модальное окно
  modal.style.display = 'none';
  
  // Сбрасываем поле ввода
  const userInput = document.querySelector('.user-input');
  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
  }
  
  // Скрываем индикатор печати
  const typingIndicator = document.querySelector('.typing-indicator');
  if (typingIndicator) {
    typingIndicator.style.display = 'none';
  }
  
  // Сбрасываем состояние оператора как в старой версии
  pendingOperatorQuestion = null;
  console.log('Modal closed, pendingOperatorQuestion reset:', pendingOperatorQuestion);
}

// Настройка перетаскивания модального окна
function setupDragAndDrop() {
  const modal = document.querySelector('.faq-bot-modal');
  const header = document.querySelector('.faq-bot-header');
  
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  header.addEventListener('mousedown', function(e) {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    if (e.target.classList.contains('close-faq-bot')) return;
    
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
    modal.style.cursor = 'grabbing';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    
    let left = e.clientX - offsetX;
    let top = e.clientY - offsetY;
    
    // Ограничиваем перемещение в пределах viewport
    left = Math.max(0, Math.min(window.innerWidth - modal.offsetWidth, left));
    top = Math.max(0, Math.min(window.innerHeight - modal.offsetHeight, top));
    
    modal.style.left = left + 'px';
    modal.style.top = top + 'px';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
    modal.style.cursor = '';
  });
}

// Основная функция поиска ответа
function findAnswer() {
  if (!faqLoaded) {
    showBotMessage("База знаний загружается, попробуйте чуть позже...");
    return;
  }

  const userInput = document.querySelector('.user-input');
  const userQ = userInput.value.trim();
  if (!userQ) return;

  const userQlower = userQ.toLowerCase();
  const page = getPageName();
  
  // Добавляем сообщение пользователя
  addUserMessage(userQ);
  userInput.value = '';
  userInput.style.height = 'auto';

  // Показываем индикатор печати
  showTypingIndicator();

  // 1. Проверка на запрос оператора
  if (isOperatorRequest(userQlower, userQ.length)) {
    setTimeout(() => {
      hideTypingIndicator();
      if (userQlower === 'оператор') {
        // Если пользователь написал "оператор", устанавливаем pending question
        pendingOperatorQuestion = "оператор";
        showBotMessage(`
          Режим работы оператора: 24/7 (круглосуточно).<br><br>
          Пожалуйста, опишите ваш вопрос подробнее, а затем укажите ваш Telegram в формате @username.<br>
          Или напишите вопрос и @username в одном сообщении.
        `);
      } else {
        handleOperatorRequest(userQ);
      }
    }, 1000);
    return;
  }

  // 2. Проверка на pending question (контакт для оператора)
  console.log("Checking pendingOperatorQuestion:", pendingOperatorQuestion);
  if (pendingOperatorQuestion) {
    setTimeout(() => {
      hideTypingIndicator();
      handleOperatorRequest(userQ);
    }, 1000);
    return;
  }

  // 3. Поиск в FAQ - сначала на текущей странице, потом в общем разделе
  const pageFaq = faqData[page] || [];
  const generalFaq = faqData['general'] || [];
  const allFaq = [...pageFaq, ...generalFaq];

  if (allFaq.length === 0) {
    setTimeout(() => {
      hideTypingIndicator();
      showBotMessage("Извините, не нашёл ответ на ваш вопрос.");
    }, 1000);
    return;
  }

  try {
    const fuse = new Fuse(allFaq, {
      keys: [
        { name: 'q', weight: 0.7 },
        { name: 'a', weight: 0.3 }
      ],
      threshold: 0.35,
      minMatchCharLength: 2,
      includeScore: true
    });

    const results = fuse.search(userQlower);
    
    setTimeout(() => {
      hideTypingIndicator();
      
      if (results.length > 0) {
        const bestMatch = results.reduce((prev, curr) => 
          curr.score < prev.score ? curr : prev
        );
        
        showBotMessage(bestMatch.item.a);
      } else {
        suggestOperatorOrRephrase();
      }
    }, 1000);
  } catch (error) {
    console.error("Search error:", error);
    setTimeout(() => {
      hideTypingIndicator();
      showBotMessage("Произошла ошибка при поиске ответа.");
    }, 1000);
  }
}

// Вспомогательные функции
function isOperatorRequest(text, length) {
  const result = (
    OPERATOR_KEYWORDS.some(word => text === word) ||
    (length < MIN_QUESTION_LENGTH && OPERATOR_KEYWORDS.some(word => text.includes(word)))
  );
  console.log('isOperatorRequest:', { text, length, result, keywords: OPERATOR_KEYWORDS });
  return result;
}

function handleOperatorRequest(question) {
  console.log('=== handleOperatorRequest START ===');
  console.log('Question:', question);
  console.log('Question length:', question.length);
  console.log('Pending question:', pendingOperatorQuestion);
  
  // Проверяем, есть ли @username в сообщении
  const usernameMatch = question.match(/@[a-zA-Z0-9_]{3,}/);
  
  if (usernameMatch) {
    // Есть @username в сообщении
    const username = usernameMatch[0];
    const questionText = question.replace(username, '').trim();
    
    console.log('Found username:', username);
    console.log('Question text:', questionText);
    
    if (questionText.length < 3) {
      // Если после извлечения username осталось мало текста, используем pending question
      if (pendingOperatorQuestion && pendingOperatorQuestion !== 'оператор') {
        console.log('Using pending question:', pendingOperatorQuestion);
        sendToOperator(pendingOperatorQuestion, username)
          .then(() => {
            console.log('Question sent successfully');
            showBotMessage("Вопрос отправлен оператору! Мы свяжемся с вами в Telegram.");
            pendingOperatorQuestion = null;
          })
          .catch(err => {
            console.error("Operator request failed:", err);
            showBotMessage("Упс! Ошибка отправки вопроса. Что-то с сервером. Попробуйте ещё разок, я тогда точно отправлю ваш ник и вопрос оператору. Вам ответят в телеграм в ближайшее время");
          });
      } else {
        showBotMessage("Пожалуйста, опишите ваш вопрос подробнее перед указанием @username.");
      }
    } else {
      // Используем текст из текущего сообщения
      console.log('Using current message as question');
      sendToOperator(questionText, username)
        .then(() => {
          console.log('Question sent successfully');
          showBotMessage("Вопрос отправлен оператору! Мы свяжемся с вами в Telegram.");
          pendingOperatorQuestion = null;
        })
        .catch(err => {
          console.error("Operator request failed:", err);
          showBotMessage("Упс! Ошибка отправки вопроса. Что-то с сервером. Попробуйте ещё разок, я тогда точно отправлю ваш ник и вопрос оператору. Вам ответят в телеграм в ближайшее время.");
        });
    }
    console.log('=== handleOperatorRequest END ===');
    return;
  }
  
  // Обработка случая, когда pendingOperatorQuestion === 'оператор'
  if (pendingOperatorQuestion === 'оператор') {
    console.log('Processing operator request with question:', question);
    
    // Проверяем, есть ли @username в сообщении
    const usernameMatch = question.match(/@[a-zA-Z0-9_]{3,}/);
    
    if (usernameMatch) {
      // Есть @username в сообщении
      const username = usernameMatch[0];
      const questionText = question.replace(username, '').trim();
      
      console.log('Found username:', username);
      console.log('Question text:', questionText);
      
      if (questionText.length < 3) {
        showBotMessage("Пожалуйста, опишите ваш вопрос подробнее перед указанием @username.");
      } else {
        // Используем текст из текущего сообщения
        console.log('Using current message as question');
        sendToOperator(questionText, username)
          .then((data) => {
            console.log('Question sent successfully:', data);
            showBotMessage("Вопрос отправлен оператору! Мы свяжемся с вами в Telegram.");
            pendingOperatorQuestion = null;
          })
          .catch(err => {
            console.error("Operator request failed:", err);
            showBotMessage("Упс! Ошибка отправки вопроса. Что-то с сервером. Попробуйте ещё разок, я тогда точно отправлю ваш ник и вопрос оператору. Вам ответят в телеграм в ближайшее время.");
          });
      }
    } else {
      // Нет @username, сохраняем вопрос и ждем контакт
      if (question.length < MIN_QUESTION_LENGTH) {
        console.log('Question too short');
        showBotMessage("Пожалуйста, опишите вопрос подробнее (минимум 5 символов).");
      } else {
        console.log('Setting question and waiting for contact:', question);
        pendingOperatorQuestion = question;
        showBotMessage(`
          Спасибо! Теперь укажите ваш Telegram в формате @username для связи.
        `);
      }
    }
    console.log('=== handleOperatorRequest END ===');
    return;
  }

  if (pendingOperatorQuestion && pendingOperatorQuestion !== 'оператор') {
    console.log('Processing pending question with contact:', question);
    const isValidFormat = /^@[a-zA-Z0-9_]{3,}$/.test(question);
    console.log('Is valid format:', isValidFormat);
    
    if (isValidFormat) {
      console.log('Valid Telegram format, sending to operator...');
      sendToOperator(pendingOperatorQuestion, question)
        .then(() => {
          console.log('Question sent successfully');
          showBotMessage("Вопрос отправлен оператору! Мы свяжемся с вами в Telegram.");
          pendingOperatorQuestion = null;
        })
        .catch(err => {
          console.error("Operator request failed:", err);
          showBotMessage("Упс! Ошибка отправки вопроса. Что-то с сервером. Попробуйте ещё разок, я тогда точно отправлю ваш ник и вопрос оператору. Вам ответят в телеграм в ближайшее время.");
        });
    } else {
      console.log('Invalid Telegram format');
      showBotMessage("Пожалуйста, укажите ваш Telegram в формате @username.");
    }
    console.log('=== handleOperatorRequest END ===');
    return;
  }

  if (question.length < MIN_QUESTION_LENGTH) {
    console.log('Question too short');
    showBotMessage("Пожалуйста, опишите вопрос подробнее (минимум 5 символов).");
    return;
  }

  console.log('Setting pending question:', question);
  pendingOperatorQuestion = question;
  showBotMessage(`
    Режим работы оператора: 24/7 (круглосуточно).<br><br>
    Пожалуйста, укажите ваш Telegram в формате @username для связи.<br>
    Или напишите вопрос и @username в одном сообщении.
  `);
  console.log('=== handleOperatorRequest END ===');
}

function sendToOperator(question, contact) {
  const messageData = {
    text: `🔔 НОВЫЙ ВОПРОС ОТ ПОЛЬЗОВАТЕЛЯ 🔔\n\n❓ Вопрос: ${question}\n\n📱 Контакт: ${contact}\n\n⏰ Время: ${new Date().toLocaleString('ru-RU')}`
  };
  
  console.log('=== sendToOperator START ===');
  console.log('Question:', question);
  console.log('Contact:', contact);
  console.log('Message data:', messageData);
  console.log('Full message text:', messageData.text);
  
  console.log('Starting fetch request...');
  
  // Создаем AbortController для таймаута
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
  
  return fetch('https://thinmarket-faq-server.onrender.com/send-to-telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messageData),
    signal: controller.signal
  }).then(res => {
    clearTimeout(timeoutId);
    console.log('Server response status:', res.status);
    console.log('Server response ok:', res.ok);
    console.log('Server response:', res);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return res.json();
  }).then(data => {
    console.log('Server response data:', data);
    console.log('=== sendToOperator END ===');
    return data;
  }).catch(err => {
    console.error('Fetch error:', err);
    console.log('=== sendToOperator ERROR ===');
    console.error('Error details:', err.message, err.stack);
    throw err;
  });
}

function addUserMessage(message) {
  const chat = document.querySelector('.faq-bot-chat');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message user';
  messageDiv.innerHTML = `
    <div class="message-avatar">👤</div>
    <div class="message-content">${escapeHtml(message)}</div>
  `;
  chat.appendChild(messageDiv);
  
  // Проверяем видимость окна ввода
  const inputArea = document.querySelector('.faq-bot-input-area');
  if (inputArea) {
    inputArea.style.display = 'block';
    inputArea.style.visibility = 'visible';
    inputArea.style.opacity = '1';
  }
  
  // Принудительная прокрутка с небольшой задержкой
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 10);
}

function showBotMessage(message) {
  const chat = document.querySelector('.faq-bot-chat');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message bot';
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <img src="assets/img/buttons/Robot_bot.png" alt="Bot Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">
    </div>
    <div class="message-content">${message}</div>
  `;
  chat.appendChild(messageDiv);
  
  // Проверяем видимость окна ввода
  const inputArea = document.querySelector('.faq-bot-input-area');
  if (inputArea) {
    inputArea.style.display = 'block';
    inputArea.style.visibility = 'visible';
    inputArea.style.opacity = '1';
  }
  
  // Принудительная прокрутка с задержкой для анимации
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 100);
  
  // Дополнительная прокрутка после полной загрузки контента
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 300);
}

function showTypingIndicator() {
  const indicator = document.querySelector('.typing-indicator');
  indicator.style.display = 'flex';
  const chat = document.querySelector('.faq-bot-chat');
  
  // Прокрутка к индикатору печати
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 50);
}

function hideTypingIndicator() {
  const indicator = document.querySelector('.typing-indicator');
  indicator.style.display = 'none';
  const chat = document.querySelector('.faq-bot-chat');
  
  // Прокрутка после скрытия индикатора
  setTimeout(() => {
    chat.scrollTop = chat.scrollHeight;
  }, 50);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function suggestOperatorOrRephrase() {
  showBotMessage(`
    Извините, не нашёл ответ на ваш вопрос.<br><br>
    Попробуйте:<br>
    • Переформулировать вопрос<br>
    • Написать оператору (введите "оператор")
  `);
}
