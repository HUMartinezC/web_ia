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

const GENERATE_SESSION_KEY = 'edupravia.generate.session.v1';
const LEGACY_GENERATE_SESSION_KEYS = [
  'preguntia.generate.session.v1',
  'trivora.generate.session.v1',
  'quizai.generate.session.v1'
];

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
  readonly statusMessage = signal('Listo para generar una vista previa del quiz.');
  readonly modelStatus = signal('Modelo: modo local listo');
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
      this.statusMessage.set('Ingresa un tema de al menos 3 caracteres.');
      return;
    }

    this.generatedQuiz.set(null);
    this.activeSessionId.set(null);
    this.isGenerating.set(true);
    this.statusMessage.set('Generando quiz con Hugging Face...');
    this.modelStatus.set('Modelo: generando...');
    this.persistSession();

    try {
      const generatedQuiz = await this.huggingFaceService.generateQuiz({
        topic: topic.length >= 3 ? topic : topicInput,
        difficulty: this.difficulty(),
        questionCount
      });

      this.statusMessage.set('Generando portada...');

      const coverImageBase64 = await this.huggingFaceService.generateQuizImageBase64(generatedQuiz);
      const quiz: GeneratedQuiz = {
        ...generatedQuiz,
        coverImageBase64: coverImageBase64 ?? undefined
      };

      const session = this.quizSessionService.createSession(quiz);

      this.generatedQuiz.set(quiz);
      this.activeSessionId.set(session.id);
      this.detectedQuestionCount.set(quiz.questions.length);
      this.modelStatus.set(quiz.source === 'huggingface' ? `Modelo: ${quiz.model}` : 'Modelo: modo local listo');
      this.statusMessage.set(
        quiz.source === 'huggingface'
          ? `Quiz generado correctamente (${quiz.questions.length} preguntas).`
          : `Hugging Face no esta configurado, se uso el modo local (${quiz.questions.length} preguntas).`
      );
      this.persistSession();
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'No se pudo generar el quiz.');
      this.modelStatus.set('Modelo: fallo de generacion');
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

  difficultyLabel(value: Difficulty): string {
    if (value === 'easy') {
      return 'Facil';
    }

    if (value === 'hard') {
      return 'Dificil';
    }

    return 'Normal';
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

    const raw =
      localStorage.getItem(GENERATE_SESSION_KEY) ??
      LEGACY_GENERATE_SESSION_KEYS.map((key) => localStorage.getItem(key)).find((value) => value !== null) ??
      null;
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<GenerateSessionState>;
      const restoredQuiz = parsed.generatedQuiz ?? null;

      this.topic.set(parsed.topic ?? '');
      this.difficulty.set(parsed.difficulty ?? 'normal');
      this.generatedQuiz.set(restoredQuiz);
      this.statusMessage.set(parsed.statusMessage ?? 'Sesion restaurada.');
      this.modelStatus.set(parsed.modelStatus ?? 'Modelo: modo local listo');
      this.detectedQuestionCount.set(parsed.detectedQuestionCount ?? this.extractQuestionCount(parsed.topic ?? ''));
      this.activeSessionId.set(parsed.activeSessionId ?? null);
      localStorage.setItem(GENERATE_SESSION_KEY, raw);
    } catch {
      localStorage.removeItem(GENERATE_SESSION_KEY);
      LEGACY_GENERATE_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    }
  }
}