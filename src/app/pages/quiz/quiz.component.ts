import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { QuizSession } from '../../core/models/quiz.model';
import { QuizSessionService } from '../../core/services/quiz-session.service';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './quiz.component.html',
  styleUrl: './quiz.component.css'
})
export class QuizComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizSessionService = inject(QuizSessionService);

  readonly session = signal<QuizSession | null>(null);

  readonly currentQuestion = computed(() => {
    const currentSession = this.session();
    if (!currentSession) {
      return null;
    }

    return currentSession.quiz.questions[currentSession.currentQuestionIndex] ?? null;
  });

  readonly progress = computed(() => {
    const currentSession = this.session();
    if (!currentSession) {
      return 0;
    }

    return Math.round(((currentSession.currentQuestionIndex + 1) / currentSession.quiz.questions.length) * 100);
  });

  readonly isLastQuestion = computed(() => {
    const currentSession = this.session();
    if (!currentSession) {
      return false;
    }

    return currentSession.currentQuestionIndex === currentSession.quiz.questions.length - 1;
  });

  readonly currentAnswer = computed(() => {
    const currentSession = this.session();
    if (!currentSession) {
      return -1;
    }

    return currentSession.answers[currentSession.currentQuestionIndex] ?? -1;
  });

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');

      if (!id) {
        this.session.set(null);
        return;
      }

      this.session.set(this.quizSessionService.getSession(id));
    });
  }

  selectOption(optionIndex: number): void {
    const currentSession = this.session();
    if (!currentSession || currentSession.isSubmitted) {
      return;
    }

    const updated = this.quizSessionService.selectAnswer(
      currentSession.id,
      currentSession.currentQuestionIndex,
      optionIndex
    );

    if (updated) {
      this.session.set(updated);
    }
  }

  previousQuestion(): void {
    const currentSession = this.session();
    if (!currentSession || currentSession.currentQuestionIndex === 0) {
      return;
    }

    const updated = this.quizSessionService.setCurrentQuestion(
      currentSession.id,
      currentSession.currentQuestionIndex - 1
    );

    if (updated) {
      this.session.set(updated);
    }
  }

  nextOrSubmit(): void {
    const currentSession = this.session();
    if (!currentSession) {
      return;
    }

    const selected = currentSession.answers[currentSession.currentQuestionIndex] ?? -1;
    if (selected < 0) {
      return;
    }

    if (currentSession.currentQuestionIndex < currentSession.quiz.questions.length - 1) {
      const updated = this.quizSessionService.setCurrentQuestion(
        currentSession.id,
        currentSession.currentQuestionIndex + 1
      );

      if (updated) {
        this.session.set(updated);
      }

      return;
    }

    const submitted = this.quizSessionService.submitSession(currentSession.id);
    if (submitted) {
      this.session.set(submitted);
    }
  }

  resetQuiz(): void {
    const currentSession = this.session();
    if (!currentSession) {
      return;
    }

    const reset = this.quizSessionService.resetSession(currentSession.id);
    if (reset) {
      this.session.set(reset);
    }
  }

  goToGenerate(): void {
    this.router.navigate(['/generate']);
  }
}