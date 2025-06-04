// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4875533020';
let lastProcessedUpdateId = 0;

function extractImageLinks(element) {
    const images = element.querySelectorAll('img');
    return Array.from(images).map(img => img.src);
}

async function sendQuestionToTelegram(question) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: question,
        }),
    });

    if (!response.ok) {
        console.error('Ошибка отправки вопроса:', await response.text());
    } else {
        console.log('Вопрос успешно отправлен:', question);
    }
}

async function sendPhotoToTelegram(chatId, photoUrl, caption) {
    const url = `https://api.telegram.org/bot${telegramToken}/sendPhoto`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
        }),
    });

    if (!response.ok) {
        console.error('Ошибка отправки фото:', await response.text());
    } else {
        console.log('Фото успешно отправлено:', photoUrl);
    }
}

async function getNewAnswersFromTelegram() {
    const url = `https://api.telegram.org/bot${telegramToken}/getUpdates?offset=${lastProcessedUpdateId + 1}`;
    const response = await fetch(url);
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
    }
}

function updateMiniWindow(message) {
    const miniWindow = document.getElementById('mini-window-content');
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    miniWindow.appendChild(messageElement);
    miniWindow.scrollTop = miniWindow.scrollHeight;
}

setInterval(getNewAnswersFromTelegram, 5000);

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (miniWindow.style.display === 'none') {
        miniWindow.style.display = 'block';
    } else {
        miniWindow.style.display = 'none';
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

const tests = document.querySelectorAll('.test-table');

async function processAndSendQuestions() {
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10);
        const idB = parseInt(b.id.replace(/\D/g, ''), 10);
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        const questionNumber = i + 1;
        const questionElement = test.querySelector('.test-question');
        const questionText = questionElement?.textContent.trim() || 'Вопрос не найден';
        const questionImages = extractImageLinks(questionElement);

        const answers = Array.from(test.querySelectorAll('.test-answers li')).map((li) => {
            const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
            const answerText = li.querySelector('label')?.textContent.replace(variant, '').trim() || '';
            const answerImages = extractImageLinks(li);
            return { variant, text: answerText, images: answerImages };
        });

        let messageContent = `Вопрос ${questionNumber}:\n${questionText}\n\nВарианты ответов:\n`;
        answers.forEach(answer => {
            messageContent += `${answer.variant}. ${answer.text}\n`;
        });

        await sendQuestionToTelegram(messageContent);

        for (const imageUrl of questionImages) {
            const caption = `Изображение из вопроса ${questionNumber}`;
            await sendPhotoToTelegram(chatId, imageUrl, caption);
        }

        for (const answer of answers) {
            for (const imageUrl of answer.images) {
                const caption = `Изображение из ответа ${answer.variant} вопроса ${questionNumber}`;
                await sendPhotoToTelegram(chatId, imageUrl, caption);
            }
        }
    }
}

processAndSendQuestions();
