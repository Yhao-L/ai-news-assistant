import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkDataMigration, migrateData, cleanupInvalidData } from '../utils/dataMigration';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

// 对话数据结构
export const createNewConversation = (title = '新对话') => ({
  id: Date.now().toString(),
  title,
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messageCount: 0
});

// localStorage 键名
const STORAGE_KEY = 'ai_news_chat_conversations';
const CURRENT_CONVERSATION_KEY = 'ai_news_current_conversation';

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 从localStorage加载数据
  const loadFromStorage = useCallback(() => {
    try {
      // 检查是否需要数据迁移
      const migrationCheck = checkDataMigration();
      if (migrationCheck.needsMigration) {
        console.log('检测到旧版本数据，开始迁移...');
        const migratedConversation = migrateData(migrationCheck.oldData);
        if (migratedConversation) {
          setConversations([migratedConversation]);
          setCurrentConversationId(migratedConversation.id);
          setIsLoading(false);
          return;
        }
      }
      
      // 清理无效数据
      cleanupInvalidData();
      
      const savedConversations = localStorage.getItem(STORAGE_KEY);
      
      if (savedConversations) {
        const parsed = JSON.parse(savedConversations);
        // 隐藏的调试信息 - 用户看不到
        if (process.env.NODE_ENV === 'development') {
          console.log('加载对话数据:', {
            conversationsCount: parsed.length,
            conversations: parsed.map(c => ({ id: c.id, title: c.title, messageCount: c.messages?.length || 0 }))
          });
        }
        setConversations(parsed);
        
        // 尝试恢复上次的当前对话
        const savedCurrentId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
        
        if (process.env.NODE_ENV === 'development') {
          console.log('恢复对话状态:', {
            savedCurrentId,
            foundConversation: savedCurrentId ? parsed.find(c => c.id === savedCurrentId) : null
          });
        }
        
        if (savedCurrentId && parsed.find(c => c.id === savedCurrentId)) {
          if (process.env.NODE_ENV === 'development') {
            console.log('设置当前对话ID:', savedCurrentId);
          }
          setCurrentConversationId(savedCurrentId);
        } else if (parsed.length > 0) {
          // 如果没有保存的当前对话，但有历史对话，选择最新的一个
          if (process.env.NODE_ENV === 'development') {
            console.log('设置最新对话ID:', parsed[0].id);
          }
          setCurrentConversationId(parsed[0].id);
        } else {
          // 只有在没有任何对话时才显示欢迎界面
          if (process.env.NODE_ENV === 'development') {
            console.log('没有对话，设置为null');
          }
          setCurrentConversationId(null);
        }
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 保存到localStorage
  const saveToStorage = useCallback((conversationsData, currentId) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationsData));
      // 只有在有当前对话时才保存当前对话ID
      if (currentId) {
        localStorage.setItem(CURRENT_CONVERSATION_KEY, currentId);
      } else {
        // 如果没有当前对话，清除保存的当前对话ID
        localStorage.removeItem(CURRENT_CONVERSATION_KEY);
      }
    } catch (error) {
      console.error('保存对话历史失败:', error);
    }
  }, []);

  // 初始化时加载数据
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // 创建新对话
  const createConversation = useCallback((title = '新对话') => {
    return new Promise((resolve) => {
      const newConversation = createNewConversation(title);
      
      console.log('ChatContext: 创建新对话:', newConversation.id);
      
      setConversations(prev => {
        const updated = [newConversation, ...prev];
        saveToStorage(updated, newConversation.id);
        console.log('ChatContext: 对话列表已更新，新对话ID:', newConversation.id);
        return updated;
      });
      
      setCurrentConversationId(newConversation.id);
      console.log('ChatContext: 当前对话ID已设置为:', newConversation.id);
      
      // 等待状态更新完成 - 增加等待时间
      setTimeout(() => {
        console.log('ChatContext: 返回新对话:', newConversation.id);
        resolve(newConversation);
      }, 200);
    });
  }, [saveToStorage]);

  // 切换对话
  const switchConversation = useCallback((conversationId) => {
    if (conversations.find(c => c.id === conversationId)) {
      setCurrentConversationId(conversationId);
      saveToStorage(conversations, conversationId);
    }
  }, [conversations, saveToStorage]);

  // 添加消息到当前对话
  const addMessage = useCallback((message, conversationId = null) => {
    console.log('ChatContext: 添加消息到对话:', currentConversationId, '消息内容:', message.content.substring(0, 20) + '...');
    
    // 如果currentConversationId为null，尝试从localStorage获取
    let targetConversationId = conversationId || currentConversationId;
    if (!targetConversationId) {
      const savedCurrentId = localStorage.getItem(CURRENT_CONVERSATION_KEY);
      if (savedCurrentId) {
        console.log('ChatContext: 从localStorage恢复当前对话ID:', savedCurrentId);
        targetConversationId = savedCurrentId;
        setCurrentConversationId(savedCurrentId);
      } else {
        console.error('ChatContext: 无法找到当前对话ID');
        return;
      }
    }
    
    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === targetConversationId) {
          const updatedMessages = [...conv.messages, message];
          const title = conv.title === '新对话' && conv.messages.length === 0 
            ? message.content.substring(0, 30) + (message.content.length > 30 ? '...' : '')
            : conv.title;
          
          console.log('ChatContext: 更新对话:', conv.id, '消息数量:', updatedMessages.length);
          
          return {
            ...conv,
            title,
            messages: updatedMessages,
            updatedAt: new Date().toISOString(),
            messageCount: updatedMessages.length
          };
        }
        return conv;
      });
      
      saveToStorage(updated, targetConversationId);
      return updated;
    });
  }, [currentConversationId, saveToStorage]);

  // 删除对话
  const deleteConversation = useCallback((conversationId) => {
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== conversationId);
      
      // 如果删除的是当前对话，切换到其他对话
      let newCurrentId = currentConversationId;
      if (conversationId === currentConversationId) {
        newCurrentId = updated.length > 0 ? updated[0].id : null;
      }
      
      saveToStorage(updated, newCurrentId);
      return updated;
    });
    
    if (conversationId === currentConversationId) {
      setCurrentConversationId(prev => {
        const remainingConversations = conversations.filter(c => c.id !== conversationId);
        return remainingConversations.length > 0 ? remainingConversations[0].id : null;
      });
    }
  }, [currentConversationId, conversations, saveToStorage]);

  // 清空所有对话
  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setCurrentConversationId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
  }, []);

  // 获取当前对话
  const currentConversation = conversations.find(c => c.id === currentConversationId) || null;
  


  // 获取对话统计信息
  const getConversationStats = useCallback(() => {
    const totalMessages = conversations.reduce((sum, conv) => sum + conv.messageCount, 0);
    const totalConversations = conversations.length;
    const oldestConversation = conversations.length > 0 
      ? new Date(conversations[conversations.length - 1].createdAt)
      : null;
    
    return {
      totalMessages,
      totalConversations,
      oldestConversation
    };
  }, [conversations]);

  const value = {
    conversations,
    currentConversation,
    currentConversationId,
    isLoading,
    createConversation,
    switchConversation,
    addMessage,
    deleteConversation,
    clearAllConversations,
    getConversationStats
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};
