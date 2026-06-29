const BRIDGE_URL = 'http://127.0.0.1:5000';

async function checkBridge() {
  try {
    const response = await fetch(`${BRIDGE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export { checkBridge, BRIDGE_URL };
