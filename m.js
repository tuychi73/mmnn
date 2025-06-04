// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4875533020';
let lastProcessedUpdateId = 0;

// Savol va javoblarni formatlash
function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img');
    return Array.from(images).map(img => img.src).filter(src => src).join('\n');
}

// Telegramga savol yuborish
async function sendQuestionToTelegram(question) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: question,
                parse_mode: 'Markdown' // Formatlash uchun
            })
        });
        if (!response.ok) throw new Error(await response.text());
        console.log('Savol yuborildi:', question);
    } catch (error) {
        console.error('Savol yuborishda xato:', error);
    }
}

// Telegramdan yangi javoblarni olish
async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.ok) throw new Error('API javobi xato');
        
        data.result.forEach(message => {
            const text = message.message?.text;
            const updateId = message.update_id;
            if (text && updateId > lastProcessedUpdateId) {
                lastProcessedUpdateId = updateId;
                console.log('Yangi javob:', text);
                updateMiniWindow(text);
            }
        });
    } catch (error) {
        console.error('Javob olishda xato:', error);
    }
}

// Mini-ekranni yangilash
function updateMiniWindow(message) {
    const miniWindow = document.getElementById('mini-window-content');
    if (!miniWindow) return;
    
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messageElement.style.margin = '5px 0';
    miniWindow.appendChild(messageElement);
    miniWindow.scrollTop = miniWindow.scrollHeight;
}

// Mini-ekranni ochish/yopish
function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    miniWindow.style.display = miniWindow.style.display === 'none' ? 'block' : 'none';
}

// Mini-ekran HTML va CSS
const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-content"></div>
    </div>
`;

const style = document.createElement('style');
style.innerHTML = `
    #mini-window {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 250px;
        height: 300px;
        background: rgba(0, 0, 0, 0.8);
        border-radius: 8px;
        overflow-y: auto;
        z-index: 10000;
        font-family: Arial, sans-serif;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    }
    #mini-window::-webkit-scrollbar {
        width: 6px;
    }
    #mini-window::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.5);
        border-radius: 10px;
    }
    #mini-window::-webkit-scrollbar-track {
        background: transparent;
    }
    #mini-window-content {
        padding: 10px;
        font-size: 14px;
        color: #fff;
        line-height: 1.4;
    }
`;
document.head.appendChild(style);
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

// Klaviatura va kontekst menyuni boshqarish
document.addEventListener('keyup', (e) => {
    if (e.key.toLowerCase() === 'm') toggleMiniWindow();
});
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    toggleMiniWindow();
});

// Savollarni qayta ishlash va yuborish
async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.test-table');
    if (!tests.length) {
        console.error('Savollar topilmadi!');
        return;
    }

    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, '') || 0, 10);
        const idB = parseInt(b.id.replace(/\D/g, '') || 0, 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `*Savol ${i + 1}:*\n`;
        
        const question = test.querySelector('.test-question')?.textContent.trim() || 'Savol topilmadi';
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) messageContent += `*Savol rasmlari:*\n${questionImages}\n\n`;

        const answers = Array.from(test.querySelectorAll('.test-answers li')).map((li, index) => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || String.fromCharCode(65 + index);
            const answerText = li.querySelector('label')?.textContent.replace(variant, '').trim() || '';
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText}${answerImage ? ` (Rasm: ${answerImage})` : ''}`;
        });

        if (answers.length) {
            messageContent += `*Javob variantlari:*\n${answers.join('\n')}`;
        } else {
            messageContent += '*Javob variantlari topilmadi*';
        }

        await sendQuestionToTelegram(messageContent);
        await new Promise(resolve => setTimeout(resolve, 500)); // Telegram API cheklovlaridan saqlanish
    }
}

// Botni ishga tushirish
async function init() {
    await processAndSendQuestions();
    setInterval(getNewAnswersFromTelegram, 2000); // Har 2 sekundda javob tekshirish
}

// Kodni saytga kiritish
if (document.readyState === 'complete') {
    init();
} else {
    window.addEventListener('load', init);
}
