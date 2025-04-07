'use client';

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTypingEffect } from '../hooks/useTypingEffect';

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
  const [streamingResponse, setStreamingResponse] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { displayedText, isComplete } = useTypingEffect(streamingResponse, 15);
  const [pendingAssistantMessage, setPendingAssistantMessage] = useState<string | null>(null);

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
    if (isStreaming && streamingRef.current) {
      streamingRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 메시지 목록이 업데이트되거나 타이핑 효과가 진행될 때 스크롤 내리기
  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedText]);

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
      let runId = '';
      
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
        
        runId = sendData.runId;
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
        
        runId = sendData.runId;
      }

      // 스트리밍 응답 시작
      setIsStreaming(true);
      setStreamingResponse('');
      
      // 상태 확인 및 스트리밍 처리
      let isCompleted = false;
      let previousContent = '';
      
      while (!isCompleted) {
        const statusResponse = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'checkStatus',
            threadId,
            runId
          })
        });
        const statusData = await statusResponse.json();

        if (statusData.status.status === 'completed') {
          isCompleted = true;
        } else if (statusData.status.status === 'failed') {
          throw new Error('Assistant 실행 실패');
        } else {
          // 아직 완료되지 않은 경우 진행중인 응답을 가져오기
          try {
            const partialResponse = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'getPartialResponse',
                threadId,
                runId,
                timestamp: Date.now()
              })
            });
            const partialData = await partialResponse.json();
            
            if (partialData.content && partialData.content !== previousContent) {
              console.log('새 응답 받음:', partialData.content.length, '이전:', previousContent.length);
              previousContent = partialData.content;
              setStreamingResponse(partialData.content);
            }
          } catch (error) {
            console.error('부분 응답 가져오기 실패:', error);
          }
        }
        
        // 업데이트 간격을 줄임
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // 최종 메시지 가져오기
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
          
          const assistantContent = latestMessage.content[0].text.value;
          
          // 타이핑 효과를 위해 상태 설정
          if (streamingResponse !== assistantContent) {
            setStreamingResponse(assistantContent);
            setPendingAssistantMessage(assistantContent);
          }
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      alert('메시지 전송 중 오류가 발생했습니다.');
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  // 타이핑이 완료되면 메시지 목록에 추가
  useEffect(() => {
    if (isComplete && pendingAssistantMessage && displayedText === pendingAssistantMessage) {
      const assistantMessage: Message = {
        role: 'assistant',
        content: pendingAssistantMessage
      };
      
      setMessages(prevMessages => {
        const newMessages = [...prevMessages, assistantMessage];
        // onMessagesUpdate 호출은 새 메시지 배열로 직접 전달
        onMessagesUpdate?.(newMessages);
        return newMessages;
      });
      
      // 상태 초기화
      setPendingAssistantMessage(null);
      setStreamingResponse('');
      setIsStreaming(false);
      setIsLoading(false);
      
      // 입력창에 포커스 설정
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isComplete, pendingAssistantMessage, displayedText, onMessagesUpdate]);

  return (
    <div className="flex flex-col h-full">
      {/* 챗봇 헤더 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-t-xl shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 shadow-md">
            <i className="fas fa-robot text-white"></i>
          </div>
          <div>
            <h3 className="font-medium text-lg">책읽Go AI 선생님</h3>
            <p className="text-xs text-blue-100">개구리 왕자 이야기와 함께하는 독서 토론</p>
          </div>
          <div className="ml-auto flex space-x-2">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span className="text-xs">{isLoading ? '생각 중...' : '대화 준비 완료'}</span>
          </div>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto py-4 px-6 bg-gradient-to-b from-blue-50 to-white">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}
            >
              <div
                className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-tr-none'
                    : 'bg-white rounded-tl-none border border-gray-100'
                }`}
              >
                {message.role !== 'user' && (
                  <div className="flex items-center mb-2">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <i className="fas fa-robot text-blue-500 text-xs"></i>
                    </div>
                    <span className="text-xs font-medium text-blue-500">AI 선생님</span>
                  </div>
                )}
                <div className={`prose max-w-none ${message.role === 'user' ? 'text-white' : 'text-gray-700'}`}>
                  <ReactMarkdown>
                    {message.content}
                  </ReactMarkdown>
                </div>
                <div className="text-right mt-1">
                  <span className={`text-xs ${message.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}
          
          {/* 스트리밍 응답 표시 */}
          {isStreaming && (
            <div className="flex justify-start animate-fadeIn" ref={streamingRef}>
              <div className="max-w-[80%] p-4 rounded-2xl shadow-sm bg-white rounded-tl-none border border-gray-100">
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2 text-white text-xs">
                    AI
                  </div>
                  <span className="text-blue-500 font-medium text-sm">선생님</span>
                </div>
                <ReactMarkdown className="prose prose-sm max-w-none text-gray-700">
                  {displayedText}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {/* 로딩 표시 (스트리밍이 없을 때만) */}
          {isLoading && !isStreaming && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                  <i className="fas fa-robot text-blue-500 text-xs"></i>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150 mx-1"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-300"></div>
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="border-t border-gray-200 p-4 bg-white rounded-b-xl">
        <form onSubmit={handleSubmit} className="flex items-center">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 resize-none"
            rows={1}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && input.trim()) {
                  handleSubmit(e);
                }
              }
            }}
          ></textarea>
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="ml-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center shadow-md"
          >
            <span>{isLoading ? '전송 중' : '전송'}</span>
            <i className={`fas fa-paper-plane ml-2 ${isLoading ? 'opacity-0' : 'animate-slightBounce'}`}></i>
          </button>
        </form>
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slightBounce {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(3px); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-slightBounce {
          animation: slightBounce 1s infinite;
        }
        .typing-indicator {
          display: inline-flex;
          align-items: center;
        }
        .typing-indicator .dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: #3b82f6;
          margin: 0 1px;
          animation: typing 1.4s infinite both;
        }
        .typing-indicator .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-indicator .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-2px); }
          100% { opacity: 0.2; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 