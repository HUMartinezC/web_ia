import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { HuggingfaceService } from '../../core/services/huggingface.service';
import { Difficulty, GeneratedQuiz } from '../../core/models/quiz.model';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generate.component.html',
  styleUrl: './generate.component.css'
})
export class GenerateComponent {
  private readonly huggingFaceService = inject(HuggingfaceService);

  readonly topic = signal('');
  readonly difficulty = signal<Difficulty>('normal');
  readonly isGenerating = signal(false);
  readonly generatedQuiz = signal<GeneratedQuiz | null>(null);
  readonly statusMessage = signal('Ready to generate a quiz preview.');
  readonly modelStatus = signal('Model: local fallback ready');
  readonly detectedQuestionCount = signal(5);
  readonly selectedAnswers = signal<number[]>([]);
  readonly isSubmitted = signal(false);
  readonly score = signal<number | null>(null);

  readonly canGenerate = computed(() => this.topic().trim().length >= 3 && !this.isGenerating());
  readonly canSubmit = computed(() => {
    const quiz = this.generatedQuiz();
    if (!quiz || this.isSubmitted()) {
      return false;
    }

    const answers = this.selectedAnswers();
    return answers.length === quiz.questions.length && answers.every((value) => value >= 0);
  });

  setTopic(value: string): void {
    this.topic.set(value);
    this.detectedQuestionCount.set(this.extractQuestionCount(value));
  }

  setDifficulty(value: Difficulty): void {
    this.difficulty.set(value);
  }

  async generateQuiz(): Promise<void> {
    const topicInput = this.topic().trim();
    const topic = this.extractTopic(topicInput);
    const questionCount = this.extractQuestionCount(topicInput);

    if (topic.length < 3 && topicInput.length < 3) {
      this.statusMessage.set('Enter a topic with at least 3 characters.');
      return;
    }

    this.isGenerating.set(true);
    this.statusMessage.set('Generating quiz with Hugging Face...');

    try {
      const quiz = await this.huggingFaceService.generateQuiz({
        topic: topic.length >= 3 ? topic : topicInput,
        difficulty: this.difficulty(),
        questionCount
      });

      this.generatedQuiz.set(quiz);
      this.selectedAnswers.set(Array(quiz.questions.length).fill(-1));
      this.isSubmitted.set(false);
      this.score.set(null);
      this.detectedQuestionCount.set(quiz.questions.length);
      this.modelStatus.set(quiz.source === 'huggingface' ? `Model: ${quiz.model}` : 'Model: local fallback ready');
      this.statusMessage.set(
        quiz.source === 'huggingface'
          ? `Quiz generated with Hugging Face (${quiz.questions.length} questions).`
          : `Hugging Face is not configured, so the local fallback preview was used (${quiz.questions.length} questions).`
      );
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to generate quiz.');
      this.modelStatus.set('Model: generation failed');
    } finally {
      this.isGenerating.set(false);
    }
  }

  selectAnswer(questionIndex: number, optionIndex: number): void {
    if (this.isSubmitted()) {
      return;
    }

    const answers = [...this.selectedAnswers()];
    answers[questionIndex] = optionIndex;
    this.selectedAnswers.set(answers);
  }

  submitQuiz(): void {
    const quiz = this.generatedQuiz();
    if (!quiz || !this.canSubmit()) {
      return;
    }

    const answers = this.selectedAnswers();
    const totalCorrect = quiz.questions.reduce(
      (count, question, index) => (answers[index] === question.correctIndex ? count + 1 : count),
      0
    );

    this.score.set(totalCorrect);
    this.isSubmitted.set(true);
    this.statusMessage.set(`Quiz submitted: ${totalCorrect}/${quiz.questions.length} correct.`);
  }

  resetAnswers(): void {
    const quiz = this.generatedQuiz();
    if (!quiz) {
      return;
    }

    this.selectedAnswers.set(Array(quiz.questions.length).fill(-1));
    this.isSubmitted.set(false);
    this.score.set(null);
    this.statusMessage.set('Answers reset. You can try again.');
  }

  isOptionSelected(questionIndex: number, optionIndex: number): boolean {
    return this.selectedAnswers()[questionIndex] === optionIndex;
  }

  getOptionState(questionIndex: number, optionIndex: number, correctIndex: number): 'selected' | 'correct' | 'incorrect' | 'default' {
    if (!this.isSubmitted()) {
      return this.isOptionSelected(questionIndex, optionIndex) ? 'selected' : 'default';
    }

    if (optionIndex === correctIndex) {
      return 'correct';
    }

    if (this.isOptionSelected(questionIndex, optionIndex) && optionIndex !== correctIndex) {
      return 'incorrect';
    }

    return 'default';
  }

  private extractQuestionCount(input: string): number {
    const match = input.match(/(\d{1,2})\s*(preguntas?|questions?)/i);
    if (!match) {
      return 5;
    }

    const parsed = Number(match[1]);
    if (Number.isNaN(parsed)) {
      return 5;
    }

    return Math.max(3, Math.min(30, parsed));
  }

  private extractTopic(input: string): string {
    const cleaned = input
      .replace(/crea(?:r)?\s+un\s+cuestionario\s+de\s+\d+\s+preguntas?\s+de\s+/i, '')
      .replace(/\d+\s*(preguntas?|questions?)/i, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

    return cleaned;
  }
}