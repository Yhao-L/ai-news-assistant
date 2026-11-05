import axios from 'axios';
jest.mock('axios', () => ({create:jest.fn(() => ({post:jest.fn()}))}));
const {chatWithNewsAssistant} = require('./api');
const client = axios.create.mock.results[0].value;
afterEach(()=>client.post.mockReset());
test('sends conversation history with mapped assistant roles and skips error replies',async()=>{
  client.post.mockResolvedValue({data:{content:'reply'}});
  await expect(chatWithNewsAssistant('追问',[{role:'user',content:'问题'},{role:'bot',content:'回答'},{role:'bot',content:'网络错误',isError:true}])).resolves.toEqual({content:'reply'});
  expect(client.post).toHaveBeenCalledWith('/api/chat',{message:'追问',history:[{role:'user',content:'问题'},{role:'assistant',content:'回答'}]});
});
test('empty replies fail visibly',async()=>{
  client.post.mockResolvedValue({data:{}});
  await expect(chatWithNewsAssistant('你好')).rejects.toThrow('未返回有效回复');
});
