'use client';

import React, { useState } from 'react';
import { Message } from './ChatInterface';

interface EvaluationCriteria {
  category: string;
  score: number;
  description: string;
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
    const criteria: EvaluationCriteria[] = [];
    let overallComment = '';

    // 텍스트를 줄 단위로 분리
    const lines = text.split('\n');
    let currentCategory = '';
    let currentScore = 0;
    let currentDescription = '';
    let isInOverallSection = false;

    for (const line of lines) {
      if (line.match(/^[1-4]\. (독해력|논리적 사고|창의적 표현|참여도)/)) {
        // 새로운 카테고리 시작
        if (currentCategory) {
          criteria.push({
            category: currentCategory,
            score: currentScore,
            description: currentDescription.trim(),
          });
        }
        currentCategory = line.split('. ')[1].split(' ')[0];
        currentDescription = '';
      } else if (line.includes('점수:') || line.match(/^\d+\/10/)) {
        // 점수 추출
        const scoreMatch = line.match(/\d+/);
        if (scoreMatch) {
          currentScore = parseInt(scoreMatch[0], 10);
        }
      } else if (line.includes('전체적인 학습 상태') || line.includes('종합 평가')) {
        isInOverallSection = true;
        if (currentCategory) {
          criteria.push({
            category: currentCategory,
            score: currentScore,
            description: currentDescription.trim(),
          });
        }
      } else if (isInOverallSection) {
        overallComment += line + '\n';
      } else if (line.trim() && currentCategory) {
        currentDescription += line + '\n';
      }
    }

    return {
      criteria,
      overallComment: overallComment.trim(),
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
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">{evaluation.description}</p>
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