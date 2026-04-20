'use server';

import { getServerUserId } from '../auth';
import { saveCustomPrompt } from '../services/user-profile';

export async function SaveCustomInstructions({ text }: { text: string }) {
  if (!text || text.trim() === '') {
    throw new Error('Text field is empty!');
  }

  const id = await getServerUserId();
  if (!id) {
    throw new Error('Unauthorized request!');
  }

  try {
    await saveCustomPrompt({ userId: id, text: text.trim() });
  } catch (error) {
    console.error('Failed to save custom instructions:', error);
    throw new Error('Error on our side! Try again later');
  }
}
