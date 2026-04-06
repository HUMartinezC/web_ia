import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { QuizSession } from '../../core/models/quiz.model';
import { QuizSessionService } from '../../core/services/quiz-session.service';

interface CategoryStat {
  category: string;
  accuracy: number;
  sessions: number;
}

interface CategoryLegendItem extends CategoryStat {
  color: string;
}

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.css'
})
export class StatsComponent {
  private readonly quizSessionService = inject(QuizSessionService);

  readonly sessions = signal<QuizSession[]>([]);

  readonly completedSessions = computed(() => this.sessions().filter((session) => session.isSubmitted));
  readonly totalQuizzes = computed(() => this.completedSessions().length);

  readonly globalAccuracy = computed(() => {
    const completed = this.completedSessions();
    if (!completed.length) {
      return 0;
    }

    const totalCorrect = completed.reduce((sum, session) => sum + (session.score ?? 0), 0);
    const totalQuestions = completed.reduce((sum, session) => sum + session.quiz.questions.length, 0);

    return totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  });

  readonly currentStreak = computed(() => this.calculateStreak('current'));
  readonly bestStreak = computed(() => this.calculateStreak('best'));

  readonly categoryStats = computed(() => {
    const bucket: Record<string, { correct: number; total: number; sessions: number }> = {};

    for (const session of this.completedSessions()) {
      const category = this.resolveCategory(session);
      if (!bucket[category]) {
        bucket[category] = { correct: 0, total: 0, sessions: 0 };
      }

      bucket[category].correct += session.score ?? 0;
      bucket[category].total += session.quiz.questions.length;
      bucket[category].sessions += 1;
    }

    return Object.entries(bucket)
      .map(([category, values]) => ({
        category,
        sessions: values.sessions,
        accuracy: values.total ? Math.round((values.correct / values.total) * 100) : 0
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  });

  readonly categoryLegend = computed<CategoryLegendItem[]>(() =>
    this.categoryStats().map((item) => ({
      ...item,
      color: this.getCategoryColor(item.category)
    }))
  );

  constructor() {
    this.reloadStats();
  }

  reloadStats(): void {
    this.sessions.set(this.quizSessionService.getAllSessions());
  }

  trackByCategory(index: number, item: CategoryStat): string {
    return `${item.category}-${index}`;
  }

  getCategoryColor(category: string): string {
    const normalized = this.normalizeText(category);

    if (normalized.includes('historia')) {
      return '#e8ff1a';
    }

    if (normalized.includes('tecnologia') || normalized.includes('programacion') || normalized.includes('datos')) {
      return '#4ecdc4';
    }

    if (normalized.includes('ciencias') || normalized.includes('matematicas')) {
      return '#ff7a7a';
    }

    if (normalized.includes('arte') || normalized.includes('filosofia') || normalized.includes('lengua')) {
      return '#a975ff';
    }

    return '#8fa0bf';
  }

  private calculateStreak(mode: 'current' | 'best'): number {
    const completed = [...this.completedSessions()].sort(
      (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
    );

    if (!completed.length) {
      return 0;
    }

    let current = 0;
    let best = 0;

    for (const session of completed) {
      const ratio = (session.score ?? 0) / Math.max(session.quiz.questions.length, 1);
      const passed = ratio >= 0.7;

      if (passed) {
        current += 1;
        best = Math.max(best, current);
      } else {
        current = 0;
      }
    }

    return mode === 'current' ? current : best;
  }

  private classifyTopic(topic: string): string {
    const normalized = this.normalizeText(topic);

    if (/(historia|guerra|imperio|revoluci|edad media|renacimiento)/.test(normalized)) {
      return 'Historia';
    }

    if (/(filosof|fisolof|platon|aristot|nietzsche|etica|metafisica|epistem)/.test(normalized)) {
      return 'Filosofia';
    }

    if (/(program|software|inform|comput|ai|ia|internet|algorit|base de datos)/.test(normalized)) {
      return 'Tecnologia';
    }

    if (/(dato|data|analitica|big data|machine learning|etl)/.test(normalized)) {
      return 'Datos';
    }

    if (/(arte|pintura|musica|teatro|literatura|cine)/.test(normalized)) {
      return 'Arte';
    }

    if (/(geografia|pais|capital|continente|mapa)/.test(normalized)) {
      return 'Geografia';
    }

    if (/(ciencia|fisica|quimica|biologia|matemat|astronomia)/.test(normalized)) {
      return 'Ciencias';
    }

    return 'General';
  }

  private resolveCategory(session: QuizSession): string {
    const fromList = Array.isArray(session.quiz.categories)
      ? session.quiz.categories.find((item) => typeof item === 'string' && item.trim().length > 0) ?? ''
      : '';

    const raw = (fromList || session.quiz.category || '').trim();
    const normalized = this.normalizeCategoryLabel(raw);

    if (normalized) {
      return normalized;
    }

    return this.classifyTopic(session.quiz.originalTopic ?? session.quiz.topic);
  }

  private normalizeCategoryLabel(category: string): string {
    if (!category) {
      return '';
    }

    const normalized = this.normalizeText(category);

    if (normalized.includes('dato') || normalized.includes('data')) {
      return 'Datos';
    }

    if (normalized.includes('program')) {
      return 'Programacion';
    }

    if (normalized.includes('science') || normalized.includes('ciencia')) {
      return 'Ciencias';
    }

    if (normalized.includes('math') || normalized.includes('mate')) {
      return 'Matematicas';
    }

    if (normalized.includes('history') || normalized.includes('historia')) {
      return 'Historia';
    }

    if (normalized.includes('filosof') || normalized.includes('fisolof') || normalized.includes('philosophy')) {
      return 'Filosofia';
    }

    if (normalized.includes('geography') || normalized.includes('geografia')) {
      return 'Geografia';
    }

    if (normalized.includes('language') || normalized.includes('idioma') || normalized.includes('lengua')) {
      return 'Lengua';
    }

    if (normalized.includes('business') || normalized.includes('negocio') || normalized.includes('empresa')) {
      return 'Negocios';
    }

    if (normalized.includes('arte') || normalized.includes('music') || normalized.includes('literat')) {
      return 'Arte';
    }

    if (normalized.includes('tecno') || normalized.includes('comput') || normalized.includes('software')) {
      return 'Tecnologia';
    }

    if (normalized.includes('general')) {
      return 'General';
    }

    return '';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }
}