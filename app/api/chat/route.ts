import { NextResponse } from 'next/server';
import { createThread, createMessage, runAssistant, getMessages, checkRunStatus, getPartialMessages } from '@/utils/openai';

export async function POST(req: Request) {
  try {
    const { action, threadId, content, runId } = await req.json();

    switch (action) {
      case 'createThread':
        const thread = await createThread();
        return NextResponse.json({ threadId: thread.id });

      case 'sendMessage':
        if (!threadId || !content) {
          return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }
        await createMessage(threadId, content);
        const run = await runAssistant(threadId);
        return NextResponse.json({ runId: run.id });

      case 'checkStatus':
        if (!threadId || !runId) {
          return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }
        const status = await checkRunStatus(threadId, runId);
        return NextResponse.json({ status });

      case 'getMessages':
        if (!threadId) {
          return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }
        const messages = await getMessages(threadId);
        return NextResponse.json({ messages });
        
      case 'getPartialResponse':
        if (!threadId || !runId) {
          return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 });
        }
        try {
          const partialResponse = await getPartialMessages(threadId);
          let content = '';
          
          // 가장 최근 메시지가 있고 내용이 있는 경우
          if (partialResponse.length > 0 && 
              partialResponse[0].role === 'assistant' && 
              partialResponse[0].content && 
              partialResponse[0].content[0] && 
              'text' in partialResponse[0].content[0]) {
            content = partialResponse[0].content[0].text.value;
            // 캐싱 방지를 위해 타임스탬프 추가
            return NextResponse.json({ 
              content, 
              timestamp: Date.now() 
            });
          }
          
          return NextResponse.json({ content, timestamp: Date.now() });
        } catch (error) {
          console.error('부분 응답 가져오기 실패:', error);
          return NextResponse.json({ content: '', timestamp: Date.now() });
        }

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
} 