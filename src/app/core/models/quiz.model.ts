export type Difficulty = 'easy' | 'normal' | 'hard';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface GeneratedQuiz {
  topic: string;
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