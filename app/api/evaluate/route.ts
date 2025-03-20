import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOpenAIClient } from '@/utils/openai';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const openai = getOpenAIClient();

    // 메시지 역할별로 구분
    const userMessages = messages.filter((msg: any) => msg.role === 'user');
    const assistantMessages = messages.filter((msg: any) => msg.role === 'assistant');

    // 대화 내용을 역할별로 명확히 구분
    const conversationHistory = messages.map((msg: any, index: number) => {
      const roleLabel = msg.role === 'user' ? '학생' : 'AI 선생님';
      return `${roleLabel}: ${msg.content}`;
    }).join('\n');

    const evaluationPrompt = `당신은 아동 교육 전문가입니다. 다음 대화에서 오직 학생의 답변만 분석하여 학습 상태를 평가해주세요.
AI 선생님의 답변은 참고용으로만 사용하고, 학생의 답변만을 평가 대상으로 삼아주세요.

아래 형식을 정확히 지켜서 답변해주세요. 형식을 엄격하게 준수해야 합니다:

1. 독해력 (텍스트 이해도, 핵심 내용 파악 능력)
점수: [1-10 사이의 점수]
평가:
[학생의 독해력에 대한 평가]
개선점:
[독해력 향상을 위한 제안]

2. 논리적 사고 (추론 능력, 분석력)
점수: [1-10 사이의 점수]
평가:
[학생의 논리적 사고에 대한 평가]
개선점:
[논리적 사고 향상을 위한 제안]

3. 창의적 표현 (독창성, 표현력)
점수: [1-10 사이의 점수]
평가:
[학생의 창의적 표현에 대한 평가]
개선점:
[창의적 표현 향상을 위한 제안]

4. 참여도 (적극성, 열정)
점수: [1-10 사이의 점수]
평가:
[학생의 참여도에 대한 평가]
개선점:
[참여도 향상을 위한 제안]

종합 평가:
[전체적인 학습 상태에 대한 종합 평가 및 향후 발전을 위한 조언]

학생의 답변 수: ${userMessages.length}개
AI 선생님의 답변 수: ${assistantMessages.length}개

대화 내용:
${conversationHistory}`;

    console.log("평가 요청 프롬프트:", evaluationPrompt);

    const completion = await openai.chat.completions.create({
      messages: [{ role: 'user', content: evaluationPrompt }],
      model: 'gpt-4o',
      temperature: 0.7,
    });

    const evaluationResult = completion.choices[0].message.content;

    return NextResponse.json({ evaluation: evaluationResult });
  } catch (error) {
    console.error('Error during evaluation:', error);
    return NextResponse.json(
      { error: '평가 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 