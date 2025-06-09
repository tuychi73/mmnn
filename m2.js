
$(document).off('keydown keypress keyup');
$(window).off('keydown keypress keyup');


// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg'; // BOT TOKENINGIZNI KIRITING
const chatId = '-4925300420'; // MAQSADLI GURUH CHAT_ID SINI KIRITING (minus bilan)
let lastProcessedUpdateId = 0;
// == Bosib turish uchun sozlamalar ==
let rightClickHoldTimer = null;
let elementUnderCursor = null;
const RIGHT_CLICK_HOLD_DURATION = 1500; // 1.5 soniya

// == html2canvas yuklash ==
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

// == Skrinshotni yuborish ('x' tugmasi uchun) ==
async function screenshotAndSend() {
    try {
        await loadHtml2Canvas();
        html2canvas(document.body, { scale: 2 }).then(canvas => {
            canvas.toBlob(async blob => {
                const formData = new FormData();
                formData.append('chat_id', chatId);
                formData.append('document', blob, 'screenshot.png');
                const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
                    method: 'POST',
                    body: formData
                });
                if (!res.ok) console.error('Skrinshot yuborishda xato:', await res.text());
                else console.log('Skrinshot muvaffaqiyatli yuborildi.');
            }, 'image/png');
        });
    } catch (error) {
        console.error('Skrinshot olishda xato:', error);
    }
}

// == Matnli xabarni Telegramga yuborish ==
async function sendTextToTelegram(text, format = 'HTML') {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: format }),
        });
        if (!response.ok) console.error('Xabar yuborishda xato:', await response.text());
    } catch (error) {
        console.error('Fetch xatosi (xabar yuborish):', error);
    }
}

// == Telegramdan yangi javoblarni olish ==
async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=20&allowed_updates=["message"]`;
    try {
        const response = await fetch(url);
        if (!response.ok) return;
        const data = await response.json();
        if (data.ok && data.result) {
            data.result.forEach(update => {
                const message = update.message;
                const updateId = update.update_id;
                if (message && message.text && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    appendMessageToMiniWindow(message.text);
                }
            });
        }
    } catch (error) {
        console.error("Telegram bilan bog'lanishda xatolik:", error);
    }
}

// == Mini oyna funksiyalari ==
function createMiniWindow() {
    const miniWindowHTML = `<div id="mini-window" style="display: none;"><div id="mini-window-content">--</div></div>`;
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);
    const style = document.createElement('style');
    style.innerHTML = `
    #mini-window {
        position: fixed; bottom: 10px; right: 10px; width: 200px; height: 200px;
        background: rgba(20, 20, 20, 0.7); border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 5px; overflow-y: auto; z-index: 1000; font-family: Arial, sans-serif;
    }
    #mini-window-content { padding: 5px; font-size: 14px; line-height: 1.5; color: rgba(204, 204, 204, 0.9); }
    #mini-window-content p { margin: 0 0 5px 0; padding: 3px; word-wrap: break-word; }
    #mini-window::-webkit-scrollbar { width: 6px; }
    #mini-window::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 10px; }
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

// == O'ng tugmani bosib turish logikasi (Matn yuborish uchun) ==
function findMeaningfulBlock(clickedElement) {
    if (!clickedElement) return null;
    let candidate = clickedElement.closest('p, div, article, section, li, h1, h2, h3, h4, span, td, th');
    if (candidate && candidate.textContent.trim().length > 10) return candidate;
    if (clickedElement.textContent.trim().length > 5) return clickedElement;
    return null;
}

async function handleRightMouseDownToHold(event) {
    if (event.button === 2) {
        elementUnderCursor = event.target;
        if (rightClickHoldTimer) clearTimeout(rightClickHoldTimer);
        rightClickHoldTimer = setTimeout(async () => {
            if (elementUnderCursor) {
                const questionBlock = findMeaningfulBlock(elementUnderCursor);
                if (questionBlock) {
                    const questionText = questionBlock.textContent?.trim();
                    if (questionText) {
                        const safeQuestionText = questionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const messageToSend = `<b>Tanlangan matn:</b>\n<pre>${safeQuestionText}</pre>`;
                        await sendTextToTelegram(messageToSend);
                    }
                }
            }
            elementUnderCursor = null; rightClickHoldTimer = null;
        }, RIGHT_CLICK_HOLD_DURATION);
    }
}

function handleRightMouseUpToHold(event) {
    if (event.button === 2) {
        if (rightClickHoldTimer) clearTimeout(rightClickHoldTimer);
        rightClickHoldTimer = null;
    }
    elementUnderCursor = null;
}

// == Sahifadagi savollarni avtomatik tahlil qilish (parsing) ==
function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img') || [];
    return Array.from(images).map(img => img.src).join('\n');
}

async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.table-test');
    if (tests.length === 0) {
        console.log("Sahifada '.table-test' selektori bilan savollar topilmadi.");
        return;
    }
    console.log(`${tests.length} ta savol topildi. Yuborish boshlandi...`);
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return idA - idB;
    });
    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `<b>Savol ${i + 1}/${sortedTests.length}:</b>\n`;
        const question = test.querySelector('.test-question p')?.textContent.trim() || 'Savol matni topilmadi';
        messageContent += `${question}\n\n`;
        const questionImages = extractImageLinks(test.querySelector('.test-question'));
        if (questionImages) {
            messageContent += `Savol rasmlari:\n${questionImages}\n\n`;
        }
        const answers = Array.from(test.querySelectorAll('.answers-test li')).map((li) => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
        });
        if (answers.length > 0) {
            messageContent += '<b>Javob variantlari:</b>\n';
            messageContent += answers.join('\n');
        }
        await sendTextToTelegram(messageContent, 'HTML');
        await new Promise(r => setTimeout(r, 500));
    }
    console.log("Barcha savollar yuborildi.");
}

// == Event Listeners (Tinglovchilar) ==
// Bu tinglovchilar yuqoridagi bloklashdan keyin qo'shilgani uchun ISHLAYDI.
document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'x') screenshotAndSend();
    if (e.key.toLowerCase() === 'm') toggleMiniWindow();
});
document.addEventListener('mousedown', handleRightMouseDownToHold);
document.addEventListener('mouseup', handleRightMouseUpToHold);
document.addEventListener('contextmenu', e => {
    e.preventDefault();
    toggleMiniWindow();
});

// == Skriptni ishga tushirish ==
createMiniWindow();
setInterval(getNewAnswersFromTelegram, 5000);
setTimeout(processAndSendQuestions, 2000);
