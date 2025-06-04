// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4875533020';
let lastProcessedUpdateId = 0;

// Rasm ma'lumotlarini (URL yoki Blob) olish uchun funksiya
async function extractImagesData(element) {
    const images = element.querySelectorAll('img');
    const imageDataArray = [];

    for (const img of images) {
        const src = img.src;
        if (!src) continue;

        if (src.startsWith('data:image')) { // Data URI
            try {
                const response = await fetch(src);
                const blob = await response.blob();
                let filename = 'image.png'; // Default filename
                if (blob.type === 'image/jpeg') {
                    filename = 'image.jpg';
                } else if (blob.type === 'image/gif') {
                    filename = 'image.gif';
                }
                // Yoki boshqa turdagi rasmlar uchun kengaytmani aniqlash
                imageDataArray.push({ type: 'blob', data: blob, filename: filename });
            } catch (e) {
                console.error('Data URI ni Blobga o\'tkazishda xatolik:', e, src.substring(0,100) + "...");
                // Xatolik yuz berganda src ni matn sifatida yuborish (agar kerak bo'lsa)
                // imageDataArray.push({ type: 'text', data: `[Rasm yuklanmadi: ${src.substring(0,50)}...]` });
            }
        } else if (src.startsWith('http://') || src.startsWith('https://')) { // Absolut URL
            imageDataArray.push({ type: 'url', data: src });
        } else if (src) { // Nisbiy URL
            try {
                imageDataArray.push({ type: 'url', data: new URL(src, document.baseURI).href });
            } catch (e) {
                console.error('Nisbiy URLni absolutga o\'tkazishda xatolik:', e, src);
                // imageDataArray.push({ type: 'text', data: `[Rasm URL xatosi: ${src}]` });
            }
        }
    }
    return imageDataArray;
}


async function sendTextToTelegram(text) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
        }),
    });

    if (!response.ok) {
        console.error('Matn yuborishda xatolik:', await response.text());
    } else {
        console.log('Matn muvaffaqiyatli yuborildi:', text.substring(0, 50) + "...");
    }
}

async function sendPhotoToTelegram(photoData, caption = '') {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    const formData = new FormData();
    formData.append('chat_id', chatId);
    if (caption) {
        formData.append('caption', caption);
    }

    if (photoData.type === 'url') {
        formData.append('photo', photoData.data); // URL ni yuborish
    } else if (photoData.type === 'blob') {
        formData.append('photo', photoData.data, photoData.filename); // Blob faylini yuborish
    } else {
        console.error('Noma\'lum rasm turi:', photoData.type);
        await sendTextToTelegram(`[Rasm yuborishda xatolik: ${photoData.data || 'noma\'lum manba'}]`);
        return;
    }

    const response = await fetch(url, {
        method: 'POST',
        body: formData, // FormData Content-Type ni avtomatik o'rnatadi
    });

    if (!response.ok) {
        console.error('Rasm yuborishda xatolik:', await response.text());
        // Agar rasm yuborishda xatolik bo'lsa, URLni matn sifatida yuborish
        if (photoData.type === 'url') {
            await sendTextToTelegram(`Rasm URL (yuklanmadi): ${photoData.data} ${caption ? '\nIzoh: ' + caption : ''}`);
        } else {
            await sendTextToTelegram(`[Rasm faylini yuborishda xatolik (${photoData.filename})] ${caption ? '\nIzoh: ' + caption : ''}`);
        }
    } else {
        console.log('Rasm muvaffaqiyatli yuborildi:', photoData.type === 'url' ? photoData.data : photoData.filename);
    }
}


async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error('Telegramdan javob olishda xatolik:', response.status, await response.text());
            return;
        }
        const data = await response.json();

        if (data.ok) {
            const messages = data.result;

            messages.forEach(message => {
                const text = message.message?.text;
                const updateId = message.update_id;

                if (text && updateId > lastProcessedUpdateId) {
                    lastProcessedUpdateId = updateId;
                    console.log('Получено сообщение:', text);
                    updateMiniWindow(text);
                }
            });
        } else {
            console.error('Telegram API xatosi (getUpdates):', data.description);
        }
    } catch (error) {
        console.error('getNewAnswersFromTelegram funksiyasida xatolik:', error);
    }
}

function updateMiniWindow(message) {
    const miniWindow = document.getElementById('mini-window-content');
    if (miniWindow) {
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        miniWindow.appendChild(messageElement);
        miniWindow.scrollTop = miniWindow.scrollHeight;
    }
}

setInterval(getNewAnswersFromTelegram, 5000);

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (miniWindow) {
        if (miniWindow.style.display === 'none' || miniWindow.style.display === '') {
            miniWindow.style.display = 'block';
        } else {
            miniWindow.style.display = 'none';
        }
    }
}

document.addEventListener("keyup", (m) => {
    if (m.key === "m" || m.key === "M") {
        toggleMiniWindow();
    }
});

document.addEventListener("contextmenu", (m) => {
    m.preventDefault();
    toggleMiniWindow();
});


