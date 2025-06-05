// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg'; // BOT TOKENINGIZNI KIRITING
const chatId = '-4925300420'; // MAQSADLI GURUH CHAT_ID SINI KIRITING (minus bilan)
let lastProcessedUpdateId = 0;

// == Sichqonchaning o'ng tugmasini BOSIB TURISH uchun sozlamalar ==
let rightClickHoldTimer = null;
let elementUnderCursor = null;
const RIGHT_CLICK_HOLD_DURATION = 5000; // 5 soniya (bosib turish uchun)

// == Sichqonchaning o'ng tugmasini KETMA-KET BOSISH uchun sozlamalar ==
let rightClickTapCount = 0;
let lastRightClickTapTime = 0;
const MULTI_CLICK_TAP_THRESHOLD = 700; // Ketma-ket bosishlar orasidagi maksimal vaqt (ms)
const REQUIRED_TAPS_FOR_BODY_SEND = 5; // Sahifa matnini yuborish uchun kerakli bosishlar soni

// == Asosiy funksiyalar ==

function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img');
    return Array.from(images).map(img => img.src).filter(src => src).join('\n');
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
                parse_mode: 'HTML' // HTML formatlash uchun
            }),
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('Telegramga savol yuborishda xato:', responseData.error_code, responseData.description);
            updateMiniWindow(`Xato (yuborish): ${responseData.description || 'Noma\'lum xato'}`);
        } else {
            console.log('Savol muvaffaqiyatli yuborildi (qisqartirilgan):', questionText.substring(0, 100) + "...");
        }
    } catch (error) {
        console.error('Fetch xatosi (savol yuborish):', error);
        updateMiniWindow(`Fetch xatosi (yuborish): ${error.message}`);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=20&allowed_updates=["message","channel_post"]`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Telegramdan javob olishda HTTP xato:', response.status, await response.text());
            return;
        }
        const data = await response.json();
        if (data.ok && data.result) {
            const updates = data.result;
            updates.forEach(update => {
                const message = update.message || update.channel_post;
                const updateId = update.update_id;
                if (message && message.text && message.chat && message.chat.id.toString() === chatId && updateId > lastProcessedUpdateId) {
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

setInterval(getNewAnswersFromTelegram, 2000); // Har 2 soniyada javoblarni tekshirish

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (!miniWindow) return;
    if (miniWindow.style.display === 'none' || miniWindow.style.display === '') {
        miniWindow.style.display = 'block';
        getNewAnswersFromTelegram(); // Oyna ochilganda javoblarni tekshirish
    } else {
        miniWindow.style.display = 'none';
    }
}

// == Sichqonchaning o'ng tugmasini BOSIB TURISH funksiyalari ==
function findMeaningfulBlock(clickedElement) {
    if (!clickedElement) return null;
    let candidate = clickedElement.closest('p, div, article, section, li, h1, h2, h3, h4, h5, h6, span, td, th');
    if (candidate && candidate.textContent.trim().length > 10) { // Minimal matn uzunligi
        // Hevristika: Agar topilgan element juda katta bo'lsa va bosilgan elementning o'zi yetarlicha matnga ega bo'lsa
        if (candidate.offsetHeight > window.innerHeight * 0.7 || candidate.offsetWidth > window.innerWidth * 0.7) {
             if (clickedElement.textContent.trim().length > 10) return clickedElement;
        }
        return candidate;
    }
    // Agar yuqoridagilar topilmasa, bosilgan elementning o'zini qaytarish
    if (clickedElement.textContent.trim().length > 5) { // Eng kichik matn uzunligi
        return clickedElement;
    }
    return null;
}

async function handleRightMouseDownToHold(event) {
    if (event.button === 2) { // Faqat o'ng sichqoncha tugmasi
        elementUnderCursor = event.target;
        if (rightClickHoldTimer) {
            clearTimeout(rightClickHoldTimer);
        }
        rightClickHoldTimer = setTimeout(async () => {
            if (elementUnderCursor) {
                const questionBlock = findMeaningfulBlock(elementUnderCursor);
                if (questionBlock) {
                    const questionText = questionBlock.textContent?.trim();
                    if (questionText) {
                        console.log("O'ng tugma 5 soniya bosib turildi. Topilgan matn:", questionText);
                        // Matnni HTML uchun xavfsizlash (<, > belgilari)
                        const safeQuestionText = questionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const messageToSend = `<b>Myovus yordamida tanlangan savol (bosib turish):</b>\n<pre>${safeQuestionText}</pre>`;
                        await sendQuestionToTelegram(messageToSend);
                        updateMiniWindow(`Tanlangan savol (bosib turish) yuborildi: ${questionText.substring(0, 40)}...`);
                    } else {
                        updateMiniWindow("Tanlangan elementdan matn olinmadi (bosib turish).");
                    }
                } else {
                    updateMiniWindow("Mos savol bloki topilmadi (bosib turish).");
                }
            }
            elementUnderCursor = null;
            rightClickHoldTimer = null;
        }, RIGHT_CLICK_HOLD_DURATION);
    }
}

function handleRightMouseUpToHold(event) {
    if (event.button === 2) {
        if (rightClickHoldTimer) {
            clearTimeout(rightClickHoldTimer);
            rightClickHoldTimer = null;
            console.log("O'ng tugma (bosib turish) 5 soniyadan oldin qo'yib yuborildi.");
        }
        elementUnderCursor = null;
    }
}

// == Sahifa matnini yuborish funksiyasi (5 marta bosish uchun) ==
async function sendBodyContent() {
    console.log("sendBodyContent funksiyasi chaqirildi.");
    const bodyText = document.body.innerText;
    if (bodyText && bodyText.trim().length > 0) {
        const safeBodyText = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const message = `<b>Sahifaning to'liq matni (${REQUIRED_TAPS_FOR_BODY_SEND} marta bosildi):</b>\n<pre>${safeBodyText.substring(0, 3800)}</pre>`; // Telegram chegarasiga e'tibor bering
        await sendQuestionToTelegram(message);
        updateMiniWindow(`${REQUIRED_TAPS_FOR_BODY_SEND} marta bosish orqali sahifa matni yuborildi.`);
    } else {
        updateMiniWindow("Sahifada yuborish uchun matn topilmadi.");
        console.warn("Sahifada yuborish uchun matn topilmadi.");
    }
}

