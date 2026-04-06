import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Difficulty, QuizSession } from '../../core/models/quiz.model';
import { QuizSessionService } from '../../core/services/quiz-session.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, DecimalPipe],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css'
})
export class HistoryComponent {
  private readonly router = inject(Router);
  private readonly quizSessionService = inject(QuizSessionService);

  readonly search = signal('');
  readonly difficultyFilter = signal<'all' | Difficulty>('all');
  readonly statusFilter = signal<'all' | 'in-progress' | 'completed'>('all');
  readonly categoryFilter = signal<'all' | string>('all');
  readonly sessions = signal<QuizSession[]>([]);

  readonly availableCategories = computed(() => {
    const categories = this.sessions().flatMap((session) => {
      if (Array.isArray(session.quiz.categories) && session.quiz.categories.length > 0) {
        return session.quiz.categories;
      }

      return [session.quiz.category || 'General'];
    });

    return Array.from(new Set(categories)).sort((a, b) => a.localeCompare(b));
  });

  readonly filteredSessions = computed(() => {
    const query = this.search().trim().toLowerCase();
    const difficulty = this.difficultyFilter();
    const status = this.statusFilter();
    const category = this.categoryFilter();

    return this.sessions().filter((session) => {
      if (difficulty !== 'all' && session.quiz.difficulty !== difficulty) {
        return false;
      }

      if (category !== 'all') {
        const categories = Array.isArray(session.quiz.categories) && session.quiz.categories.length > 0
          ? session.quiz.categories
          : [session.quiz.category || 'General'];

        if (!categories.includes(category)) {
          return false;
        }
      }

      if (status === 'completed' && !session.isSubmitted) {
        return false;
      }

      if (status === 'in-progress' && session.isSubmitted) {
        return false;
      }

      if (!query) {
        return true;
      }

      const categoriesText = (session.quiz.categories ?? [session.quiz.category]).join(' ').toLowerCase();
      return session.quiz.topic.toLowerCase().includes(query) || categoriesText.includes(query);
    });
  });

  readonly totalSessions = computed(() => this.sessions().length);
  readonly completedCount = computed(() => this.sessions().filter((session) => session.isSubmitted).length);
  readonly avgScore = computed(() => {
    const completed = this.sessions().filter((session) => session.isSubmitted && typeof session.score === 'number');
    if (!completed.length) {
      return 0;
    }

    const totalRatio = completed.reduce(
      (sum, session) => sum + (session.score ?? 0) / Math.max(session.quiz.questions.length, 1),
      0
    );

    return Math.round((totalRatio / completed.length) * 100);
  });

  constructor() {
    this.reloadSessions();
  }

  setSearch(value: string): void {
    this.search.set(value);
  }

  setDifficultyFilter(value: 'all' | Difficulty): void {
    this.difficultyFilter.set(value);
  }

  setStatusFilter(value: 'all' | 'in-progress' | 'completed'): void {
    this.statusFilter.set(value);
  }

  setCategoryFilter(value: 'all' | string): void {
    this.categoryFilter.set(value);
  }

  continueQuiz(sessionId: string): void {
    this.router.navigate(['/quiz', sessionId]);
  }

  repeatQuiz(sessionId: string): void {
    const duplicated = this.quizSessionService.duplicateSession(sessionId);
    if (!duplicated) {
      return;
    }

    this.reloadSessions();
    this.router.navigate(['/quiz', duplicated.id]);
  }

  deleteQuiz(sessionId: string): void {
    this.quizSessionService.deleteSession(sessionId);
    this.reloadSessions();
  }

  deleteAllQuizzes(): void {
    const total = this.sessions().length;
    if (!total) {
      return;
    }

    const confirmed = window.confirm(`Se eliminaran ${total} quizzes del historial. Esta accion no se puede deshacer.`);
    if (!confirmed) {
      return;
    }

    this.quizSessionService.deleteAllSessions();
    this.reloadSessions();
  }

  scorePercent(session: QuizSession): number {
    if (!session.isSubmitted || typeof session.score !== 'number') {
      return 0;
    }

    return Math.round((session.score / Math.max(session.quiz.questions.length, 1)) * 100);
  }

  answeredCount(session: QuizSession): number {
    return session.answers.filter((answer) => answer >= 0).length;
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

  private reloadSessions(): void {
    this.sessions.set(this.quizSessionService.getAllSessions());
  }
}