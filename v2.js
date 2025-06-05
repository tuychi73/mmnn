// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4925300420';
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
            headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ chat_id: chatId, text: questionText, parse_mode: 'HTML' }),
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error('Telegramga yuborishda xato:', responseData.error_code, responseData.description);
            updateMiniWindow(`Xato (yuborish): ${responseData.description || 'Noma\'lum xato'}`);
        } else {
            console.log('Xabar muvaffaqiyatli yuborildi (qisqartirilgan):', questionText.substring(0, 100) + "...");
        }
    } catch (error) {
        console.error('Fetch xatosi (yuborish):', error);
        updateMiniWindow(`Fetch xatosi (yuborish): ${error.message}`);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}&timeout=20&allowed_updates=["message","channel_post"]`;
    try {
        const response = await fetch(url);
        if (!response.ok) { console.error('Javob olishda HTTP xato:', response.status, await response.text()); return; }
        const data = await response.json();
        if (data.ok && data.result) {
            data.result.forEach(update => {
                const message = update.message || update.channel_post;
                const updateId = update.update_id;
                if (message && message.text && message.chat && message.chat.id.toString() === chatId && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    console.log('Yangi javob:', message.text);
                    updateMiniWindow(`Javob: ${message.text}`);
                } else if (updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                }
            });
        } else if (!data.ok) { console.error('API xatosi (javob olish):', data.description); }
    } catch (error) { console.error('Fetch xatosi (javob olish):', error); }
}

function updateMiniWindow(message) {
    const miniWindowContent = document.getElementById('mini-window-content');
    if (!miniWindowContent) { console.error("mini-window-content topilmadi!"); return; }
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    if (miniWindowContent.textContent.trim() === "--" && miniWindowContent.firstChild?.nodeType === Node.TEXT_NODE) {
        miniWindowContent.innerHTML = ''; // Boshlang'ich "--" matnini tozalash
    }
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

function findMeaningfulBlock(clickedElement) {
    if (!clickedElement) return null;
    let candidate = clickedElement.closest('p, div, article, section, li, h1, h2, h3, h4, h5, h6, span, td, th');
    if (candidate && candidate.textContent.trim().length > 10) {
        if (candidate.offsetHeight > window.innerHeight * 0.7 || candidate.offsetWidth > window.innerWidth * 0.7) {
             if (clickedElement.textContent.trim().length > 10) return clickedElement;
        }
        return candidate;
    }
    if (clickedElement.textContent.trim().length > 5) { return clickedElement; }
    return null;
}

async function handleRightMouseDownToHold(event) {
    if (event.button === 2) {
        elementUnderCursor = event.target;
        if (rightClickHoldTimer) { clearTimeout(rightClickHoldTimer); }
        rightClickHoldTimer = setTimeout(async () => {
            if (elementUnderCursor) {
                const questionBlock = findMeaningfulBlock(elementUnderCursor);
                if (questionBlock) {
                    const questionText = questionBlock.textContent?.trim();
                    if (questionText) {
                        const safeQuestionText = questionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                        const messageToSend = `<b>Tanlangan savol (bosib turish):</b>\n<pre>${safeQuestionText}</pre>`;
                        await sendQuestionToTelegram(messageToSend);
                        updateMiniWindow("Tanlangan savol yuborildi."); // Qisqa xabar
                    } else { updateMiniWindow("Xato: Matn olinmadi (bosib turish)."); }
                } else { updateMiniWindow("Xato: Blok topilmadi (bosib turish)."); }
            }
            elementUnderCursor = null; rightClickHoldTimer = null;
        }, RIGHT_CLICK_HOLD_DURATION);
    }
}

function handleRightMouseUpToHold(event) {
    if (event.button === 2) {
        if (rightClickHoldTimer) { clearTimeout(rightClickHoldTimer); rightClickHoldTimer = null; }
        elementUnderCursor = null;
    }
}

async function sendBodyContent() {
    const bodyText = document.body.innerText;
    if (bodyText && bodyText.trim().length > 0) {
        const safeBodyText = bodyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const message = `<b>Sahifa matni (${REQUIRED_TAPS_FOR_BODY_SEND} bosish):</b>\n<pre>${safeBodyText.substring(0, 3800)}</pre>`;
        await sendQuestionToTelegram(message);
        updateMiniWindow("Sahifa matni yuborildi."); // Qisqa xabar
    } else { updateMiniWindow("Xato: Sahifada matn yo'q."); }
}

document.addEventListener("keyup", (event) => { if (event.key.toLowerCase() === "m") { toggleMiniWindow(); } });

document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    const currentTime = new Date().getTime();
    if (currentTime - lastRightClickTapTime < MULTI_CLICK_TAP_THRESHOLD) { rightClickTapCount++; }
    else { rightClickTapCount = 1; }
    lastRightClickTapTime = currentTime;
    if (rightClickTapCount >= REQUIRED_TAPS_FOR_BODY_SEND) {
        sendBodyContent(); rightClickTapCount = 0; lastRightClickTapTime = 0;
    } else if (rightClickTapCount === 1) { toggleMiniWindow(); }
});

document.addEventListener('mousedown', handleRightMouseDownToHold);
document.addEventListener('mouseup', handleRightMouseUpToHold);

// == "Eski kod"dagi mini oyna HTML va CSS ==
const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-content">--</div>
    </div>
`;