// == Hodisalarni (`Event Listeners`) sozlash ==
document.addEventListener("keyup", (event) => {
    if (event.key.toLowerCase() === "m") {
        toggleMiniWindow();
    }
});

document.addEventListener("contextmenu", (event) => {
    event.preventDefault(); // Har doim standart kontekst menyusini bloklaymiz
    const currentTime = new Date().getTime();

    if (currentTime - lastRightClickTapTime < MULTI_CLICK_TAP_THRESHOLD) {
        rightClickTapCount++;
    } else {
        rightClickTapCount = 1; // Sanagichni 1 ga qaytaramiz
    }
    lastRightClickTapTime = currentTime;
    console.log(`O'ng tugma bosishlar soni (ketma-ket): ${rightClickTapCount}`);

    if (rightClickTapCount >= REQUIRED_TAPS_FOR_BODY_SEND) {
        console.log(`${REQUIRED_TAPS_FOR_BODY_SEND} ta o'ng tugma ketma-ket bosildi! Sahifa matni yuboriladi.`);
        sendBodyContent();
        rightClickTapCount = 0; // Sanagichni tiklaymiz
        lastRightClickTapTime = 0;
    } else if (rightClickTapCount === 1) {
        // Agar bu yangi ketma-ketlikdagi birinchi bosish bo'lsa, mini oynani ochamiz/yopamiz.
        console.log("Bir marta o'ng tugma bosildi, mini-oyna ochiladi/yopiladi.");
        toggleMiniWindow();
    }
});

document.addEventListener('mousedown', handleRightMouseDownToHold); // Bosib turish uchun
document.addEventListener('mouseup', handleRightMouseUpToHold);     // Bosib turish uchun

console.log("Maxsus o'ng tugma funksiyalari (bosib turish va ketma-ket bosish) qo'shildi.");

// == Mini-oyna HTML va CSS ==
const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-header">Javoblar</div>
        <div id="mini-window-content">-- Bo'sh --</div>
    </div>
`;

const styleElement = document.createElement('style'); // O'zgaruvchi nomi 'style' dan 'styleElement' ga o'zgartirildi
styleElement.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 15px;
    right: 15px;
    width: 280px; /* Kengroq */
    height: 350px; /* Balandroq */
    background: rgba(25, 25, 30, 0.9); /* To'qroq fon */
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
    z-index: 2147483647;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    box-shadow: 0 5px 20px rgba(0,0,0,0.4);
    display: flex;
    flex-direction: column;
    color: #ccc; /* Asosiy matn rangi */
}
#mini-window-header {
    padding: 8px 12px;
    background-color: #282c34; /* Sarlavha foni */
    color: #abb2bf; /* Sarlavha matni */
    font-size: 14px;
    font-weight: 600;
    text-align: center;
    border-bottom: 1px solid #1c1e22;
    cursor: default;
}
#mini-window-content {
    padding: 10px;
    font-size: 13px; /* Kichikroq shrift */
    line-height: 1.5;
    overflow-y: auto;
    flex-grow: 1; /* Bo'sh joyni egallash */
}
#mini-window-content p {
    margin-top: 0;
    margin-bottom: 7px;
    word-wrap: break-word;
    border-bottom: 1px dashed #444; /* Ajratuvchi chiziq */
    padding-bottom: 7px;
}
#mini-window-content p:last-child {
    border-bottom: none; /* Oxirgi xabardan keyin chiziqni olib tashlash */
    margin-bottom: 0;
    padding-bottom: 0;
}
#mini-window-content::-webkit-scrollbar {
    width: 6px;
}
#mini-window-content::-webkit-scrollbar-thumb {
    background-color: #4f5660;
    border-radius: 10px;
}
#mini-window-content::-webkit-scrollbar-thumb:hover {
    background-color: #68707c;
}
#mini-window-content::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.1);
}
`;

