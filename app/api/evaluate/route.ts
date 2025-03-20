import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getOpenAIClient } from '@/utils/openai';

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const openai = getOpenAIClient();

    const evaluationPrompt = `당신은 아동 교육 전문가입니다. 다음 대화를 분석하여 학생의 학습 상태를 평가해주세요.
평가는 다음 항목에 대해 진행해주세요:

1. 독해력 (텍스트 이해도, 핵심 내용 파악 능력)
2. 논리적 사고 (추론 능력, 분석력)
3. 창의적 표현 (독창성, 표현력)
4. 참여도 (적극성, 열정)

각 항목에 대해:
- 1-10점 사이의 점수
- 구체적인 평가 내용
- 개선을 위한 제안

마지막으로, 전체적인 학습 상태에 대한 종합 평가와 향후 발전을 위한 조언을 제공해주세요.

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