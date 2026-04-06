export type Difficulty = 'easy' | 'normal' | 'hard';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedQuiz {
  topic: string;
  originalTopic?: string;
  category: string;
  categories: string[];
  coverImageBase64?: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
  source: 'local' | 'huggingface';
  model: string;
}

export interface QuizGenerationRequest {
  topic: string;
  difficulty: Difficulty;
  questionCount?: number;
}

export interface QuizSession {
  id: string;
  quiz: GeneratedQuiz;
  answers: number[];
  currentQuestionIndex: number;
  isSubmitted: boolean;
  score: number | null;
  updatedAt: string;
}