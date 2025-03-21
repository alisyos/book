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
    <div className="flex flex-col h-full">
      {/* 평가 헤더 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-4 px-6 rounded-t-xl shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3 shadow-md">
            <i className="fas fa-chart-line text-white"></i>
          </div>
          <div>
            <h3 className="font-medium text-lg">학습 평가 리포트</h3>
            <p className="text-xs text-indigo-100">AI가 분석한 실시간 학습 상태 평가</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={analyzeMessages}
              disabled={messages.length === 0 || isLoading}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm font-medium shadow-md flex items-center"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  평가 중...
                </>
              ) : (
                <>
                  <i className="fas fa-brain mr-2"></i>
                  평가하기
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 평가 컨텐츠 영역 */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-purple-50 to-white p-6">
        {!isEvaluated && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <i className="fas fa-lightbulb text-indigo-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">학습 평가를 시작해보세요</h3>
            <p className="text-gray-500 max-w-md">
              대화가 충분히 진행된 후 평가하기 버튼을 클릭하여 AI가 분석한 학습 상태를 확인하세요.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-300 border-t-indigo-600 animate-spin"></div>
              <i className="fas fa-brain text-indigo-400 text-3xl"></i>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">학습 상태 분석 중</h3>
            <p className="text-gray-500 max-w-md">
              AI가 대화 내용을 분석하여 학습 상태를 평가하고 있습니다. 잠시만 기다려주세요.
            </p>
          </div>
        )}

        {isEvaluated && !isLoading && (
          <div className="animate-fadeIn">
            <div className="mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {evaluations.map((evaluation, index) => {
                  // 점수별 색상 설정
                  const getScoreColor = (score: number) => {
                    if (score >= 8) return 'from-green-500 to-green-600';
                    if (score >= 6) return 'from-blue-500 to-blue-600';
                    if (score >= 4) return 'from-yellow-500 to-yellow-600';
                    return 'from-red-500 to-red-600';
                  };
                  
                  return (
                    <div key={index} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-500">{evaluation.category}</h4>
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${getScoreColor(evaluation.score)} text-white flex items-center justify-center shadow-sm`}>
                          <span className="text-sm font-bold">{evaluation.score}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full mb-2">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getScoreColor(evaluation.score)} transition-all duration-1000`}
                          style={{ width: `${evaluation.score * 10}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="space-y-6">
              {evaluations.map((evaluation, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-white p-4 border-b border-gray-100">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                        <i className={`fas ${
                          index === 0 ? 'fa-book-reader' : 
                          index === 1 ? 'fa-brain' : 
                          index === 2 ? 'fa-paint-brush' : 
                          'fa-hands-helping'
                        } text-indigo-500 text-xs`}></i>
                      </div>
                      <h3 className="font-semibold text-gray-700">{evaluation.category}</h3>
                      <div className="ml-auto">
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-full text-xs font-medium">
                          {evaluation.score}/10점
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-indigo-600 mb-2 flex items-center">
                        <i className="fas fa-check-circle mr-1"></i> 평가
                      </h4>
                      <p className="text-gray-700 text-sm bg-indigo-50 p-3 rounded-lg whitespace-pre-wrap">{evaluation.evaluation}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-purple-600 mb-2 flex items-center">
                        <i className="fas fa-lightbulb mr-1"></i> 개선점
                      </h4>
                      <p className="text-gray-700 text-sm bg-purple-50 p-3 rounded-lg whitespace-pre-wrap">{evaluation.improvement}</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4 text-white">
                  <div className="flex items-center mb-1">
                    <i className="fas fa-star mr-2"></i>
                    <h3 className="text-lg font-semibold">종합 평가</h3>
                  </div>
                  <div className="h-1 w-24 bg-white bg-opacity-30 rounded-full"></div>
                </div>
                <div className="bg-white p-5">
                  <p className="text-gray-700 whitespace-pre-wrap">{comment}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
} 