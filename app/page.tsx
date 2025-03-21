'use client';

import React, { useState } from 'react';
import ChatInterface from '../components/ChatInterface';
import StudentEvaluation from '../components/StudentEvaluation';
import { Message } from '@/components/ChatInterface';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);

  const handleMessagesUpdate = (newMessages: Message[]) => {
    setMessages(newMessages);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3">
                <i className="fas fa-book-reader text-white"></i>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">책읽Go</span>
                <span className="ml-1 text-gray-500 text-lg">독서 논술 학습 시스템</span>
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              AI와 함께하는 독서 논술 학습
            </h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              AI 선생님과 대화하며 독서 논술 실력을 키워보세요.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="lg:flex lg:h-[calc(100vh-16rem)] md:h-auto">
              <div className="lg:w-[49%] p-2">
                <ChatInterface onMessagesUpdate={handleMessagesUpdate} />
              </div>
              <div className="hidden lg:block lg:w-[2%] bg-gray-50"></div>
              <div className="lg:w-[49%] p-2">
                <StudentEvaluation messages={messages} />
              </div>
            </div>
          </div>

          <footer className="mt-10 text-center text-gray-500 text-sm">
            <p>© 2025 책읽Go - 모든 어린이의 독서 논술 능력 향상을 위해</p>
          </footer>
        </div>
      </div>
    </main>
  );
} 