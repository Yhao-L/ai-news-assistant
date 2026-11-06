import axios from 'axios';
import { API_CONFIG } from '../config/api';

const apiClient = axios.create({baseURL:API_CONFIG.BASE_URL,timeout:180000,headers:{'Content-Type':'application/json'}});

export const chatWithNewsAssistant = async (message, messages = []) => {
  const history = [];
  let budget = 0;
  for (const item of [...messages].reverse()) {
    if (item.isError || !['user','bot','assistant'].includes(item.role) || typeof item.content !== 'string') continue;
    if (item.content.length > 10000 || budget + item.content.length > 24000 || history.length >= 20) break;
    history.unshift({role:item.role === 'user' ? 'user' : 'assistant',content:item.content});
    budget += item.content.length;
  }
  const response = await apiClient.post('/api/chat',{message,history});
  if (!response.data?.content) throw new Error('服务未返回有效回复，请稍后重试');
  return response.data;
};
