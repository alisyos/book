import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY가 설정되지 않았습니다.');
}

if (!process.env.ASSISTANT_ID) {
  throw new Error('ASSISTANT_ID가 설정되지 않았습니다.');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // 클라이언트 사이드에서 사용하기 위한 설정
});

export const assistantId = process.env.ASSISTANT_ID;

export async function createThread() {
  try {
    const thread = await openai.beta.threads.create();
    return thread;
  } catch (error) {
    console.error('Thread 생성 중 에러:', error);
    throw error;
  }
}

export async function createMessage(threadId: string, content: string) {
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: content
    });
    return message;
  } catch (error) {
    console.error('메시지 생성 중 에러:', error);
    throw error;
  }
}

export async function runAssistant(threadId: string) {
  try {
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId as string
    });
    return run;
  } catch (error) {
    console.error('Assistant 실행 중 에러:', error);
    throw error;
  }
}

export async function getMessages(threadId: string) {
  try {
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
  } catch (error) {
    console.error('메시지 조회 중 에러:', error);
    throw error;
  }
}

export async function getPartialMessages(threadId: string) {
  try {
    // getMessages와 동일하지만, 진행 중인 응답도 가져옵니다
    const messages = await openai.beta.threads.messages.list(threadId);
    return messages.data;
  } catch (error) {
    console.error('부분 메시지 조회 중 에러:', error);
    throw error;
  }
}

export async function checkRunStatus(threadId: string, runId: string) {
  try {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    return run;
  } catch (error) {
    console.error('실행 상태 확인 중 에러:', error);
    throw error;
  }
}

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured');
  }

  return new OpenAI({
    apiKey: apiKey,
  });
};

export default openai; 