const styleElement = document.createElement('style');
styleElement.innerHTML = `
#mini-window {
    position: fixed; bottom: 10px; right: 10px; width: 200px; height: 200px;
    background: rgba(255, 255, 255, 0); border: none; border-radius: 5px;
    overflow-y: auto; z-index: 2147483647; font-family: Arial, sans-serif;
}
#mini-window::-webkit-scrollbar { width: 6px; }
#mini-window::-webkit-scrollbar-thumb { background-color: rgba(255, 255, 255, 0.3); border-radius: 10px; }
#mini-window::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.5); }
#mini-window::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0); border-radius: 5px; }
#mini-window-content {
    padding: 5px; font-size: 14px; line-height: 1.5;
    max-height: calc(100% - 0px); /* Eski kodda 50px edi, sarlavhasiz 0px bo'ladi yoki 100% */
    color: rgba(204, 204, 204, 0.75); word-wrap: break-word;
}
/* #mini-window-content p { margin-top: 0; margin-bottom: 5px; } // Eski kodda bu yo'q edi */
`;
document.head.appendChild(styleElement);
document.body.insertAdjacentHTML('beforeend', miniWindowHTML);

async function processAndSendQuestions() {
    const testElements = document.querySelectorAll('.test-table'); // SELEKTORNI MOSLASHTIRING
    if (testElements.length === 0) {
        updateMiniWindow("Xato: Savollar topilmadi (selektor)."); return;
    }
    const sortedTests = Array.from(testElements).sort((a,b)=>(parseInt(a.id?.replace(/\D/g,'')||'0')-parseInt(b.id?.replace(/\D/g,'')||'0')));
    updateMiniWindow(`${sortedTests.length} savol topildi...`);
    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let msg = `<b>Savol ${i+1}/${sortedTests.length}:</b>\n`;
        const qEl = test.querySelector('.test-question'); // SELEKTORNI MOSLASHTIRING
        msg += `${qEl?.textContent?.trim()||'Savol matni yo\'q'}\n\n`;
        const qImgs = extractImageLinks(qEl);
        if (qImgs) { msg += `Savol rasmlari:\n${qImgs}\n\n`; }
        const ansEls = test.querySelectorAll('.test-answers li'); // SELEKTORNI MOSLASHTIRING
        let ansTxt = Array.from(ansEls).map((li,idx)=>{
            const vEl = li.querySelector('.test-variant'); // SELEKTORNI MOSLASHTIRING
            const vari = vEl?.textContent?.trim()||String.fromCharCode(65+idx);
            let aTxt = ''; const lblEl = li.querySelector('label'); // SELEKTORNI MOSLASHTIRING
            if(lblEl){ const clone=lblEl.cloneNode(true); const vInL=clone.querySelector('.test-variant'); if(vInL)vInL.remove(); aTxt=clone.textContent?.trim(); }
            else{ aTxt=li.textContent?.replace(vari,'').trim(); }
            const aImg = extractImageLinks(li); return `${vari}. ${aTxt}${aImg?` (Rasm: ${aImg})`:''}`;
        }).join('\n');
        if(ansEls.length>0){ msg+='Javob variantlari:\n'+ansTxt; } else { msg+='Javob variantlari yo\'q.'; }
        await sendQuestionToTelegram(msg);
        await new Promise(r => setTimeout(r, 350+Math.random()*300));
    }
    updateMiniWindow("Savollar muvaffaqiyatli yuborildi."); // Qisqa xabar
}

function initializeMainScript() {
    console.log("Asosiy skript ishga tushirilmoqda...");
    updateMiniWindow("Skript ishga tushdi...");
    setTimeout(() => { processAndSendQuestions(); }, 1000); // Avtomatik yuborishni biroz kechiktirish
}

// 2-Versiya: DOM tayyor bo'lishini kutib chaqirish
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initializeMainScript();
} else {
    document.addEventListener('DOMContentLoaded', initializeMainScript);
}