const miniWindowHTML = `
    <div id="mini-window" style="display: none;">
        <div id="mini-window-content">--
        </div>
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
    background: rgba(30, 30, 30, 0.85); /* Slightly more opaque background */
    border: 1px solid rgba(204, 204, 204, 0.2); /* Subtle border */
    border-radius: 5px;
    overflow-y: auto;
    z-index: 10000; /* Increased z-index */
    font-family: Arial, sans-serif;
    box-shadow: 0 0 10px rgba(0,0,0,0.5); /* Added shadow */
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
    padding: 8px; /* Slightly more padding */
    font-size: 13px; /* Adjusted font size */
    line-height: 1.4;
    color: rgba(220, 220, 220, 0.9); /* Brighter text */
}
#mini-window-content p {
    margin-bottom: 5px; /* Space between messages */
    word-break: break-word; /* Prevent overflow */
}
`;

document.head.appendChild(style);

// miniWindowHTML ni body oxiriga qo'shishdan oldin DOM tayyor bo'lishini kutish
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        document.body.insertAdjacentHTML('beforeend', miniWindowHTML);
    });
} else {
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);
}


const tests = document.querySelectorAll('.test-table');

async function processAndSendQuestions() {
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10) || 0; // Fallback to 0 if NaN
        const idB = parseInt(b.id.replace(/\D/g, ''), 10) || 0; // Fallback to 0 if NaN
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        await sendTextToTelegram(`Вопрос ${i + 1}:`);
        await new Promise(resolve => setTimeout(resolve, 100)); // Kichik kechikish

        const questionElement = test.querySelector('.test-question');
        let questionText = 'Вопрос не найден';

        if (questionElement) {
            // Rasmlarni o'chirmasdan oldin matnni olish
            const questionElementCloneForText = questionElement.cloneNode(true);
            questionElementCloneForText.querySelectorAll('img').forEach(img => img.remove()); // Matndan rasmlarni olib tashlash
            questionText = questionElementCloneForText.textContent?.trim() || 'Вопрос не найден';

            const questionImagesData = await extractImagesData(questionElement); // Original elementdan rasmlarni olish
            for (const imgData of questionImagesData) {
                await sendPhotoToTelegram(imgData);
                await new Promise(resolve => setTimeout(resolve, 200)); // Rasm yuborishlar orasida kechikish
            }
        }
        if (questionText !== 'Вопрос не найден' && questionText.length > 0) {
             await sendTextToTelegram(questionText);
        } else if (!questionElement || (await extractImagesData(questionElement)).length === 0) {
            // Agar na matn, na rasm topilmasa (savol elementi mavjud bo'lsa ham)
            await sendTextToTelegram('Вопрос не найден (пусто)');
        }
        await new Promise(resolve => setTimeout(resolve, 100));

        const answerElements = Array.from(test.querySelectorAll('.test-answers li'));
        if (answerElements.length > 0) {
            await sendTextToTelegram('Варианты ответов:');
            await new Promise(resolve => setTimeout(resolve, 100));

            for (let j = 0; j < answerElements.length; j++) {
                const li = answerElements[j];
                const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
                
                const labelElement = li.querySelector('label');
                let answerTextContent = '';
                let answerImagesData = [];

                if (labelElement) {
                    const labelCloneForText = labelElement.cloneNode(true);
                    labelCloneForText.querySelectorAll('img').forEach(img => img.remove());
                    answerTextContent = labelCloneForText.textContent?.replace(variant, '').trim() || '';
                    
                    answerImagesData = await extractImagesData(labelElement); // Original labeldan rasmlarni olish
                } else {
                     // Label topilmasa, butun li elementidan qidirish (kamdan-kam holat)
                    const liCloneForText = li.cloneNode(true);
                    liCloneForText.querySelectorAll('img').forEach(img => img.remove());
                    answerTextContent = liCloneForText.textContent?.replace(variant, '').trim() || '';
                    answerImagesData = await extractImagesData(li);
                }


                let fullAnswerText = `${variant}. ${answerTextContent}`;
                
                // Avval matnni yuborish (agar mavjud bo'lsa)
                if (answerTextContent.length > 0 || variant.length > 0) {
                    await sendTextToTelegram(fullAnswerText);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                // Keyin rasmlarni yuborish
                for (const imgData of answerImagesData) {
                    await sendPhotoToTelegram(imgData);
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
                if (answerTextContent.length === 0 && variant.length > 0 && answerImagesData.length === 0) {
                    // Faqat variant bor, matn va rasm yo'q bo'lsa (e.g., "A.")
                    await sendTextToTelegram(`${variant}. (пусто)`);
                     await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Har bir test-savol orasida kattaroq kechikish
    }
    await sendTextToTelegram("--- Барча саволлар юборилди ---");
}

// DOM yuklangandan so'ng asosiy funksiyani ishga tushirish
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAndSendQuestions);
} else {
    processAndSendQuestions();
}
