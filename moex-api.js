/**
 * Класс для ограничения количества запросов к API
 * Обеспечивает не более maxRequests запросов в указанный интервал времени
 */
class RateLimiter {
    constructor(maxRequests, interval) {
        this.maxRequests = maxRequests;  // Максимальное количество запросов
        this.interval = interval;       // Интервал времени в мс
        this.queue = [];                // Очередь запросов
        this.timestamps = [];           // Временные метки выполненных запросов
    }

    /**
     * Добавляет запрос в очередь на выполнение
     * @param {Function} requestFn - Функция запроса
     * @returns {Promise} - Промис с результатом запроса
     */
    async execute(requestFn) {
        return new Promise((resolve, reject) => {
            this.queue.push({ requestFn, resolve, reject });
            this.processQueue();
        });
    }

    /**
     * Обрабатывает очередь запросов с учетом ограничений
     */
    processQueue() {
        const now = Date.now();
        
        // Удаляем старые таймстампы (старше текущего интервала)
        this.timestamps = this.timestamps.filter(ts => ts > now - this.interval);
        
        // Выполняем запросы, если есть доступные слоты
        while (this.timestamps.length < this.maxRequests && this.queue.length > 0) {
            const { requestFn, resolve, reject } = this.queue.shift();
            this.timestamps.push(now);
            
            // Выполняем запрос и обрабатываем результат
            requestFn()
                .then(resolve)
                .catch(reject);
        }
        
        // Если в очереди еще есть запросы, планируем следующий цикл обработки
        if (this.queue.length > 0) {
            const nextExecution = Math.max(0, (this.timestamps[0] || 0) + this.interval - now);
            setTimeout(() => this.processQueue(), nextExecution);
        }
    }
}

// Создаем rate limiter: максимум 10 запросов в секунду
const apiLimiter = new RateLimiter(10, 1000);

// Кэш данных о инструментах
let stockDataCache = [];
// Время последнего обновления
let lastUpdateTime = null;

/**
 * Безопасный fetch с обработкой ошибок и rate limiting
 * @param {string} url - URL для запроса
 * @returns {Promise} - Промис с данными ответа
 */
async function safeFetch(url) {
    try {
        // Выполняем запрос через rate limiter
        const response = await apiLimiter.execute(() => fetch(url));
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Ошибка запроса:', error);
        throw error;
    }
}

/**
 * Обрабатывает данные о ценных бумагах с MOEX
 * @param {Array} data - Массив данных о бумагах
 * @param {Array} columns - Массив названий колонок
 * @param {string} type - Тип инструмента ('акция' или 'фьючерс')
 * @returns {Array} - Обработанный массив инструментов
 */
function processSecuritiesData(data, columns, type) {
    // Находим индексы нужных колонок
    const secIdIndex = columns.indexOf('SECID');
    const nameIndex = columns.indexOf('SHORTNAME');
    const lotSizeIndex = columns.indexOf('LOTSIZE');
    const minStepIndex = columns.indexOf('MINSTEP');
    const secNameIndex = columns.indexOf('SECNAME');
    const matDateIndex = columns.indexOf('MATDATE');

    return data.map(item => {
        // Для фьючерсов используем SECNAME и дату экспирации
        let name, expiration;
        if (type === 'фьючерс') {
            expiration = matDateIndex !== -1 ? item[matDateIndex] : null;
            name = expiration 
                ? `${item[secNameIndex] || item[secIdIndex]} (${item[secIdIndex]}, ${expiration})`
                : `${item[secNameIndex] || item[secIdIndex]} (${item[secIdIndex]})`;
        } else {
            name = item[nameIndex];
        }

        return {
            ticker: item[secIdIndex],
            name: name,
            shares_per_lot: parseInt(item[lotSizeIndex]) || 1,
            step: parseFloat(item[minStepIndex]) || 0.01,
            type: type,
            expiration: expiration
        };
    }).filter(item => item.ticker && item.name); // Фильтруем пустые значения
}

/**
 * Загружает данные об акциях и фьючерсах с MOEX
 * @returns {Promise} - Промис, который разрешается при завершении загрузки
 */
async function loadStockData() {
    try {
        // Проверяем кэш в localStorage
        const cachedData = localStorage.getItem('moexData');
        const cachedTime = localStorage.getItem('moexDataTimestamp');
        
        // Если есть свежие данные в кэше (моложе 5 минут) - используем их
        if (cachedData && cachedTime && (Date.now() - parseInt(cachedTime)) < 5 * 60 * 1000) {
            stockDataCache = JSON.parse(cachedData);
            lastUpdateTime = parseInt(cachedTime);
            console.log('Используются кэшированные данные');
            return;
        }

        // Параллельно загружаем данные об акциях и фьючерсах
        const [sharesData, futuresData] = await Promise.all([
            safeFetch('https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities.json?iss.meta=off'),
            safeFetch('https://iss.moex.com/iss/engines/futures/markets/forts/securities.json?iss.meta=off')
        ]);

        // Обрабатываем данные
        const shares = processSecuritiesData(
            sharesData.securities.data,
            sharesData.securities.columns,
            'акция'
        );

        const futures = processSecuritiesData(
            futuresData.securities.data,
            futuresData.securities.columns,
            'фьючерс'
        );

        // Объединяем и сохраняем данные
        stockDataCache = [...shares, ...futures];
        lastUpdateTime = Date.now();
        
        // Сохраняем в localStorage
        localStorage.setItem('moexData', JSON.stringify(stockDataCache));
        localStorage.setItem('moexDataTimestamp', lastUpdateTime.toString());

        console.log('Данные с MOEX успешно загружены');
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        
        // Пробуем использовать кэшированные данные при ошибке
        if (localStorage.getItem('moexData')) {
            stockDataCache = JSON.parse(localStorage.getItem('moexData'));
            console.warn('Используем кэшированные данные из-за ошибки');
        } else {
            // Fallback данные, если кэша нет
            stockDataCache = [
                {
                    ticker: "SBER",
                    name: "Сбербанк",
                    shares_per_lot: 10,
                    step: 0.01,
                    type: "акция"
                },
                {
                    ticker: "GAZP",
                    name: "Газпром",
                    shares_per_lot: 10,
                    step: 0.01,
                    type: "акция"
                },
                {
                    ticker: "SiM5",
                    name: "Фьючерс на USD/RUB (SiM5)",
                    shares_per_lot: 1,
                    step: 0.25,
                    type: "фьючерс",
                    expiration: "2025-05-15"
                }
            ];
            console.warn('Используем fallback данные');
        }
        
        throw error;
    }
}

/**
 * Возвращает загруженные данные об инструментах
 * @returns {Array} - Массив инструментов
 */
function getStockData() {
    return stockDataCache;
}

/**
 * Возвращает время последнего обновления данных
 * @returns {number|null} - Timestamp последнего обновления
 */
function getLastUpdateTime() {
    return lastUpdateTime;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadStockData();
        console.log('Данные инициализированы');
    } catch (error) {
        console.error('Ошибка инициализации данных:', error);
    }
});

// Экспортируем API для использования в других скриптах
window.MOEX_API = {
    loadStockData,
    getStockData,
    getLastUpdateTime
};