// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4904843409';
let lastProcessedUpdateId = 0;

// == Загрузка html2canvas ==
function loadHtml2Canvas() {
    return new Promise((resolve, reject) => {
        if (window.html2canvas) return resolve();
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// == Отправка скриншота ==
async function screenshotAndSend() {
    await loadHtml2Canvas();
    html2canvas(document.body, { scale: 2 }).then(canvas => {
        canvas.toBlob(async blob => {
 explanatory_message_1: Bu yerda sahifaning skrinshoti blob sifatida Telegramga `sendDocument` orqali yuboriladi.
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('document', blob, 'screenshot.png');

            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                console.error('Xato: Skrinshot yuborishda xatolik:', await res.text());
            } else {
                console.log('Skrinshot muvaffaqiyatli yuborildi.');
            }
        }, 'image/png');
    });
}

// == Мини-окно ==
function createMiniWindow() {
    const miniWindowHTML = `
        <div id="mini-window" style="display: none;">
            <div id="mini-window-content">--</div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

    const style = document.createElement('style');
    style.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 200px;
    height: 200px;
    background: rgba(255, 255, 255, 0);
    border: none;
    border-radius: 5px;
    overflow-y: auto;
    z-index: 1000;
    font-family: Arial, sans-serif;
}
#mini-window::-webkit-scrollbar {
    width: 6px;
}
#mini-window::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
}
#mini-window::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.5);
}
#mini-window::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0);
    border-radius: 5px;
}
#mini-window-content {
    padding: 5px;
    font-size: 14px;
    line-height: 1.5;
    max-height: calc(100% - 50px);
    color: rgba(204, 204, 204, 0.75);
}
    `;
    document.head.appendChild(style);
}

function toggleMiniWindow() {
    const win = document.getElementById('mini-window');
    if (!win) return;
    win.style.display = win.style.display === 'none' ? 'block' : 'none';
}

function appendMessageToMiniWindow(text) {
    const container = document.getElementById('mini-window-content');
    if (!container) return;
    const msg = document.createElement('p');
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
}

// == Получение новых сообщений ==
async function getNewAnswersFromTelegram() {
    try {
        const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok) {
            data.result.forEach(msg => {
                const text = msg.message?.text;
                const updateId = msg.update_id;

                if (text && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    appendMessageToMiniWindow(text);
                    console.log('Yangi xabar:', text);
                }
            });
        } else {
            console.error('Telegram API xatosi:', data.description);
        }
    } catch (error) {
        console.error('Xabar olishda xato:', error.message);
    } finally {
        setTimeout(getNewAnswersFromTelegram, 2000);
    }
}

// == Расмларни URL sifatida olish ==
function extractImageLinks(element) {
    const images = element?.querySelectorAll('img') || [];
    return Array.from(images).map(img => img.src);
}

// == Расмни Telegramга yuborish ==
async function sendPhotoToTelegram(imageUrl, caption = '') {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                photo: imageUrl,
                caption: caption
            }),
        });
        if (!response.ok) {
            console.error('Xato: Rasm yuborishda xatolik:', await response.text());
        } else {
            console.log('Rasm muvaffaqiyatli yuborildi:', imageUrl);
        }
    } catch (error) {
        console.error('Fetch xatosi (rasm yuborish):', error.message);
    }
}

// == Саволни Telegramга yuborish ==
async function sendQuestionToTelegram(question) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: question,
            }),
        });
        if (!response.ok) {
            console.error('Xato: Savol yuborishda xatolik:', await response.text());
        } else {
            console.log('Savol muvaffaqiyatli yuborildi:', question);
        }
    } catch (error) {
        console.error('Fetch xatosi:', error.message);
    }
}

// == Парсинг вопросов и ответов ==
async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.test-table');
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10);
        const idB = parseInt(b.id.replace(/\D/g, ''), 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Вопрос ${i + 1}:\n`;
        const question = test.querySelector('.test-question')?.textContent.trim() || 'Вопрос не найден';
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages.length > 0) {
            messageContent += `Изображения в вопросе:\n${questionImages.join('\n')}\n\n`;
            // Саволга tegishli rasmlarni yuborish
            for (const img of questionImages) {
                await sendPhotoToTelegram(img, `Вопрос ${i + 1} uchun rasm`);
            }
        }

        const answers = Array.from(test.querySelectorAll('.test-answers li')).map((li, index) => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            let answerText = li.textContent.replace(variant, '').trim();
            const answerImages = extractImageLinks(li);
            if (answerImages.length > 0) {
                answerText = answerText.replace(/\(Изображение:.*\)/, '').trim();
            }
            return { variant, answerText, images: answerImages };
        });

        messageContent += 'Варианты ответов:\n';
        for (const answer of answers) {
            messageContent += `${answer.variant} ${answer.answerText}${answer.images.length > 0 ? ` (Изображение: ${answer.images.join(', ')})` : ''}\n`;
            // Javob variantlariga tegishli rasmlarni yuborish
            for (const img of answer.images) {
                await sendPhotoToTelegram(img, `Вариант ${answer.variant} uchun rasm`);
            }
        }

        await sendQuestionToTelegram(messageContent);
    }
}

// == Обработка клавиш ==
document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'x') {
        screenshotAndSend();
    }
    if (e.key.toLowerCase() === 'm') {
        toggleMiniWindow();
    }
});

// == Скриншот по долгому ПКМ (> 1.2 сек) ==
let rightClickTimer = null;
document.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
        rightClickTimer = setTimeout(() => {
            screenshotAndSend();
        }, 1200);
    }
});
document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && rightClickTimer) {
        clearTimeout(rightClickTimer);
        rightClickTimer = null;
    }
});

// == ПКМ для переключения мини-окна ==
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    toggleMiniWindow();
});

// == Запуск ==
createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
processAndSendQuestions();
