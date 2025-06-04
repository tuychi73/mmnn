// == Telegram Config ==
const telegramToken = '7899262150:AAH7nPkrrjXP1YZ6FJuxKV450X_LNv-VdQg';
const chatId = '-4875533020';
let lastProcessedUpdateId = 0;

/**
 * Extracts image URLs from img tags within a given DOM element.
 * @param {Element} element - The DOM element to search for images.
 * @returns {string} A string containing newline-separated image URLs, or an empty string if no images are found or the element is invalid.
 */
function extractImageLinks(element) {
    // Check if the element exists and is a valid DOM element that can contain images
    if (!element || typeof element.querySelectorAll !== 'function') {
        return ''; // Return empty string if element is null or not a valid DOM element
    }
    const images = element.querySelectorAll('img');
    if (!images || images.length === 0) {
        return ''; // Return empty string if no images are found
    }
    // Map over the NodeList of images, get their src, filter out any null/empty/whitespace-only src, and join
    return Array.from(images)
        .map(img => img.src)
        .filter(src => src && src.trim() !== '') // Ensure only valid src attributes are included
        .join('\n');
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
    if (miniWindow) { // Check if miniWindow exists
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        miniWindow.appendChild(messageElement);
        miniWindow.scrollTop = miniWindow.scrollHeight;
    } else {
        console.error('mini-window-content element not found');
    }
}

// Poll for new answers every 5 seconds
setInterval(getNewAnswersFromTelegram, 5000);

function toggleMiniWindow() {
    const miniWindow = document.getElementById('mini-window');
    if (miniWindow) { // Check if miniWindow exists
        if (miniWindow.style.display === 'none' || miniWindow.style.display === '') {
            miniWindow.style.display = 'block';
        } else {
            miniWindow.style.display = 'none';
        }
    } else {
        console.error('mini-window element not found');
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

// HTML and CSS for the mini-window
// Ensure this runs after the body is available, or use DOMContentLoaded
function initializeMiniWindow() {
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
        background: rgba(0, 0, 0, 0.7); /* Darker background for better visibility */
        border: 1px solid rgba(255, 255, 255, 0.2); /* Subtle border */
        border-radius: 8px; /* Slightly more rounded corners */
        overflow-y: auto;
        z-index: 10000; /* Ensure it's on top */
        font-family: Arial, sans-serif;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3); /* Add some shadow */
    }

    #mini-window::-webkit-scrollbar {
        width: 8px; /* Slightly wider scrollbar */
    }

    #mini-window::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.4); /* Lighter thumb */
        border-radius: 10px;
    }

    #mini-window::-webkit-scrollbar-thumb:hover {
        background-color: rgba(255, 255, 255, 0.6);
    }

    #mini-window::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.1); /* Subtle track */
        border-radius: 8px;
    }

    #mini-window-content {
        padding: 10px; /* More padding */
        font-size: 13px; /* Slightly smaller font for more content */
        line-height: 1.4;
        color: rgba(230, 230, 230, 0.9); /* Lighter text color for dark background */
    }

    #mini-window-content p {
        margin-bottom: 8px; /* Space between messages */
        word-wrap: break-word; /* Prevent overflow */
    }
    `;

    document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend', miniWindowHTML);
}

// Function to process and send questions from the page
async function processAndSendQuestions() {
    const tests = document.querySelectorAll('.test-table');
    if (tests.length === 0) {
        console.log("No elements with class 'test-table' found.");
        return;
    }

    // Sort tests by ID if IDs are numerical (e.g., "test-1", "test-2")
    const sortedTests = Array.from(tests).sort((a, b) => {
        const idA = parseInt(a.id.replace(/\D/g, ''), 10);
        const idB = parseInt(b.id.replace(/\D/g, ''), 10);
        // Handle cases where IDs might not be purely numerical or missing
        if (isNaN(idA) || isNaN(idB)) return 0; // Basic fallback, or implement more robust sorting
        return idA - idB;
    });

    for (let i = 0; i < sortedTests.length; i++) {
        const test = sortedTests[i];
        let messageContent = `Вопрос ${i + 1}:\n`;
        
        const questionElement = test.querySelector('.test-question');
        const questionText = questionElement?.textContent.trim() || 'Вопрос не найден';
        messageContent += `${questionText}\n\n`;

        // Extract images from the question itself
        if (questionElement) {
            const questionImages = extractImageLinks(questionElement);
            if (questionImages) {
                messageContent += `Изображения в вопросе:\n${questionImages}\n\n`;
            }
        }

        const answerElements = test.querySelectorAll('.test-answers li');
        if (answerElements.length > 0) {
            const answers = Array.from(answerElements).map((li) => {
                const variant = li.querySelector('.test-variant')?.textContent.trim() || '';
                // Ensure label exists before trying to access its textContent
                const labelElement = li.querySelector('label');
                let answerText = '';
                if (labelElement) {
                    // Clone the label, remove the variant span, then get textContent
                    const tempLabel = labelElement.cloneNode(true);
                    const variantSpanInLabel = tempLabel.querySelector('.test-variant');
                    if (variantSpanInLabel) {
                        variantSpanInLabel.remove();
                    }
                    answerText = tempLabel.textContent.trim();
                } else {
                    answerText = 'Текст ответа не найден';
                }
                
                const answerImageLinks = extractImageLinks(li); // Extract images from the whole li
                return `${variant}. ${answerText} ${answerImageLinks ? `(Изображение: ${answerImageLinks})` : ''}`;
            });

            messageContent += 'Варианты ответов:\n';
            messageContent += answers.join('\n');
        } else {
            messageContent += 'Варианты ответов не найдены.\n';
        }
        
        // Add a small delay between sending messages to avoid hitting rate limits if any
        await new Promise(resolve => setTimeout(resolve, 500)); // 0.5 second delay
        await sendQuestionToTelegram(messageContent);
    }
    console.log("All questions processed and sent.");
}

// Initialize the mini window and start processing questions when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeMiniWindow();
        processAndSendQuestions();
    });
} else {
    // DOMContentLoaded has already fired
    initializeMiniWindow();
    processAndSendQuestions();
}

