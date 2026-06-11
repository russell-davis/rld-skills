export interface ContentBlock {
  type: string;
  text?: string;
  thinking?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string | ContentBlock[];
  is_error?: boolean;
  tool_use_id?: string;
  [k: string]: unknown;
}

export interface UserMessage {
  type: "user";
  message: {
    role: "user";
    content: string | ContentBlock[];
  };
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  isMeta?: boolean;
  [k: string]: unknown;
}

export interface AssistantMessage {
  type: "assistant";
  message: {
    role: "assistant";
    content: string | ContentBlock[];
  };
  sessionId?: string;
  uuid?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  [k: string]: unknown;
}

export interface AiTitleRecord {
  type: "ai-title";
  aiTitle: string;
  sessionId?: string;
  [k: string]: unknown;
}

export interface SystemRecord {
  type: "system";
  subtype?: string;
  content?: string;
  timestamp?: string;
  [k: string]: unknown;
}

export interface UnknownRecord {
  type: string;
  [k: string]: unknown;
}

export type JsonlRecord =
  | UserMessage
  | AssistantMessage
  | AiTitleRecord
  | SystemRecord
  | UnknownRecord;

export type Message = UserMessage | AssistantMessage;

export interface ExtractOptions {
  includeToolOutput: boolean;
  includeThinking: boolean;
  userOnly: boolean;
  assistantOnly: boolean;
  caseSensitive: boolean;
}
