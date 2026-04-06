import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { HuggingfaceService } from '../../core/services/huggingface.service';
import { Difficulty, GeneratedQuiz } from '../../core/models/quiz.model';
import { QuizSessionService } from '../../core/services/quiz-session.service';

interface GenerateSessionState {
  topic: string;
  difficulty: Difficulty;
  generatedQuiz: GeneratedQuiz | null;
  statusMessage: string;
  modelStatus: string;
  detectedQuestionCount: number;
  activeSessionId: string | null;
}

const GENERATE_SESSION_KEY = 'quizai.generate.session.v1';

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generate.component.html',
  styleUrl: './generate.component.css'
})
export class GenerateComponent {
  private readonly huggingFaceService = inject(HuggingfaceService);
  private readonly quizSessionService = inject(QuizSessionService);
  private readonly router = inject(Router);

  readonly topic = signal('');
  readonly difficulty = signal<Difficulty>('normal');
  readonly isGenerating = signal(false);
  readonly generatedQuiz = signal<GeneratedQuiz | null>(null);
  readonly statusMessage = signal('Ready to generate a quiz preview.');
  readonly modelStatus = signal('Model: local fallback ready');
  readonly detectedQuestionCount = signal(5);
  readonly activeSessionId = signal<string | null>(null);

  readonly canGenerate = computed(() => this.topic().trim().length >= 3 && !this.isGenerating());
  readonly canStartQuiz = computed(() => Boolean(this.generatedQuiz() && this.activeSessionId()));

  constructor() {
    this.restoreSession();
  }

  setTopic(value: string): void {
    this.topic.set(value);
    this.detectedQuestionCount.set(this.extractQuestionCount(value));
    this.persistSession();
  }

  setDifficulty(value: Difficulty): void {
    this.difficulty.set(value);
    this.persistSession();
  }

  async generateQuiz(): Promise<void> {
    const topicInput = this.topic().trim();
    const topic = this.extractTopic(topicInput);
    const questionCount = this.extractQuestionCount(topicInput);

    if (topic.length < 3 && topicInput.length < 3) {
      this.statusMessage.set('Enter a topic with at least 3 characters.');
      return;
    }

    this.generatedQuiz.set(null);
    this.activeSessionId.set(null);
    this.isGenerating.set(true);
    this.statusMessage.set('Generating quiz with Hugging Face...');
    this.modelStatus.set('Model: generating...');
    this.persistSession();

    try {
      const generatedQuiz = await this.huggingFaceService.generateQuiz({
        topic: topic.length >= 3 ? topic : topicInput,
        difficulty: this.difficulty(),
        questionCount
      });

      this.statusMessage.set('Generating cover image...');

      const coverImageBase64 = await this.huggingFaceService.generateQuizImageBase64(generatedQuiz);
      const quiz: GeneratedQuiz = {
        ...generatedQuiz,
        coverImageBase64: coverImageBase64 ?? undefined
      };

      const session = this.quizSessionService.createSession(quiz);

      this.generatedQuiz.set(quiz);
      this.activeSessionId.set(session.id);
      this.detectedQuestionCount.set(quiz.questions.length);
      this.modelStatus.set(quiz.source === 'huggingface' ? `Model: ${quiz.model}` : 'Model: local fallback ready');
      this.statusMessage.set(
        quiz.source === 'huggingface'
          ? `Quiz generated and named with Hugging Face (${quiz.questions.length} questions).`
          : `Hugging Face is not configured, so the local fallback preview was used (${quiz.questions.length} questions).`
      );
      this.persistSession();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to generate quiz.');
      this.modelStatus.set('Model: generation failed');
      this.persistSession();
    } finally {
      this.isGenerating.set(false);
    }
  }

  startQuiz(): void {
    const sessionId = this.activeSessionId();

    if (!sessionId) {
      return;
    }

    this.router.navigate(['/quiz', sessionId]);
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

  private persistSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const session: GenerateSessionState = {
      topic: this.topic(),
      difficulty: this.difficulty(),
      generatedQuiz: this.generatedQuiz(),
      statusMessage: this.statusMessage(),
      modelStatus: this.modelStatus(),
      detectedQuestionCount: this.detectedQuestionCount(),
      activeSessionId: this.activeSessionId()
    };

    localStorage.setItem(GENERATE_SESSION_KEY, JSON.stringify(session));
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const raw = localStorage.getItem(GENERATE_SESSION_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<GenerateSessionState>;
      const restoredQuiz = parsed.generatedQuiz ?? null;

      this.topic.set(parsed.topic ?? '');
      this.difficulty.set(parsed.difficulty ?? 'normal');
      this.generatedQuiz.set(restoredQuiz);
      this.statusMessage.set(parsed.statusMessage ?? 'Session restored.');
      this.modelStatus.set(parsed.modelStatus ?? 'Model: local fallback ready');
      this.detectedQuestionCount.set(parsed.detectedQuestionCount ?? this.extractQuestionCount(parsed.topic ?? ''));
      this.activeSessionId.set(parsed.activeSessionId ?? null);
    } catch {
      localStorage.removeItem(GENERATE_SESSION_KEY);
    }
  }
}