import {
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  extractVariables,
  Prisma,
  PromptContent,
  PromptType,
  stringifyValue,
} from "@langfuse/shared";
import {
  compileChatMessages,
  extractPlaceholderNames,
  type MessagePlaceholderValues,
  PromptContentSchema,
  type PromptMessage,
  PromptService,
  redis,
} from "@langfuse/shared/src/server";
import { prisma } from "@langfuse/shared/src/db";
import { compileTemplateString } from "../utils/utilities";

export type LangfusePromptForPromptfoo = {
  id: string;
  name: string;
  version: number;
  type: string;
  prompt: PromptContent;
  variables: string[];
  placeholderNames: string[];
};

function extractPromptVariables(prompt: LangfusePromptForPromptfoo) {
  const extractedVariables = extractVariables(
    prompt.type === PromptType.Text
      ? prompt.prompt.toString()
      : JSON.stringify(prompt.prompt),
  );

  return Array.from(
    new Set([...extractedVariables, ...prompt.placeholderNames]),
  );
}

function buildPlaceholderValues(
  itemInput: Record<string, unknown>,
  placeholderNames: string[],
): MessagePlaceholderValues {
  const placeholderValues: MessagePlaceholderValues = {};

  for (const placeholderName of placeholderNames) {
    if (!(placeholderName in itemInput)) {
      throw new Error(`Missing placeholder value for '${placeholderName}'`);
    }

    const rawValue = itemInput[placeholderName];
    const value =
      typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;

    if (!Array.isArray(value)) {
      throw new Error(`Placeholder '${placeholderName}' must be an array`);
    }

    placeholderValues[placeholderName] = value.map((message) => ({
      ...(message as Record<string, unknown>),
      type: ChatMessageType.PublicAPICreated as const,
    }));
  }

  return placeholderValues;
}

export function normalizePromptfooVars(
  itemInput: Prisma.JsonValue,
  variables: string[],
): Record<string, string> {
  if (typeof itemInput === "string" && variables.length === 1) {
    return { [variables[0]]: itemInput };
  }

  if (!itemInput || typeof itemInput !== "object" || Array.isArray(itemInput)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(itemInput)
      .filter(([key]) => variables.includes(key))
      .map(([key, value]) => [key, stringifyValue(value)]),
  );
}

export function compilePromptMessages(params: {
  prompt: LangfusePromptForPromptfoo;
  vars: Record<string, unknown>;
}): ChatMessage[] {
  const { prompt, vars } = params;
  const placeholderValues = buildPlaceholderValues(
    vars,
    prompt.placeholderNames,
  );
  const processContent = (content: string) => {
    const filteredContext = Object.fromEntries(
      Object.entries(vars).filter(
        ([key]) =>
          prompt.variables.includes(key) &&
          !prompt.placeholderNames.includes(key),
      ),
    );

    return content.includes("{{")
      ? compileTemplateString(content, filteredContext)
      : content;
  };

  if (typeof prompt.prompt === "string") {
    return [
      {
        role: ChatMessageRole.System,
        content: processContent(prompt.prompt),
        type: ChatMessageType.System as const,
      },
    ];
  }

  const compiledMessages = compileChatMessages(
    prompt.prompt as PromptMessage[],
    placeholderValues,
    {},
  );

  return compiledMessages.map((message) => ({
    ...message,
    ...(typeof message.content === "string" && {
      content: processContent(message.content),
    }),
    type: ChatMessageType.PublicAPICreated as const,
  }));
}

export class LangfusePromptAdapter {
  async getPrompts(params: {
    projectId: string;
    promptIds: string[];
  }): Promise<LangfusePromptForPromptfoo[]> {
    const promptService = new PromptService(prisma, redis);

    const prompts = await prisma.prompt.findMany({
      where: {
        projectId: params.projectId,
        id: { in: params.promptIds },
      },
    });

    const promptById = new Map(prompts.map((prompt) => [prompt.id, prompt]));

    return await Promise.all(
      params.promptIds.map(async (promptId) => {
        const rawPrompt = promptById.get(promptId);
        if (!rawPrompt) {
          throw new Error(`Prompt ${promptId} not found`);
        }

        const resolvedPrompt = await promptService.resolvePrompt(rawPrompt);
        if (!resolvedPrompt) {
          throw new Error(`Prompt ${promptId} not found`);
        }

        const promptContent = PromptContentSchema.parse(resolvedPrompt.prompt);
        const promptMessages =
          resolvedPrompt.type === PromptType.Chat &&
          Array.isArray(promptContent)
            ? (promptContent as PromptMessage[])
            : [];
        const placeholderNames = extractPlaceholderNames(promptMessages);
        const prompt: LangfusePromptForPromptfoo = {
          id: resolvedPrompt.id,
          name: resolvedPrompt.name,
          version: resolvedPrompt.version,
          type: resolvedPrompt.type,
          prompt: promptContent,
          variables: [],
          placeholderNames,
        };

        return {
          ...prompt,
          variables: extractPromptVariables(prompt),
        };
      }),
    );
  }
}
