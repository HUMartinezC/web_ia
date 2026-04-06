import { Injectable } from '@angular/core';

import { GeneratedQuiz, QuizSession } from '../models/quiz.model';

const STORAGE_KEY = 'edupravia.quiz.sessions.v1';
const LEGACY_STORAGE_KEYS = [
  'preguntia.quiz.sessions.v1',
  'trivora.quiz.sessions.v1',
  'quizai.quiz.sessions.v1'
];

@Injectable({ providedIn: 'root' })
export class QuizSessionService {
  private sessions: Record<string, QuizSession> = this.loadSessions();

  getAllSessions(): QuizSession[] {
    return Object.values(this.sessions)
      .map((session) => this.normalizeSession(session))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  createSession(quiz: GeneratedQuiz): QuizSession {
    const id = this.generateId();

    const session: QuizSession = {
      id,
      quiz,
      answers: Array(quiz.questions.length).fill(-1),
      currentQuestionIndex: 0,
      isSubmitted: false,
      score: null,
      updatedAt: new Date().toISOString()
    };

    this.sessions[id] = session;
    this.persistSessions();

    return session;
  }

  getSession(id: string): QuizSession | null {
    const session = this.sessions[id];
    if (!session) {
      return null;
    }

    return this.normalizeSession(session);
  }

  selectAnswer(id: string, questionIndex: number, optionIndex: number): QuizSession | null {
    const session = this.getSession(id);
    if (!session || session.isSubmitted) {
      return session;
    }

    const answers = [...session.answers];
    answers[questionIndex] = optionIndex;

    return this.updateSession(id, {
      answers,
      updatedAt: new Date().toISOString()
    });
  }

  setCurrentQuestion(id: string, questionIndex: number): QuizSession | null {
    const session = this.getSession(id);
    if (!session) {
      return null;
    }

    const boundedIndex = Math.max(0, Math.min(questionIndex, session.quiz.questions.length - 1));

    return this.updateSession(id, {
      currentQuestionIndex: boundedIndex,
      updatedAt: new Date().toISOString()
    });
  }

  submitSession(id: string): QuizSession | null {
    const session = this.getSession(id);
    if (!session) {
      return null;
    }

    const score = session.quiz.questions.reduce(
      (count, question, index) => (session.answers[index] === question.correctIndex ? count + 1 : count),
      0
    );

    return this.updateSession(id, {
      isSubmitted: true,
      score,
      updatedAt: new Date().toISOString()
    });
  }

  resetSession(id: string): QuizSession | null {
    const session = this.getSession(id);
    if (!session) {
      return null;
    }

    return this.updateSession(id, {
      answers: Array(session.quiz.questions.length).fill(-1),
      currentQuestionIndex: 0,
      isSubmitted: false,
      score: null,
      updatedAt: new Date().toISOString()
    });
  }

  deleteSession(id: string): boolean {
    if (!this.sessions[id]) {
      return false;
    }

    delete this.sessions[id];
    this.persistSessions();
    return true;
  }

  deleteAllSessions(): number {
    const count = Object.keys(this.sessions).length;
    if (!count) {
      return 0;
    }

    this.sessions = {};
    this.persistSessions();
    return count;
  }

  getCompletedTodayCount(): number {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const day = today.getDate();

    return Object.values(this.sessions)
      .map((session) => this.normalizeSession(session))
      .filter((session) => {
        if (!session.isSubmitted) {
          return false;
        }

        const updated = new Date(session.updatedAt);
        return (
          updated.getFullYear() === year &&
          updated.getMonth() === month &&
          updated.getDate() === day
        );
      }).length;
  }

  duplicateSession(id: string): QuizSession | null {
    const original = this.getSession(id);
    if (!original) {
      return null;
    }

    const cloned = this.createSession(original.quiz);
    return cloned;
  }

  private updateSession(id: string, patch: Partial<QuizSession>): QuizSession | null {
    const current = this.sessions[id];
    if (!current) {
      return null;
    }

    const next = this.normalizeSession({
      ...current,
      ...patch,
      id
    });

    this.sessions[id] = next;
    this.persistSessions();

    return next;
  }

  private normalizeSession(session: QuizSession): QuizSession {
    const questionCount = session.quiz.questions.length;
    const answers = Array.from({ length: questionCount }, (_, index) => {
      const value = session.answers[index];
      return typeof value === 'number' ? value : -1;
    });

    const inferredCategory = this.inferCategory(
      session.quiz.originalTopic ?? session.quiz.topic,
      session.quiz.questions.map((question) => question.question)
    );

    const category = (session.quiz.category ?? '').trim() || inferredCategory;
    const categories = Array.isArray(session.quiz.categories)
      ? session.quiz.categories.filter((item) => typeof item === 'string' && item.trim().length > 0)
      : [];

    let normalizedCategories = categories.length ? categories : [category];

    if (normalizedCategories.length === 1 && normalizedCategories[0] === 'General' && inferredCategory !== 'General') {
      normalizedCategories = [inferredCategory];
    }

    return {
      ...session,
      quiz: {
        ...session.quiz,
        category: normalizedCategories[0],
        categories: normalizedCategories
      },
      answers,
      currentQuestionIndex: Math.max(0, Math.min(session.currentQuestionIndex, questionCount - 1))
    };
  }

  private persistSessions(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
  }

  private loadSessions(): Record<string, QuizSession> {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    const rawSessions =
      localStorage.getItem(STORAGE_KEY) ??
      LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find((value) => value !== null) ??
      null;

    if (!rawSessions) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawSessions) as Record<string, QuizSession>;
      const source = parsed ?? {};
      const normalizedEntries = Object.entries(source).map(([id, session]) => [id, this.normalizeSession(session)]);
      const normalized = Object.fromEntries(normalizedEntries) as Record<string, QuizSession>;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      return {};
    }
  }

  private inferCategory(topic: string, hints: string[]): string {
    const normalizedTopic = this.normalizeText(topic);
    const normalizedHints = hints.map((hint) => this.normalizeText(hint)).join(' | ');
    const context = `${normalizedTopic} | ${normalizedHints}`;

    if (/(historia|guerra|imperio|revoluci|edad media|renacimiento)/.test(context)) {
      return 'Historia';
    }

    if (/(filosof|fisolof|platon|aristot|nietzsche|etica|metafisica|epistem)/.test(context)) {
      return 'Filosofia';
    }

    if (/(juego|juegos|videojuego|gaming|gamer|steam|playstation|xbox|nintendo|e-sports|esports)/.test(context)) {
      return 'Tecnologia';
    }

    if (/(program|software|inform|comput|internet|algorit|base de datos|codigo)/.test(context)) {
      return 'Tecnologia';
    }

    if (/(datos|data|analitica|analisis de datos|big data|machine learning|etl)/.test(context)) {
      return 'Datos';
    }

    if (/(espacio|space|cosmos|universo|galax|planeta|nasa|astronaut|orbita|estelar)/.test(context)) {
      return 'Ciencias';
    }

    if (/(ciencia|fisica|quimica|biologia|astronomia)/.test(context)) {
      return 'Ciencias';
    }

    if (/(matemat|algebra|calculo|estadistica)/.test(context)) {
      return 'Matematicas';
    }

    if (/(geografia|pais|capital|continente|mapa)/.test(context)) {
      return 'Geografia';
    }

    if (/(idioma|lengua|gramatica|ingles|espanol|frances)/.test(context)) {
      return 'Lengua';
    }

    if (/(negocio|empresa|marketing|finanzas|economia)/.test(context)) {
      return 'Negocios';
    }

    if (/(arte|pintura|musica|teatro|literatura|cine)/.test(context)) {
      return 'Arte';
    }

    return 'General';
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }

    return `quiz-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }
}