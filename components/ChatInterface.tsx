'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: '안녕하세요, 개구리 왕자에 대한 토론을 시작해 볼까요?'
};

interface ChatInterfaceProps {
  onMessagesUpdate?: (messages: Message[]) => void;
}

export default function ChatInterface({ onMessagesUpdate }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isFirstMessage, setIsFirstMessage] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initThread = async () => {
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'createThread' })
        });
        const data = await response.json();
        if (data.threadId) {
          setThreadId(data.threadId);
        }
      } catch (error) {
        console.error('Thread 초기화 중 에러:', error);
      }
    };
    initThread();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newUserMessage: Message = {
      role: 'user',
      content: input,
    };

    setIsLoading(true);
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    onMessagesUpdate?.(updatedMessages);
    setInput('');

    try {
      if (isFirstMessage) {
        // 첫 번째 메시지인 경우, 초기 메시지와 사용자 메시지를 연결하여 전송
        const combinedMessage = `${INITIAL_MESSAGE.content}\n\n사용자: ${input}`;
        const sendResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            threadId,
            content: combinedMessage
          })
        });
        const sendData = await sendResponse.json();
        
        if (!sendData.runId) {
          throw new Error('실행 ID를 받지 못했습니다.');
        }

        // 실행 완료 대기
        while (true) {
          const statusResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'checkStatus',
              threadId,
              runId: sendData.runId
            })
          });
          const statusData = await statusResponse.json();

          if (statusData.status.status === 'completed') {
            break;
          } else if (statusData.status.status === 'failed') {
            throw new Error('Assistant 실행 실패');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        setIsFirstMessage(false);
      } else {
        // 첫 번째 메시지가 아닌 경우, 일반적인 메시지 전송
        const sendResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'sendMessage',
            threadId,
            content: input
          })
        });
        const sendData = await sendResponse.json();
        
        if (!sendData.runId) {
          throw new Error('실행 ID를 받지 못했습니다.');
        }

        // 실행 완료 대기
        while (true) {
          const statusResponse = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'checkStatus',
              threadId,
              runId: sendData.runId
            })
          });
          const statusData = await statusResponse.json();

          if (statusData.status.status === 'completed') {
            break;
          } else if (statusData.status.status === 'failed') {
            throw new Error('Assistant 실행 실패');
          }
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 모든 메시지 가져오기
      const messagesResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getMessages',
          threadId
        })
      });
      const messagesData = await messagesResponse.json();
      
      // 서버에서 받은 메시지 처리
      if (messagesData.messages && messagesData.messages.length > 0) {
        const latestMessage = messagesData.messages[0];
        if (latestMessage && 
            latestMessage.role === 'assistant' && 
            latestMessage.content && 
            latestMessage.content[0] && 
            'text' in latestMessage.content[0]) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: latestMessage.content[0].text.value
          };
          const newMessages = [...updatedMessages, assistantMessage];
          setMessages(newMessages);
          onMessagesUpdate?.(newMessages);
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-4 flex flex-col h-full">
      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg ${
              message.role === 'user'
                ? 'bg-blue-100 ml-auto max-w-[80%]'
                : 'bg-gray-100 mr-auto max-w-[80%]'
            }`}
          >
            <div className="prose max-w-none">
              <ReactMarkdown>
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2">
            <div className="animate-bounce">●</div>
            <div className="animate-bounce delay-100">●</div>
            <div className="animate-bounce delay-200">●</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            전송
          </button>
        </form>
      </div>
    </div>
  );
} 