import type { MessageKey } from "@/src/features/i18n";

export type QuestionType = "radio" | "text";

export interface BaseQuestion {
  id: string;
  type: QuestionType;
  questionKey: MessageKey;
  required?: boolean;
}

export interface SurveyOption {
  value: string;
  labelKey: MessageKey;
}

export interface RadioQuestion extends BaseQuestion {
  type: "radio";
  options: SurveyOption[];
}

export interface TextQuestion extends BaseQuestion {
  type: "text";
  placeholderKey?: MessageKey;
}

export type SurveyQuestion = RadioQuestion | TextQuestion;

export interface SurveyState {
  currentStep: number;
}

export type SurveyAction =
  | { type: "next" }
  | { type: "back" }
  | { type: "goToStep"; step: number };

export interface SurveyFormData {
  role?: string;
  signupReason?: string;
  referralSource?: string;
}

export interface SurveyStepProps {
  question: SurveyQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  onNext?: () => void;
  showNext?: boolean;
  isLast?: boolean;
}
