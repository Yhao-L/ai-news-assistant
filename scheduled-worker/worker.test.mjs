import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { consumeEvents } from './worker.mjs';
function body(text) {
  const bytes = new TextEncoder().encode(text);
  return new ReadableStream({ start(c) {
    for (let i = 0; i < bytes.length; i += 3) c.enqueue(bytes.slice(i, i + 3));
    c.close();
  }});
}
test('split UTF-8 and CRLF stream completes', async () => {
  await consumeEvents(body('event: conversation.message.completed\r\ndata: {"content":"新闻"}\r\n\r\nevent: done\r\ndata: {}\r\n\r\n'));
});
test('API failures and interrupted runs reject even before done', async () => {
  for (const frame of ['event: error\ndata: {"code":500}', 'event: conversation.chat.requires_action\ndata: {}', 'event: conversation.chat.failed\ndata: {}']) {
    await assert.rejects(consumeEvents(body(frame + '\n\nevent: done\ndata: {}\n\n')));
  }
});
test('zero error code is success', async () => {
  await consumeEvents(body('event: conversation.chat.completed\ndata: {"last_error":{"code":0}}\n\nevent: done\ndata: {}\n\n'));
});
test('missing completion and malformed data fail', async () => {
  for (const input of ['', 'event: conversation.message.completed\ndata: {}\n\n', 'event: done\ndata: broken\n\n']) await assert.rejects(consumeEvents(body(input)));
});
test('public HTTP endpoint never invokes workflow', async () => {
  const response = await worker.fetch();
  assert.equal(response.status, 200);
  assert.match(await response.text(), /do not trigger/);
});
