chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender?.tab?.id;

  if (tabId === undefined) {
    console.error("Action failed: sender.tab.id is undefined");
    return;
  }

  if (message.action === "inject") {
    // First inject content.js, then dispatch init event
    chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"]
    }).then(() => {
      return chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          window.dispatchEvent(new Event("philohelp-init"));
        }
      });
    }).catch(err => {
      console.error("Injection failed:", err);
    });

  } else {
    // Relay to content script (already injected)
    chrome.tabs.sendMessage(tabId, message).catch(err => {
      console.error("SendMessage failed:", err);
    });
  }
});
