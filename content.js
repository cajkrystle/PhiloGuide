let tokens = [];
let currentIndex = 0;
let previousHighlights = [];
let awaitingPopupDismissal = false;

function isContraction(word) {
    return /^[A-Za-z]+['’][A-Za-z]+$/.test(word);
}

function isSpecialCharacter(char) {
    return /^[^\w\s]$/.test(char);
}

function showSpecialCharPopup(content) {
    if (document.getElementById('special-char-popup')) return;

    const popup = document.createElement('div');
    popup.id = 'special-char-popup';
    popup.innerHTML = `
        <div style="padding: 20px; background: white; border-radius: 10px; max-width: 300px; text-align: center;">
            <p style="margin-bottom: 16px; font-weight: bold;">Special character detected: ${content}</p>
            <button id="close-popup-btn">OK</button>
        </div>
    `;

    Object.assign(popup.style, {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'rgba(0,0,0,0.5)',
        zIndex: '2147483647',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
    });

    document.body.appendChild(popup);
    awaitingPopupDismissal = true;

    document.getElementById('close-popup-btn').onclick = () => {
        popup.remove();
        awaitingPopupDismissal = false;
    };
}

function clearHighlights() { //CONTRIBUTED BY BRIAN PLAZOS
    document.querySelectorAll('mark').forEach(el => {
        const parent = el.parentNode;
        if (!parent) return;

        const text = document.createTextNode(el.textContent);
        parent.replaceChild(text, el);
        parent.normalize();
    });

    previousHighlights = [];
}


function highlightWord(word) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const treeWalker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (treeWalker.nextNode()) {
        textNodes.push(treeWalker.currentNode);
    }

    textNodes.forEach(node => {
        if (node.parentNode && !['SCRIPT', 'STYLE', 'MARK'].includes(node.parentNode.nodeName)) {
            const replaced = node.textContent.replace(regex, match => `{{HIGHLIGHT:${match}}}`);
            if (replaced !== node.textContent) {
                const fragments = replaced.split(/(\{\{HIGHLIGHT:.*?\}\})/);
                const newNodes = fragments.map(fragment => {
                    const match = fragment.match(/\{\{HIGHLIGHT:(.*?)\}\}/);
                    if (match) {
                        const span = document.createElement('mark');
                        span.style.backgroundColor = '#ff4c4c';
                        span.style.color = 'white';
                        span.style.fontWeight = 'bold';
                        span.textContent = match[1];
                        previousHighlights.push(span);
                        return span;
                    } else {
                        return document.createTextNode(fragment);
                    }
                });

                const fragment = document.createDocumentFragment();
                newNodes.forEach(n => fragment.appendChild(n));
                node.replaceWith(fragment);
            }
        }
    });
}

function tokenize(text) {
    const regex = /[A-Za-z]+['’][A-Za-z]+|[A-Za-z]+|[^\w\s]/g;
    return text.match(regex) || [];
}

function processCurrentToken() {
    clearHighlights();
    const token = tokens[currentIndex];

    if (!token) return;

    if (isContraction(token)) {
        showSpecialCharPopup(token);
    } else if (isSpecialCharacter(token)) {
        showSpecialCharPopup(token);
    } else {
        highlightWord(token);
    }
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "start") {
        tokens = tokenize(request.text);
        currentIndex = 0;
        clearHighlights();
        awaitingPopupDismissal = false;
        if (tokens.length > 0) processCurrentToken();
    } else if (request.action === "next") {
        if (awaitingPopupDismissal) return;

        if (currentIndex < tokens.length - 1) {
            currentIndex++;
            processCurrentToken();
        }
    } else if (request.action === "previous") {
        if (awaitingPopupDismissal) return;

        if (currentIndex > 0) {
            currentIndex--;
            processCurrentToken();
        }
    } else if (request.action === "clear") {
        clearHighlights();
        tokens = [];
        currentIndex = 0;
        awaitingPopupDismissal = false;
    }
});

window.addEventListener("philohelp-init", () => {
    createOverlayUI();
});

function createOverlayUI() {
    if (document.getElementById('sticky-word-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'sticky-word-overlay';
    
   overlay.innerHTML = `
    <div id="overlay-header">🔍 AJ Krystle's Philo Guide (1.2)</div>
    <input id="highlight-input" type="text" placeholder="Enter sentence" style="width:100%;margin-bottom:8px;" />
    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
        <button id="start-btn" style="flex:1;">Start (W)</button>
        <button id="prev-btn" style="flex:1;">Previous (A)</button>
        <button id="next-btn" style="flex:1;">Next (D)</button>
        <button id="clear-btn" style="flex:1;">Clear (S)</button>
    </div>
`;


    Object.assign(overlay.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        width: '260px',
        padding: '12px',
        background: 'linear-gradient(to bottom right, #e5ccff, #f3e0ff)',
        border: '1px solid #b68ff9',
        borderRadius: '10px',
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
        zIndex: '2147483647',
        fontFamily: 'Arial, sans-serif',
        pointerEvents: 'auto'
    });

    const buttonStyle = `
        background: linear-gradient(to right, #c79df2, #e2c7ff);
        border: none;
        border-radius: 6px;
        color: white;
        font-weight: bold;
        padding: 8px;
        cursor: pointer;
        transition: background 0.2s ease;
    `;

    overlay.querySelectorAll("button").forEach(btn => {
        btn.style.cssText += buttonStyle;
        btn.addEventListener("mouseover", () => {
            btn.style.background = 'linear-gradient(to right, #b888ec, #d9b9ff)';
        });
        btn.addEventListener("mouseout", () => {
            btn.style.background = 'linear-gradient(to right, #c79df2, #e2c7ff)';
        });
    });

    document.body.appendChild(overlay);

    document.getElementById('start-btn').onclick = () => {
        const text = document.getElementById('highlight-input').value;
        chrome.runtime.sendMessage({ action: 'start', text });
    };
    document.getElementById('next-btn').onclick = () => {
        chrome.runtime.sendMessage({ action: 'next' });
    };
    document.getElementById('prev-btn').onclick = () => {
        chrome.runtime.sendMessage({ action: 'previous' });
    };
    document.getElementById('clear-btn').onclick = () => {
        chrome.runtime.sendMessage({ action: 'clear' });
    };

    makeOverlayDraggable(overlay);
}

function makeOverlayDraggable(el) {
    const header = el.querySelector("#overlay-header");
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.addEventListener("mousedown", (e) => {
        isDragging = true;
        offsetX = e.clientX - el.getBoundingClientRect().left;
        offsetY = e.clientY - el.getBoundingClientRect().top;
        document.body.style.userSelect = "none";
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.right = "auto";
    });

    document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.userSelect = "";
    });
}

createOverlayUI();

// Keyboard Shortcuts CONTRIBUTED BY BRIAN PLAZOS
window.addEventListener("keydown", (e) => {
    const tag = document.activeElement.tagName.toLowerCase();

    // Prevent shortcut triggering inside input/textarea fields
    if (tag === 'input' || tag === 'textarea') return;

    const inputText = document.getElementById('highlight-input')?.value || '';

    switch (e.key) {
        case "ArrowRight":
        case "d":
        case "D":
            chrome.runtime.sendMessage({ action: "next" });
            break;

        case "ArrowLeft":
        case "a":
        case "A":
            chrome.runtime.sendMessage({ action: "previous" });
            break;

        case "Enter":
        case "w":
        case "W":
            chrome.runtime.sendMessage({ action: "start", text: inputText });
            break;

        case "Escape":
        case "s":
        case "S":
            chrome.runtime.sendMessage({ action: "clear" });
            break;
    }
});

