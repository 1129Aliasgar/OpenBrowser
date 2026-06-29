const status = document.querySelector('#status');
const button = document.querySelector('#check');

button.addEventListener('click', checkBridge);
checkBridge();

async function checkBridge() {
  status.textContent = 'Checking bridge...';

  try {
    const response = await fetch('http://127.0.0.1:5000/health');
    if (!response.ok) {
      status.textContent = `Bridge returned ${response.status}.`;
      return;
    }

    const tabs = await chrome.tabs.query({
      url: [
        'https://chatgpt.com/*',
        'https://chat.openai.com/*',
        'https://gemini.google.com/*',
        'https://chat.deepseek.com/*',
      ],
    });

    if (tabs.length === 0) {
      status.textContent =
        'Bridge is running. Open ChatGPT and reload the tab to enable auto-send.';
      return;
    }

    status.textContent = `Bridge running. ${tabs.length} AI tab(s) ready for auto-send.`;
  } catch {
    status.textContent = 'Bridge server is not reachable. Run openbrowser first.';
  }
}
