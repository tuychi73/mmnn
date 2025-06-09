

// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg'; // BOT TOKENINGIZNI KIRITING
const chatId = '-4925300420'; // MAQSADLI GURUH CHAT_ID SINI KIRITING (minus bilan)
let lastProcessedUpdateId = 0;


// == "Bosib turish" sozlamalari ==
let holdTimer = null;
let elementUnderCursor = null;
const HOLD_DURATION = 1200; // 1.2 soniya

// == Boshlang'ich skriptlarni yuklash ==
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

// == Mini-oyna (faqat javoblar uchun) ==
function createMiniWindow() {
    const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-content">--</div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

    const style = document.createElement('style');
    style.innerHTML = `
    #mini-window {
        position: fixed; bottom: 10px; right: 10px; width: 200px; height: 200px;
        background: rgba(20, 20, 20, 0.8); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px;
        overflow-y: auto; z-index: 2147483647; font-family: Arial, sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    }
    #mini-window::-webkit-scrollbar { width: 6px; }
    #mini-window::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 10px; }
    #mini-window::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.5); }
    #mini-window::-webkit-scrollbar-track { background: transparent; }
    #mini-window-content {
        padding: 8px; font-size: 13px; line-height: 1.5; color: rgba(220, 220, 220, 0.9);
        word-wrap: break-word;
    }`;
    document.head.appendChild(style);
}

function appendMessageToMiniWindow(message) {
    const content = document.getElementById('mini-window-content');
    if (!content) return;
    if (content.textContent.trim() === "--" && content.firstChild?.nodeType === Node.TEXT_NODE) {
        content.innerHTML = ''; // Boshlang'ich matnni tozalash
    }
    const msgEl = document.createElement('p');
    msgEl.textContent = message;
    msgEl.style.margin = '0 0 5px 0';
    content.appendChild(msgEl);
    content.scrollTop = content.scrollHeight;
}

function toggleMiniWindow() {
    const win = document.getElementById('mini-window');
    if (!win) return;
    win.style.display = win.style.display === 'none' ? 'block' : 'none';
}


// == Telegram bilan ishlash funksiyalari ==

async function sendMessageToTelegram(text) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Xato (yuborish): ${errorData.description}`);
        }
    } catch (error) {
        console.error(`Tarmoq xatosi: ${error.message}`);
    }
}

async function screenshotAndSend() {
    try {
        await loadHtml2Canvas();
        console.log("Skrinshot olinmoqda...");
        const canvas = await html2canvas(document.body, { scale: 1.5 });
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('chat_id', chatId);
            formData.append('document', blob, 'screenshot.png');
            formData.append('caption', `Sahifa manzili: ${window.location.href}`);

            console.log("Skrinshot yuborilmoqda...");
            const res = await fetch(`https://api.telegram.org/bot${telegramToken}/sendDocument`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                console.log('Skrinshot muvaffaqiyatli yuborildi.');
            } else {
                const errorText = await res.text();
                console.error(`Xato (skrinshot): ${errorText}`);
            }
        }, 'image/png');
    } catch (error) {
        console.error(`Skrinshotda xato: ${error.message}`);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=30`;
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
                    // FAQAT SHU YERDA MINI-OYNAGA XABAR CHIQARILADI
                    appendMessageToMiniWindow(message.text);
                } else if (updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                }
            });
        }
    } catch (error) {
        // Tarmoq xatolarini konsolga chiqarmaymiz, chunki bu doimiy bo'lishi mumkin
    }
}

// == Elementni topish va yuborish ==
function findMeaningfulBlock(element) {
    if (!element) return null;
    let candidate = element.closest('p, div, li, h1, h2, h3, span, td, .test-question, .answers-test');
    if (candidate && candidate.textContent.trim().length > 10) {
        return candidate;
    }
    return element.textContent.trim().length > 5 ? element : null;
}

// == Hodisalarni (events) qayta ishlash ==
document.addEventListener('keyup', e => {
    if (e.key.toLowerCase() === 'x') {
        screenshotAndSend();
    }
    if (e.key.toLowerCase() === 'm') {
        toggleMiniWindow();
    }
});

document.addEventListener('mousedown', (e) => {
    if (e.button === 2) { // O'ng tugma
        elementUnderCursor = e.target;
        holdTimer = setTimeout(async () => {
            if (elementUnderCursor) {
                const block = findMeaningfulBlock(elementUnderCursor);
                if (block) {
                    const text = block.textContent?.trim();
                    const images = Array.from(block.querySelectorAll('img')).map(img => img.src).join('\n');
                    if (text || images) {
                        let messageToSend = `<b>Tanlangan blok (bosib turish):</b>\n<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
                        if (images) {
                            messageToSend += `\n\n<b>Blokdagi rasmlar:</b>\n${images}`;
                        }
                        await sendMessageToTelegram(messageToSend);
                        console.log("Tanlangan blok yuborildi.");
                    }
                }
            }
            holdTimer = null;
        }, HOLD_DURATION);
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.button === 2 && holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
    }
});

document.addEventListener('contextmenu', (e) => {
    if (!holdTimer) {
        e.preventDefault();
        toggleMiniWindow();
    }
});

// == Asosiy savol-javob parseri ==
function extractImageLinks(element) {
    if (!element) return '';
    const images = element.querySelectorAll('img') || [];
    return Array.from(images).map(img => img.src).join('\n');
}

async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.table-test');
    if (tests.length === 0) {
        console.warn("Savollar topilmadi (.table-test selektori bo'yicha).");
        return;
    }
    console.log(`${tests.length} ta savol topildi. Yuborilmoqda...`);

    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
        const idB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        const questionElement = test.querySelector('.test-question');
        const questionText = questionElement?.querySelector('p')?.textContent.trim() || 'Savol matni topilmadi';
        const questionImages = extractImageLinks(questionElement);

        let messageContent = `<b>Savol ${i + 1}/${sortedTests.length}:</b>\n${questionText}\n\n`;
        if (questionImages) {
            messageContent += `<i>Savol rasmlari:</i>\n${questionImages}\n\n`;
        }

        const answers = Array.from(test.querySelectorAll('.answers-test li')).map(li => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label p')?.textContent.trim() || '';
            const answerImage = extractImageLinks(li);
            return `${variant}. ${answerText} ${answerImage ? `(Rasm: ${answerImage})` : ''}`;
        });

        if (answers.length > 0) {
            messageContent += '<b>Javob variantlari:</b>\n' + answers.join('\n');
        }

        await sendMessageToTelegram(messageContent);
        await new Promise(r => setTimeout(r, 500));
    }
    console.log("Barcha savollar muvaffaqiyatli yuborildi.");
}

// == Skriptni ishga tushirish ==
function main() {
    createMiniWindow();
    console.log("Skript ishga tushdi.");
    setInterval(getNewAnswersFromTelegram, 3000);
    
    setTimeout(() => {
        processAndSendQuestions();
    }, 1500);
}

main();
