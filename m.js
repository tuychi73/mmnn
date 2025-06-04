// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4875533020';
let lastProcessedUpdateId = 0;

const userSessionId = 'user_' + Date.now().toString().slice(-6) + '_' + Math.random().toString(36).substring(2, 8);
console.log('Joriy sessiya IDsi:', userSessionId);

function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img');
    return Array.from(images).map(img => img.src).join('\n');
}

async function sendQuestionToTelegram(questionText, sessionId) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const messageWithId = `[${sessionId}] ${questionText}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: messageWithId }),
        });
        if (!response.ok) console.error('Savolni yuborishda xatolik:', await response.text());
        else console.log('Savol muvaffaqiyatli yuborildi:', messageWithId);
    } catch (error) {
        console.error('Savolni yuborishda tarmoq xatoligi:', error);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=60`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.ok) {
            data.result.forEach(message => {
                const text = message.message?.text;
                const updateId = message.update_id;
                if (text && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    if (text.startsWith(`[${userSessionId}]`)) {
                        const actualAnswer = text.substring(text.indexOf(']') + 1).trim();
                        console.log('Maqsadli javob qabul qilindi:', actualAnswer);
                        updateMiniWindow(`✅ ${actualAnswer}`);
                    } else if (!text.startsWith('[user_')) {
                        console.log('Umumiy xabar qabul qilindi:', text);
                        updateMiniWindow(`📢 ${text}`);
                    }
                }
            });
        } else {
            console.error('Telegramdan yangilanishlarni olishda xatolik:', data.description);
        }
    } catch (error) {
        console.error('Telegramdan yangilanishlarni olishda tarmoq xatoligi:', error);
    }
}

function updateMiniWindow(message) {
    const miniWindowContent = document.getElementById('mini-window-content');
    if (!miniWindowContent) return;
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    miniWindowContent.appendChild(messageElement);
    miniWindowContent.scrollTop = miniWindowContent.scrollHeight;
    // QATOR OLIB TASHLANDI: Yangi xabar kelganda oynani avtomatik ochish olib tashlandi.
    // const miniWindow = document.getElementById('mini-window');
    // if (miniWindow && miniWindow.style.display === 'none') {
    // miniWindow.style.display = 'block'; 
    // }
}

setInterval(getNewAnswersFromTelegram, 3000);

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (!miniWindow) return;
    miniWindow.style.display = (miniWindow.style.display === 'none' || miniWindow.style.display === '') ? 'block' : 'none';
}

document.addEventListener("keyup", (m) => {
    if (m.key.toLowerCase() === "m") {
        toggleMiniWindow();
    }
});

document.addEventListener("contextmenu", (m) => {
    m.preventDefault();
    toggleMiniWindow();
});

// == Mini-Oyna HTML va Stillari (O'ZGARTIRILGAN) ==
const miniWindowHTML = `
    <div id="mini-window" style="display: none;"> <div id="mini-window-header">Javoblar (M)</div>
        <div id="mini-window-content">
            </div>
    </div>
`;

const style = document.createElement('style');
style.innerHTML = `
#mini-window {
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 280px;
    height: 350px;
    /* --- Ko'rinmasroq qilish uchun o'zgartirishlar --- */
    background: rgba(0, 0, 0, 0.1); /* Juda xira, deyarli shaffof orqa fon */
    border: none; /* Chegara yo'q */
    box-shadow: none; /* Soya yo'q */
    /* --- O'zgartirishlar tugadi --- */
    border-radius: 4px; /* Kichikroq yumaloqlik */
    z-index: 2147483647;
    font-family: Arial, sans-serif; /* Oddiy shrift */
    /* display: none; /* Bu yuqoridagi miniWindowHTML da inline style orqali beriladi */
}
#mini-window-header { 
    padding: 4px 6px; 
    background-color: rgba(0, 0, 0, 0.15); /* Oyna foniga mos juda xira sarlavha foni */
    color: rgba(180, 180, 180, 0.6);  /* Sarlavha matni rangi yanada xiraroq */
    font-size: 11px; /* Sarlavha shrifti kichikroq */
    cursor: move; 
    border-bottom: 1px solid rgba(255,255,255,0.03); /* Juda xira, deyarli ko'rinmas ajratuvchi */
    user-select: none;
    text-align: center;
}
#mini-window-content { 
    height: calc(100% - 22px); /* Sarlavha balandligiga moslangan (padding bilan birga) */
    overflow-y: auto;
    padding: 7px; 
    font-size: 12px; 
    line-height: 1.4; 
    color: #b0b0b0; /* Matn rangi (orqa fon juda xira bo'lgani uchun biroz yorqinroq) */
    word-wrap: break-word;
}
#mini-window-content::-webkit-scrollbar { width: 4px; } /* Scrollbar ingichkaroq */
#mini-window-content::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.15); border-radius: 10px; }
#mini-window-content::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.3); }
#mini-window-content::-webkit-scrollbar-track { background: transparent; } /* Track foni shaffof */
#mini-window-content p { 
    margin-bottom: 5px; 
    padding-bottom: 5px; 
    border-bottom: 1px solid rgba(255,255,255,0.05); /* Xabarlar orasidagi ajratuvchi yanada xiraroq */
}
#mini-window-content p:last-child { border-bottom: none; margin-bottom: 0; }
`;

document.head.appendChild(style);
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const header = document.getElementById("mini-window-header") || element;
    if (!header) return; // Agar sarlavha topilmasa, xatolikni oldini olish

    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        // e.preventDefault(); // Buni olib tashlasak, sarlavhadagi matnni tanlash mumkin bo'ladi, lekin drag ishlashiga xalaqit berishi mumkin.
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault(); 
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}
const miniWindowElement = document.getElementById('mini-window');
if (miniWindowElement) {
    makeDraggable(miniWindowElement);
}

async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.test-table');
    if (tests.length === 0) {
        console.log("Sahifada '.test-table' elementlari topilmadi.");
        // updateMiniWindow("DIQQAT: Sahifada savollar (.test-table) topilmadi!"); // Bu qatorni olib tashlaymiz, chunki oyna boshida yopiq
        return;
    }
    // updateMiniWindow(`${tests.length} ta savol topildi. Yuborilmoqda...`); // Bu ham boshida yopiq oyna uchun kerak emas

    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Savol ${i + 1}:\n`;
        const questionElement = test.querySelector('.test-question');
        const question = questionElement?.textContent.trim() || 'Savol matni topilmadi';
        messageContent += `${question}\n\n`;

        const questionImages = extractImageLinks(questionElement);
        if (questionImages) {
            messageContent += `Savoldagi rasmlar:\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.test-answers li')).map((li) => {
            const variantElement = li.querySelector('.test-variant');
            const variant = variantElement?.textContent.trim() || '';
            const labelElement = li.querySelector('label');
            let answerText = '';
            if (labelElement) {
                answerText = labelElement.textContent.trim();
                if (answerText.startsWith(variant)) {
                    answerText = answerText.substring(variant.length).trim();
                }
            } else {
                answerText = 'Javob matni topilmadi';
            }
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
        });

        messageContent += 'Javob variantlari:\n';
        messageContent += answers.join('\n');

        await sendQuestionToTelegram(messageContent, userSessionId);
        await new Promise(resolve => setTimeout(resolve, 1200));
    }
    // updateMiniWindow("Barcha savollar yuborildi."); // Bu ham boshida yopiq oyna uchun kerak emas
    console.log(`${sortedTests.length} ta savol Telegramga yuborildi.`);
}

processAndSendQuestions();
