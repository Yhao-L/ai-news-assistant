// Daily Coze trigger. Secrets and response content must never be logged.
export async function consumeEvents(body) {
  const reader = body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '', event = '', data = [], finished = false;
  function dispatch() {
    if (!event && !data.length) return;
    let value;
    try { value = data.length ? JSON.parse(data.join('\n')) : {}; }
    catch { throw new Error('Invalid Coze event JSON'); }
    if (event === 'error' || /\.(failed|requires_action|canceled)$/.test(event) ||
        (value.code != null && String(value.code) !== '0') ||
        (value.last_error?.code != null && String(value.last_error.code) !== '0')) {
      throw new Error('Coze execution failed or requires intervention');
    }
    if (event === 'done') finished = true;
    event = ''; data = [];
  }
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += chunk.value;
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).replace(/\r$/, '');
        buffer = buffer.slice(end + 1);
        if (!line) dispatch();
        else if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
        if (data.join('').length > 1000000) throw new Error('Coze event too large');
      }
      if (buffer.length > 1000000) throw new Error('Coze event too large');
    }
    // A partial final frame is not a confirmed completion.
    if (buffer || event || data.length || !finished) throw new Error('Incomplete Coze stream');
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export default {
  async fetch() {
    return new Response('AI news scheduler. HTTP requests do not trigger Coze.');
  },
  async scheduled(controller, env) {
    const started = Date.now();
    console.log(JSON.stringify({ status: 'started', scheduledTime: controller.scheduledTime }));
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 12 * 60 * 1000);
    try {
      if (!env.COZE_API_TOKEN) throw new Error('Missing COZE_API_TOKEN secret');
      const message = '今天的AI领域新闻有哪些';
      const response = await fetch('https://api.coze.cn/v1/workflows/chat', {
        method: 'POST',
        redirect: 'manual',
        signal: abort.signal,
        headers: { Authorization: `Bearer ${env.COZE_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow_id: '7639272269608747035',
          app_id: '7639197470828347438',
          parameters: { CONVERSATION_NAME: 'Default', USER_INPUT: message },
          additional_messages: [{ content: message, content_type: 'text', role: 'user', type: 'question' }]
        })
      });
      if (!response.ok) throw new Error(`Coze HTTP ${response.status}`);
      if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
        throw new Error('Expected Coze event stream');
      }
      await consumeEvents(response.body);
      console.log(JSON.stringify({ status: 'completed', elapsedMs: Date.now() - started }));
    } catch (error) {
      console.error(JSON.stringify({ status: 'failed', reason: error.name === 'AbortError' ? 'Timed out; verify Coze before retrying' : error.message, elapsedMs: Date.now() - started }));
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
};
