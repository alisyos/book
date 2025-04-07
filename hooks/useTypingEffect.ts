import { useState, useEffect, useRef } from 'react';

/**
 * 텍스트를 타이핑 효과로 표시하는 커스텀 훅
 * @param text 표시할 텍스트
 * @param typingSpeed 타이핑 속도 (밀리초)
 * @returns 타이핑 효과가 적용된 텍스트와 완료 여부
 */
export const useTypingEffect = (text: string, typingSpeed: number = 20) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const currentTextRef = useRef('');
  const timeoutRef = useRef<NodeJS.Timeout[]>([]);

  // 텍스트가 변경될 때마다 초기화
  useEffect(() => {
    // 이전 타이머 모두 제거
    timeoutRef.current.forEach(timer => clearTimeout(timer));
    timeoutRef.current = [];
    
    // 텍스트가 바뀌면 새로 시작
    if (text !== currentTextRef.current) {
      currentTextRef.current = text;
      setIsComplete(false);
      
      if (!text) {
        setDisplayedText('');
        setIsComplete(true);
        return;
      }
      
      // 청크 크기 계산 (텍스트 길이에 따라 조정)
      const chunkSize = Math.max(1, Math.floor(text.length / 50));
      let index = 0;
      
      const typeNextChunk = () => {
        if (index < text.length) {
          const nextIndex = Math.min(index + chunkSize, text.length);
          setDisplayedText(text.substring(0, nextIndex));
          index = nextIndex;
          
          const timer = setTimeout(typeNextChunk, typingSpeed);
          timeoutRef.current.push(timer);
        } else {
          setIsComplete(true);
        }
      };
      
      typeNextChunk();
    }
    
    return () => {
      timeoutRef.current.forEach(timer => clearTimeout(timer));
    };
  }, [text, typingSpeed]);

  return { displayedText, isComplete };
}; 