import { z } from "zod";
import {
  ChatMessageType,
  PlaceholderMessageSchema,
  PromptChatMessageListSchema,
  PromptNameSchema,
  TextPromptContentSchema,
  COMMIT_MESSAGE_MAX_LENGTH,
  PromptType,
} from "@langfuse/shared";

type NewPromptFormValidationMessages = {
  chatMessageRequired: string;
  configJson: string;
  goLiveRequired: string;
  placeholderName: string;
};

const defaultValidationMessages: NewPromptFormValidationMessages = {
  chatMessageRequired: "Enter a chat message or remove the empty message",
  configJson: "Config needs to be valid JSON",
  goLiveRequired: "Enter whether the prompt should go live",
  placeholderName:
    "Placeholder name must start with a letter and contain only alphanumeric characters and underscores",
};

export function createNewPromptFormSchema(
  messages: NewPromptFormValidationMessages = defaultValidationMessages,
) {
  const NewPromptBaseSchema = z.object({
    name: PromptNameSchema,
    isActive: z.boolean({
      error: messages.goLiveRequired,
    }),
    config: z.string().refine(validateJson, messages.configJson),
    commitMessage: z
      .string()
      .trim()
      .max(COMMIT_MESSAGE_MAX_LENGTH)
      .transform((val) => (val === "" ? undefined : val))
      .optional(),
  });

  const NewChatPromptSchema = NewPromptBaseSchema.extend({
    type: z.literal(PromptType.Chat),
    chatPrompt: z
      .array(z.any())
      .refine(
        (chatMessages: Array<{ type?: ChatMessageType; content?: string }>) =>
          chatMessages.every((message) => {
            const isPlaceholder = message?.type === ChatMessageType.Placeholder;
            return (
              !isPlaceholder ||
              PlaceholderMessageSchema.safeParse(message).success
            );
          }),
        messages.placeholderName,
      )
      .refine(
        (chatMessages: Array<{ type?: ChatMessageType; content?: string }>) =>
          chatMessages.every((message) => {
            const isPlaceholder = message?.type === ChatMessageType.Placeholder;
            return isPlaceholder || Boolean(message?.content?.trim()?.length);
          }),
        messages.chatMessageRequired,
      ),
    textPrompt: z.string(),
  });

  const NewTextPromptSchema = NewPromptBaseSchema.extend({
    type: z.literal(PromptType.Text),
    chatPrompt: z.array(z.any()),
    textPrompt: TextPromptContentSchema,
  });

  return z.discriminatedUnion("type", [
    NewChatPromptSchema,
    NewTextPromptSchema,
  ]);
}

export const NewPromptFormSchema = createNewPromptFormSchema();
export type NewPromptFormSchemaType = z.infer<typeof NewPromptFormSchema>;

export const PromptVariantSchema = z.union([
  z.object({
    type: z.literal(PromptType.Chat),
    prompt: PromptChatMessageListSchema,
  }),
  z.object({
    type: z.literal(PromptType.Text),
    prompt: z.string(),
  }),
]);
export type PromptVariant = z.infer<typeof PromptVariantSchema>;

function validateJson(content: string): boolean {
  try {
    JSON.parse(content);

    return true;
  } catch (_e) {
    return false;
  }
}
