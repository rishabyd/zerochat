"use server";

import { getServerUserId } from "../auth";
import { saveCustomPrompt } from "../services/user-profile";

export async function SaveCutsomInstructions({ text }: { text: string }) {
  if (!text) {
    return { message: "Text field is empty!", success: false };
  }
  const id = await getServerUserId();
  if (!id) {
    return { message: "Unauthorized request!", success: false };
  }
  try {
    await saveCustomPrompt({ userId: id, text });
    return { message: "successfully saved", success: true };
  } catch (error) {
    return { message: "Error on our side! try again later", success: false };
  }
}
