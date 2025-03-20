import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOpenAIClient } from '@/utils/openai';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const openai = getOpenAIClient();

    const evaluationPrompt = `당신은 아동 교육 전문가입니다. 다음 대화를 분석하여 학생의 학습 상태를 평가해주세요.
아래 형식을 정확히 지켜서 답변해주세요. 형식을 엄격하게 준수해야 합니다:

1. 독해력 (텍스트 이해도, 핵심 내용 파악 능력)
점수: 7
평가:
학생은 텍스트의 주요 내용을 잘 파악하고 있습니다.

개선점:
좀 더 세부적인 내용에 주목하면 더 좋을 것 같습니다.

2. 논리적 사고 (추론 능력, 분석력)
점수: 8
평가:
학생은 논리적으로 문제를 분석하는 능력이 뛰어납니다.

개선점:
더 다양한 관점에서 생각해보는 연습을 하면 좋겠습니다.

3. 창의적 표현 (독창성, 표현력)
점수: 6
평가:
자신의 생각을 표현하는 데 어느 정도 능숙합니다.

개선점:
더 다양한 표현 방법을 시도해보면 좋겠습니다.

4. 참여도 (적극성, 열정)
점수: 9
평가:
대화에 매우 적극적으로 참여하고 있습니다.

개선점:
가끔 너무 빠르게 답변하려고 하는 경향이 있습니다.

종합 평가:
전반적으로 우수한 학습 태도를 보이고 있으며, 특히 참여도가 높습니다.

대화 내용:
${messages.map((msg: any) => `${msg.role}: ${msg.content}`).join('\\n')}`;

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