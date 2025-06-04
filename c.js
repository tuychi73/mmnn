// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4754425604';
let lastProcessedUpdateId = 0;

function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img');
    return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(questionText) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: questionText,
                parse_mode: 'HTML'
            }),
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('Telegramga savol yuborishda xato:', responseData);
        } else {
            console.log('Savol muvaffaqiyatli yuborildi:', questionText.substring(0, 100) + "...");
        }
    } catch (error) {
        console.error('Fetch xatosi (savol yuborish):', error);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=20`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Telegramdan javob olishda HTTP xato:', response.status, await response.text());
            return;
        }
        const data = await response.json();

        if (data.ok && data.result) {
            const messages = data.result;

            messages.forEach(update => {
                const message = update.message || update.channel_post;
                const updateId = update.update_id;

                if (message && message.text && message.chat.id.toString() === chatId && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    console.log('Yangi javob olindi:', message.text);
                    updateMiniWindow(message.text);
                } else if (updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                }
            });
        } else if (!data.ok) {
            console.error('Telegram API xatosi (javob olish):', data.description);
        }
    } catch (error) {
        console.error('Fetch xatosi (javob olish):', error);
    }
}

function updateMiniWindow(message) {
    const miniWindowContent = document.getElementById('mini-window-content');
    if (!miniWindowContent) {
        console.error("Mini-window-content elementi topilmadi!");
        return;
    }
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    miniWindowContent.appendChild(messageElement);
    miniWindowContent.scrollTop = miniWindowContent.scrollHeight;
}

setInterval(getNewAnswersFromTelegram, 2000);

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (!miniWindow) return;
    if (miniWindow.style.display === 'none' || miniWindow.style.display === '') {
        miniWindow.style.display = 'block';
        getNewAnswersFromTelegram();
    } else {
        miniWindow.style.display = 'none';
    }
}

document.addEventListener("keyup", (event) => {
    if (event.key === "m" || event.key === "M") {
        toggleMiniWindow();
    }
});

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    toggleMiniWindow();
});

const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-content">--</div>
    </div>
`;

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
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

async function processAndSendQuestions() {
    const testElements = document.querySelectorAll('.test-table');

    if (testElements.length === 0) {
        console.warn("Saytda '.test-table' elementlari topilmadi. Selektorni tekshiring.");
        return;
    }

    const sortedTests = Array.from(testElements).sort((a, b) => {
        const idA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
        const idB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `<b>Savol ${i + 1}:</b>\n`;
        const questionElement = test.querySelector('.test-question');
        const questionText = questionElement?.textContent.trim() || 'Savol matni topilmadi';
        messageContent += `${questionText}\n\n`;

        const questionImages = extractImageLinks(questionElement);
        if (questionImages) {
            messageContent += `Savoldagi rasmlar:\n${questionImages}\n\n`;
        }

        const answerElements = test.querySelectorAll('.test-answers li');
        
        let answersText = Array.from(answerElements).map((li, index) => {
            const variantElement = li.querySelector('.test-variant');
            const variant = variantElement?.textContent.trim() || String.fromCharCode(65 + index);
            
            let answerText = '';
            const labelElement = li.querySelector('label');
            if (labelElement) {
                const labelClone = labelElement.cloneNode(true);
                const variantInLabel = labelClone.querySelector('.test-variant');
                if (variantInLabel) {
                    variantInLabel.remove();
                }
                answerText = labelClone.textContent.trim();
            } else {
                answerText = li.textContent.replace(variant, '').trim();
            }
            
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
        }).join('\n');

        if (answerElements.length > 0) {
            messageContent += 'Javob variantlari:\n';
            messageContent += answersText;
        } else {
            messageContent += 'Javob variantlari topilmadi.';
        }
        
        await sendQuestionToTelegram(messageContent);
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log("Barcha savollar yuborildi.");
}

setTimeout(() => {
    processAndSendQuestions();
    const miniWindow = document.getElementById('mini-window');
    if (miniWindow) miniWindow.style.display = 'block';
}, 2000);

console.log("m.js skripti ishladi. Mini oyna uchun 'm' tugmasini bosing yoki sichqonchaning o'ng tugmasini bosing.");
