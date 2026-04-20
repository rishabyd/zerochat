// Chat state management types
export type ChatType = {
  error: string;
  thinking: boolean;
  stopResponse: boolean;
};

// Chat session configuration and input data
export type payloadType = {
  prompt: string;
  mode?: string;
  model?: string;
  chatMode?: 'agent' | 'simple';
};

// Message structure for sending to API
export type sendMessageType = {
  text: string;
};

// Database message structure for persistence
export interface DbChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'AI' | 'SYSTEM';
  content: string;
  createdAt: Date;
}

// Chat session information
export interface ChatSession {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
}

// User authentication and profile data
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
  lastActive: Date;
}

// Unified user profile shape used across app (cache, API, stores)
export interface UnifiedProfile {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
}

// Error handling types
export interface StreamingError {
  name?: string;
  message?: string;
  code?: number;
  response?: { status: number };
}
