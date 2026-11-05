import React from 'react';
import ChatInterface from './components/ChatInterface';
import { ChatProvider } from './contexts/ChatContext';
import { theme } from './theme/colors';

export default function App() {
  return <ChatProvider>
    <div className={`min-h-screen ${theme.pageBg}`}>
      <header className="bg-white shadow-lg">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className={`text-2xl font-bold ${theme.appLogo}`}>AI新闻助手</h1>
          <span className="text-sm text-gray-500">新闻速览 · 对话解读</span>
        </div>
      </header>
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-4rem)] overflow-hidden">
        <ChatInterface />
      </main>
    </div>
  </ChatProvider>;
}
