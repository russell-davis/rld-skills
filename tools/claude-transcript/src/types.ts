export type { ContentBlock, Message, UserMessage, AssistantMessage } from "../../claude-jsonl/types.ts";
export type { JsonlRecord, SystemRecord, AiTitleRecord } from "../../claude-jsonl/types.ts";

export interface TranscriptOptions {
  includeThinking: boolean;
  fullThinking: boolean;
  includeToolOutput: boolean;
  expandSubagents: boolean;
  showHeader: boolean;
  agentMode: boolean;
  maxThinkingChars: number;
  maxToolOutputChars: number;
}

export const DEFAULT_OPTIONS: TranscriptOptions = {
  includeThinking: false,
  fullThinking: false,
  includeToolOutput: false,
  expandSubagents: true,
  showHeader: false,
  agentMode: false,
  maxThinkingChars: 300,
  maxToolOutputChars: 200,
};
