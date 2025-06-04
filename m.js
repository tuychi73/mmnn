// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg'; // O'zingizning bot tokeningizni kiriting
const chatId = '-4875533020'; // Maqsadli guruh CHAT_ID sini kiriting (minus bilan boshlanadi)
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
                parse_mode: 'HTML' // Yoki Markdown, agar kerak bo'lsa
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
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=20`; // timeout qo'shildi
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
                // Guruh xabarlari uchun message, kanal postlari uchun channel_post bo'lishi mumkin
                const message = update.message || update.channel_post;
                const updateId = update.update_id;

                if (message && message.text && message.chat.id.toString() === chatId && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    console.log('Yangi javob olindi:', message.text);
                    updateMiniWindow(message.text);
                } else if (updateId > lastProcessedUpdateId) {
                    // Boshqa turdagi update bo'lsa ham ID ni yangilaymiz
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
    messageElement.textContent = message; // Xavfsizlik uchun textContent ishlatiladi
    miniWindowContent.appendChild(messageElement);
    miniWindowContent.scrollTop = miniWindowContent.scrollHeight; // Avtomatik pastga o'tkazish
}

// Polling intervalini 2 soniyaga o'zgartiramiz
setInterval(getNewAnswersFromTelegram, 2000); // 5000ms dan 2000ms ga o'zgartirildi

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (!miniWindow) return;
    if (miniWindow.style.display === 'none' || miniWindow.style.display === '') {
        miniWindow.style.display = 'block';
        getNewAnswersFromTelegram(); // Ochilganda bir marta javoblarni tekshirish
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
        <div id="mini-window-header">Javoblar</div>
        <div id="mini-window-content">
            </div>
    </div>
`;

const style = document.createElement('style');
style.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 250px; /* Kengroq */
    height: 300px; /* Balandroq */
    background: rgba(30, 30, 30, 0.85); /* Fon rangi o'zgartirildi */
    border: 1px solid #555;
    border-radius: 8px;
    overflow: hidden; /* Ichki scroll uchun */
    z-index: 2147483647; /* Eng yuqori z-index */
    font-family: Arial, sans-serif;
    box-shadow: 0 0 15px rgba(0,0,0,0.5);
    display: flex; /* Flexbox layout */
    flex-direction: column; /* Vertikal joylashuv */
}

#mini-window-header {
    padding: 8px;
    background-color: rgba(50, 50, 50, 0.9);
    color: #ddd;
    font-size: 16px;
    text-align: center;
    border-bottom: 1px solid #555;
    cursor: move; /* Sarlavhani surish uchun (JavaScript kerak bo'ladi) */
}

#mini-window-content {
    padding: 10px;
    font-size: 14px;
    line-height: 1.6;
    color: #ccc; /* Matn rangi o'zgartirildi */
    overflow-y: auto; /* Vertikal scroll */
    flex-grow: 1; /* Qolgan bo'sh joyni egallash */
}

#mini-window-content p {
    margin-bottom: 8px; /* Xabarlar orasidagi masofa */
    word-wrap: break-word; /* Uzun so'zlarni sindirish */
}

#mini-window::-webkit-scrollbar, #mini-window-content::-webkit-scrollbar {
    width: 8px;
}

#mini-window::-webkit-scrollbar-thumb, #mini-window-content::-webkit-scrollbar-thumb {
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
}

#mini-window::-webkit-scrollbar-thumb:hover, #mini-window-content::-webkit-scrollbar-thumb:hover {
    background-color: rgba(255, 255, 255, 0.5);
}

#mini-window::-webkit-scrollbar-track, #mini-window-content::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 5px;
}
`;

document.head.appendChild(style);
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

async function processAndSendQuestions() {
    // Saytingizdagi savollar joylashgan elementlarga mos selektorlarni kiriting
    const testElements = document.querySelectorAll('.test-table'); // Bu sizning avvalgi selektoringiz

    if (testElements.length === 0) {
        console.warn("Saytda '.test-table' elementlari topilmadi. Selektorni tekshiring.");
        updateMiniWindow("DIQQAT: Saytda savollar topilmadi! Selektorni tekshiring yoki sayt strukturasi o'zgargan bo'lishi mumkin.");
        return;
    }

    const sortedTests = Array.from(testElements).sort((a, b) => {
        const idA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
        const idB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `<b>Savol ${i + 1}:</b>\n`; // HTML parse_mode uchun <b>
        const questionElement = test.querySelector('.test-question'); // Bu sizning avvalgi selektoringiz
        const questionText = questionElement?.textContent.trim() || 'Savol matni topilmadi';
        messageContent += `${questionText}\n\n`;

        const questionImages = extractImageLinks(questionElement);
        if (questionImages) {
            messageContent += `Savoldagi rasmlar:\n${questionImages}\n\n`;
        }

        // Saytingizdagi javob variantlari joylashgan elementlarga mos selektorlarni kiriting
        const answerElements = test.querySelectorAll('.test-answers li'); // Bu sizning avvalgi selektoringiz
        
        let answersText = Array.from(answerElements).map((li, index) => {
            const variantElement = li.querySelector('.test-variant'); // Bu sizning avvalgi selektoringiz
            const variant = variantElement?.textContent.trim() || String.fromCharCode(65 + index); // A, B, C...
            
            let answerText = '';
            // Agar label ichida variant bo'lsa va uni olib tashlash kerak bo'lsa
            const labelElement = li.querySelector('label');
            if (labelElement) {
                // Klonlashtiramiz va variantni o'chiramiz, asl elementga tegmaymiz
                const labelClone = labelElement.cloneNode(true);
                const variantInLabel = labelClone.querySelector('.test-variant');
                if (variantInLabel) {
                    variantInLabel.remove();
                }
                answerText = labelClone.textContent.trim();
            } else {
                // Agar faqat matn bo'lsa (labelsiz)
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
        // Telegram API limitlariga urilmaslik uchun kichik pauza
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 soniya kutish
    }
    console.log("Barcha savollar yuborildi.");
    updateMiniWindow("Barcha savollar Telegramga yuborildi. Javoblarni kuting.");
}

// Skript yuklangandan so'ng biroz kutib, keyin savollarni yuborish
// Ba'zida sayt elementlari darhol yuklanmasligi mumkin
setTimeout(() => {
    processAndSendQuestions();
    // Mini oynani avtomatik ochish
    const miniWindow = document.getElementById('mini-window');
    if (miniWindow) miniWindow.style.display = 'block';
}, 2000); // 2 soniya kutish

console.log("m.js skripti ishladi. Mini oyna uchun 'm' tugmasini bosing yoki sichqonchaning o'ng tugmasini bosing.");
updateMiniWindow("Skript ishga tushdi. Savollar yig'ilmoqda...");
