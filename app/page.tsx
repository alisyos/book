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
    <main className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          독서 논술 학습 도우미
        </h1>
        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          <div className="w-1/2">
            <ChatInterface onMessagesUpdate={handleMessagesUpdate} />
          </div>
          <div className="w-1/2">
            <StudentEvaluation messages={messages} />
          </div>
        </div>
      </div>
    </main>
  );
} 