document.head.appendChild(styleElement);
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

// == Savollarni avtomatik yig'ish va yuborish ==
async function processAndSendQuestions() {
    // **** MUHIM: ****
    // Quyidagi selektorlarni imtihon saytingizning HTML tuzilishiga MOS RAVISHDA O'ZGARTIRING!
    const testElements = document.querySelectorAll('.test-table'); // Masalan: '.question-block', 'div.test'

    if (testElements.length === 0) {
        console.warn("Saytda savollar uchun elementlar topilmadi. '.test-table' selektorini tekshiring.");
        updateMiniWindow("DIQQAT: Saytda savollar topilmadi! Imtihon sayti uchun selektorlarni tekshiring.");
        return;
    }

    const sortedTests = Array.from(testElements).sort((a, b) => {
        const idA = parseInt(a.id?.replace(/\D/g, '') || '0', 10);
        const idB = parseInt(b.id?.replace(/\D/g, '') || '0', 10);
        return idA - idB;
    });

    updateMiniWindow(`${sortedTests.length} ta savol topildi. Yuborish boshlanmoqda...`);

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `<b>Savol ${i + 1}/${sortedTests.length}:</b>\n`;
        
        const questionElement = test.querySelector('.test-question'); // Masalan: '.question-text', 'h3.q-title'
        const questionText = questionElement?.textContent?.trim() || 'Savol matni topilmadi';
        messageContent += `${questionText}\n\n`;

        const questionImages = extractImageLinks(questionElement);
        if (questionImages) {
            messageContent += `Savoldagi rasmlar:\n${questionImages}\n\n`;
        }

        const answerElements = test.querySelectorAll('.test-answers li'); // Masalan: '.answer-option', 'div.variant'
        let answersText = Array.from(answerElements).map((li, index) => {
            const variantElement = li.querySelector('.test-variant'); // Masalan: '.variant-letter'
            const variant = variantElement?.textContent?.trim() || String.fromCharCode(65 + index);
            let answerText = '';
            const labelElement = li.querySelector('label');
            if (labelElement) {
                const labelClone = labelElement.cloneNode(true);
                const variantInLabel = labelClone.querySelector('.test-variant');
                if (variantInLabel) variantInLabel.remove();
                answerText = labelClone.textContent?.trim();
            } else {
                answerText = li.textContent?.replace(variant, '').trim();
            }
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
        }).join('\n');

        if (answerElements.length > 0) {
            messageContent += 'Javob variantlari:\n' + answersText;
        } else {
            messageContent += 'Javob variantlari topilmadi.';
        }
        
        await sendQuestionToTelegram(messageContent);
        // API ga ortiqcha yuklama tushmasligi uchun kichik, tasodifiy pauza
        await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 300)); 
    }
    console.log("Barcha savollar yuborildi.");
    updateMiniWindow("Barcha savollar Telegramga yuborildi. Javoblarni kuting.");
}

// == Skriptni ishga tushirish ==
function initializeMainScript() {
    console.log("Asosiy skript ishga tushirilmoqda...");
    updateMiniWindow("Skript ishga tushdi. Avtomatik savol yig'ish boshlanadi...");
    
    // Avtomatik savollarni yuborishni biroz kechiktirib ishga tushirish (sayt to'liq "tinishi" uchun)
    setTimeout(() => {
        processAndSendQuestions();
    }, 1000); // 1 soniya kutish

    // Mini-oynani boshida ko'rsatish (ixtiyoriy)
    // const miniWindow = document.getElementById('mini-window');
    // if (miniWindow && (miniWindow.style.display === 'none' || miniWindow.style.display === '')) {
    //    miniWindow.style.display = 'block'; 
    // }
}

// DOM to'liq yuklangach yoki interaktiv holatga kelgach skriptni ishga tushirish
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeMainScript();
} else {
    document.addEventListener('DOMContentLoaded', initializeMainScript);
}

console.log("m.js skripti to'liq yuklandi va sozlandi. 'm' tugmasi va o'ng tugma funksiyalari aktiv.");
