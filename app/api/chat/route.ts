import { NextResponse } from 'next/server';
import { createThread, createMessage, runAssistant, getMessages, checkRunStatus } from '@/utils/openai';

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

      default:
        return NextResponse.json({ error: '지원하지 않는 액션입니다.' }, { status: 400 });
    }
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json({ error: '서버 에러가 발생했습니다.' }, { status: 500 });
  }
} 