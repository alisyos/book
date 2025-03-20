'use client';

import React, { useState } from 'react';
import { Message } from './ChatInterface';

interface EvaluationCriteria {
  category: string;
  score: number;
  evaluation: string;
  improvement: string;
}

interface StudentEvaluationProps {
  messages: Message[];
}

export default function StudentEvaluation({ messages }: StudentEvaluationProps) {
  const [evaluations, setEvaluations] = useState<EvaluationCriteria[]>([]);
  const [comment, setComment] = useState<string>('');
  const [isEvaluated, setIsEvaluated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // GPT를 사용한 메시지 분석 및 평가
  const analyzeMessages = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        throw new Error('평가 중 오류가 발생했습니다.');
      }

      const data = await response.json();
      const evaluationText = data.evaluation;

      // GPT 응답을 파싱하여 평가 결과 구조화
      const parsedEvaluation = parseGPTEvaluation(evaluationText);
      setEvaluations(parsedEvaluation.criteria);
      setComment(parsedEvaluation.overallComment);
      setIsEvaluated(true);
    } catch (error) {
      console.error('Error during evaluation:', error);
      alert('평가 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // GPT 응답 텍스트 파싱 함수
  const parseGPTEvaluation = (text: string) => {
    console.log("원본 평가 텍스트:", text);
    
    // 각 카테고리 정보를 저장할 배열
    const criteria: EvaluationCriteria[] = [];
    let overallComment = '';
    
    // 카테고리 이름 정의
    const categoryNames = ['독해력', '논리적 사고', '창의적 표현', '참여도'];
    
    // 텍스트를 줄 단위로 나누기
    const lines = text.split('\n');
    
    let currentCategory = '';
    let currentScore = 0;
    let currentEvaluation = '';
    let currentImprovement = '';
    let currentSection = ''; // 현재 어떤 섹션을 처리 중인지 (점수, 평가, 개선점, 종합)
    
    // 종합 평가 모드
    let isInOverallSection = false;
    
    // 각 라인 처리
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 빈 줄 무시
      if (!line) continue;
      
      // 카테고리 시작 감지 (1. 독해력, 2. 논리적 사고 등)
      if (/^\d+\.\s*(독해력|논리적 사고|창의적 표현|참여도)/.test(line)) {
        // 이전 카테고리 정보가 있으면 저장
        if (currentCategory && currentScore > 0) {
          criteria.push({
            category: currentCategory,
            score: currentScore,
            evaluation: currentEvaluation.trim(),
            improvement: currentImprovement.trim()
          });
          
          // 현재 카테고리 정보 초기화
          currentEvaluation = '';
          currentImprovement = '';
        }
        
        // 새 카테고리 설정
        for (const name of categoryNames) {
          if (line.includes(name)) {
            currentCategory = name;
            break;
          }
        }
        
        currentSection = ''; // 섹션 초기화
      }
      // 점수 감지
      else if (line.includes('점수:')) {
        const scoreMatch = line.match(/\d+/);
        if (scoreMatch) {
          currentScore = parseInt(scoreMatch[0], 10);
        }
        currentSection = 'score';
      }
      // 평가 섹션 시작
      else if (line === '평가:' || line.startsWith('평가:')) {
        currentSection = 'evaluation';
        // 평가: 라는 텍스트만 있는 경우 내용은 다음 줄부터 시작
        if (line === '평가:') continue;
        // 평가: 내용 형태로 같은 줄에 시작하는 경우
        currentEvaluation += line.replace('평가:', '').trim() + '\n';
      }
      // 개선점 섹션 시작
      else if (line === '개선점:' || line.startsWith('개선점:')) {
        currentSection = 'improvement';
        // 개선점: 라는 텍스트만 있는 경우 내용은 다음 줄부터 시작
        if (line === '개선점:') continue;
        // 개선점: 내용 형태로 같은 줄에 시작하는 경우
        currentImprovement += line.replace('개선점:', '').trim() + '\n';
      }
      // 종합 평가 섹션 시작
      else if (line.includes('종합 평가:') || line === '종합 평가') {
        // 이전 카테고리 정보 저장
        if (currentCategory && currentScore > 0) {
          criteria.push({
            category: currentCategory,
            score: currentScore,
            evaluation: currentEvaluation.trim(),
            improvement: currentImprovement.trim()
          });
        }
        
        isInOverallSection = true;
        currentSection = 'overall';
        
        // 종합 평가: 내용 형태로 같은 줄에 시작하는 경우
        if (line.includes('종합 평가:')) {
          overallComment += line.replace('종합 평가:', '').trim() + '\n';
        }
      }
      // 현재 섹션에 따라 내용 추가
      else {
        if (isInOverallSection) {
          overallComment += line + '\n';
        } else if (currentSection === 'evaluation') {
          currentEvaluation += line + '\n';
        } else if (currentSection === 'improvement') {
          currentImprovement += line + '\n';
        }
      }
    }
    
    // 마지막 카테고리가 저장되지 않았다면 저장
    if (currentCategory && currentScore > 0 && !isInOverallSection) {
      criteria.push({
        category: currentCategory,
        score: currentScore,
        evaluation: currentEvaluation.trim(),
        improvement: currentImprovement.trim()
      });
    }
    
    // 결과 로깅
    console.log("파싱된 평가 항목:", criteria);
    console.log("종합 평가:", overallComment);
    
    return {
      criteria,
      overallComment: overallComment.trim()
    };
  };

  return (
    <div className="bg-white shadow-lg rounded-lg p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">학습 평가</h2>
        <button
          onClick={analyzeMessages}
          disabled={messages.length === 0 || isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? '평가 중...' : '평가하기'}
        </button>
      </div>

      {!isEvaluated && !isLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          평가하기 버튼을 클릭하여 학습 평가를 시작하세요.
        </div>
      )}

      {isLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          학습 상태를 평가하고 있습니다...
        </div>
      )}

      {isEvaluated && !isLoading && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 mb-6">
              {evaluations.map((evaluation, index) => (
                <div key={index} className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold text-gray-700">{evaluation.category}</h3>
                    <div className="flex items-center">
                      <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-blue-600">{evaluation.score}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-600">평가</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{evaluation.evaluation}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-600">개선점</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{evaluation.improvement}</p>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 h-2 rounded-full">
                    <div
                      className="bg-blue-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${evaluation.score * 10}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-3">종합 평가</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 whitespace-pre-wrap">{comment}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 