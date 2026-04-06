import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Difficulty, GeneratedQuiz, QuizGenerationRequest, QuizQuestion } from '../models/quiz.model';

interface HuggingFaceChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

@Injectable({ providedIn: 'root' })
export class HuggingfaceService {
  private readonly httpClient = inject(HttpClient);
  private readonly modelId = environment.huggingFace.model;
  private readonly routerUrl = 'https://router.huggingface.co/v1/chat/completions';

  async generateQuiz(request: QuizGenerationRequest): Promise<GeneratedQuiz> {
    const questionCount = this.normalizeQuestionCount(request.questionCount);

    if (!environment.huggingFace.enabled || !environment.huggingFace.apiToken) {
      return this.buildLocalQuiz(request.topic, request.difficulty, questionCount);
    }

    const messages = this.buildMessages(request.topic, request.difficulty, questionCount);
    const headers = new HttpHeaders({
      Authorization: `Bearer ${environment.huggingFace.apiToken}`,
      'Content-Type': 'application/json'
    });

    try {
      const response = await firstValueFrom(
        this.httpClient.post<HuggingFaceChatResponse>(
          this.routerUrl,
          {
            model: this.modelId,
            messages,
            temperature: 0.2,
            max_tokens: this.getMaxTokens(questionCount),
            response_format: { type: 'json_object' }
          },
          { headers }
        )
      );

      const generatedText = this.extractGeneratedText(response);

      if (!generatedText.trim()) {
        throw new Error('Hugging Face returned an empty response payload.');
      }

      const parsedQuiz = this.parseQuizResponse(generatedText, request.topic, request.difficulty, questionCount);

      return {
        ...parsedQuiz,
        source: 'huggingface',
        model: this.modelId
      };
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  private buildMessages(
    topic: string,
    difficulty: Difficulty,
    questionCount: number
  ): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content:
          'You are a quiz generator. Return ONLY valid JSON with this schema: {"questions":[{"question":string,"options":string[4],"correctIndex":number}]}. No markdown or commentary.'
      },
      {
        role: 'user',
        content: `Generate a ${difficulty} quiz about "${topic}" with exactly ${questionCount} multiple-choice questions.`
      }
    ];
  }

  private extractGeneratedText(response: HuggingFaceChatResponse): string {
    return response.choices?.[0]?.message?.content ?? '';
  }

  private parseQuizResponse(
    text: string,
    topic: string,
    difficulty: Difficulty,
    questionCount: number
  ): GeneratedQuiz {
    const jsonText = this.extractJsonPayload(text);

    if (!jsonText) {
      throw new Error('Hugging Face returned a non-JSON answer.');
    }

    try {
      const parsed = JSON.parse(jsonText) as {
        questions?: unknown[];
        quiz?: unknown[];
        items?: unknown[];
      };

      const rawQuestions = this.extractRawQuestions(parsed);
      const questions = rawQuestions.slice(0, questionCount).map((question, index) =>
        this.normalizeQuestion(question, topic, index)
      );

      if (!questions.length) {
        throw new Error('Hugging Face returned JSON without valid questions.');
      }

      return {
        topic,
        difficulty,
        questions,
        source: 'huggingface',
        model: this.modelId
      };
    } catch {
      throw new Error('Unable to parse quiz JSON from Hugging Face response.');
    }
  }

  private normalizeQuestionCount(value: number | undefined): number {
    if (!value || Number.isNaN(value)) {
      return 5;
    }

    return Math.max(3, Math.min(30, Math.floor(value)));
  }

  private getMaxTokens(questionCount: number): number {
    const estimated = questionCount * 220;
    return Math.max(900, Math.min(6000, estimated));
  }

  private extractRawQuestions(parsed: { questions?: unknown[]; quiz?: unknown[]; items?: unknown[] }): unknown[] {
    if (Array.isArray(parsed.questions)) {
      return parsed.questions;
    }

    if (Array.isArray(parsed.quiz)) {
      return parsed.quiz;
    }

    if (Array.isArray(parsed.items)) {
      return parsed.items;
    }

    return [];
  }

  private normalizeQuestion(rawQuestion: unknown, topic: string, questionIndex: number): QuizQuestion {
    if (typeof rawQuestion === 'string') {
      return this.buildQuestionWithFallbackOptions(rawQuestion, topic, questionIndex);
    }

    if (!rawQuestion || typeof rawQuestion !== 'object') {
      return this.buildQuestionWithFallbackOptions(
        `Question ${questionIndex + 1}: ${topic}`,
        topic,
        questionIndex
      );
    }

    const asRecord = rawQuestion as Record<string, unknown>;
    const questionText = this.readQuestionText(asRecord, questionIndex, topic);
    const options = this.readOptions(asRecord, questionText, topic, questionIndex);
    const correctIndex = this.readCorrectIndex(asRecord, options, questionIndex);

    return {
      question: questionText,
      options,
      correctIndex
    };
  }

  private readQuestionText(source: Record<string, unknown>, index: number, topic: string): string {
    const candidate =
      this.asNonEmptyString(source['question']) ??
      this.asNonEmptyString(source['prompt']) ??
      this.asNonEmptyString(source['text']) ??
      this.asNonEmptyString(source['statement']);

    return candidate ?? `Question ${index + 1}: ${topic}`;
  }

  private readOptions(
    source: Record<string, unknown>,
    questionText: string,
    topic: string,
    questionIndex: number
  ): string[] {
    const rawOptions =
      source['options'] ??
      source['choices'] ??
      source['answers'] ??
      source['alternatives'];

    let options = this.parseOptions(rawOptions);

    if (!options.length) {
      options = this.extractInlineOptions(questionText);
    }

    return this.ensureFourOptions(options, topic, questionIndex);
  }

  private parseOptions(rawOptions: unknown): string[] {
    if (Array.isArray(rawOptions)) {
      return rawOptions
        .map((option) => this.asNonEmptyString(option))
        .filter((option): option is string => Boolean(option));
    }

    if (rawOptions && typeof rawOptions === 'object') {
      return Object.values(rawOptions)
        .map((option) => this.asNonEmptyString(option))
        .filter((option): option is string => Boolean(option));
    }

    if (typeof rawOptions === 'string') {
      return rawOptions
        .split(/\n|\||;|,/) 
        .map((part) => part.replace(/^[A-D][\).:\-]\s*/i, '').trim())
        .filter((part) => part.length > 0);
    }

    return [];
  }

  private extractInlineOptions(questionText: string): string[] {
    const optionMatches = questionText.match(/[A-D][\).]\s*([^A-D]+)(?=\s+[A-D][\).]|$)/gi);

    if (!optionMatches) {
      return [];
    }

    return optionMatches
      .map((entry) => entry.replace(/^[A-D][\).]\s*/i, '').trim())
      .filter((entry) => entry.length > 0);
  }

  private ensureFourOptions(options: string[], topic: string, questionIndex: number): string[] {
    const normalized = options
      .map((option) => option.trim())
      .filter((option) => option.length > 0)
      .slice(0, 4);

    while (normalized.length < 4) {
      normalized.push(`${topic} option ${String.fromCharCode(65 + normalized.length)}-${questionIndex + 1}`);
    }

    return normalized;
  }

  private readCorrectIndex(source: Record<string, unknown>, options: string[], fallbackIndex: number): number {
    const rawCorrect = source['correctIndex'] ?? source['correct'] ?? source['answer'] ?? source['rightAnswer'];

    if (typeof rawCorrect === 'number') {
      return this.resolveCorrectIndex(rawCorrect, fallbackIndex);
    }

    if (typeof rawCorrect === 'string') {
      const numericValue = Number(rawCorrect);
      if (!Number.isNaN(numericValue)) {
        return this.resolveCorrectIndex(numericValue, fallbackIndex);
      }

      const letterValue = rawCorrect.trim().toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(letterValue)) {
        return this.resolveCorrectIndex(letterValue.charCodeAt(0) - 65, fallbackIndex);
      }

      const matchedIndex = options.findIndex(
        (option) => option.toLowerCase() === rawCorrect.trim().toLowerCase()
      );

      if (matchedIndex >= 0) {
        return matchedIndex;
      }
    }

    return this.resolveCorrectIndex(fallbackIndex, fallbackIndex);
  }

  private buildQuestionWithFallbackOptions(text: string, topic: string, questionIndex: number): QuizQuestion {
    const questionText = text.trim() || `Question ${questionIndex + 1}: ${topic}`;

    return {
      question: questionText,
      options: this.ensureFourOptions([], topic, questionIndex),
      correctIndex: questionIndex % 4
    };
  }

  private asNonEmptyString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private extractJsonPayload(text: string): string | null {
    const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return fencedMatch[1].trim();
    }

    const objectStart = text.indexOf('{');
    const objectEnd = text.lastIndexOf('}');

    if (objectStart >= 0 && objectEnd > objectStart) {
      return text.slice(objectStart, objectEnd + 1).trim();
    }

    return null;
  }

  private resolveCorrectIndex(correctIndex: number | undefined, fallbackIndex: number): number {
    if (typeof correctIndex === 'number' && correctIndex >= 0 && correctIndex <= 3) {
      return correctIndex;
    }

    return fallbackIndex % 4;
  }

  private getReadableErrorMessage(error: unknown): string {
    if (error instanceof Error && !(error instanceof HttpErrorResponse)) {
      return error.message;
    }

    if (error instanceof HttpErrorResponse) {
      if (error.status === 0) {
        return 'Request blocked (possible CORS/network error). Use a backend proxy or server-side call to Hugging Face.';
      }

      if (error.status === 401 || error.status === 403) {
        return 'Hugging Face authentication failed. Check the API token in the environment configuration.';
      }

      if (error.status === 429) {
        return 'Hugging Face rate limit reached. Try again in a moment.';
      }

      if (error.status === 404) {
        return `Model not found or unavailable for this endpoint: ${this.modelId}.`;
      }

      return `Hugging Face request failed with status ${error.status}.`;
    }

    return 'Unexpected Hugging Face error.';
  }

  private buildLocalQuiz(topic: string, difficulty: Difficulty, questionCount: number): GeneratedQuiz {
    return {
      topic,
      difficulty,
      source: 'local',
      model: 'local-fallback',
      questions: Array.from({ length: questionCount }, (_, index) =>
        this.createQuestion(topic, difficulty, index + 1)
      )
    };
  }

  private createQuestion(topic: string, difficulty: Difficulty, index: number): QuizQuestion {
    const focusByDifficulty: Record<Difficulty, string> = {
      easy: 'basic ideas',
      normal: 'core concepts',
      hard: 'advanced details'
    };

    const focus = focusByDifficulty[difficulty];
    const topicLabel = topic.charAt(0).toUpperCase() + topic.slice(1);

    return {
      question: `Question ${index}: What best describes ${topicLabel} when focusing on ${focus}?`,
      options: [
        `${topicLabel} option A`,
        `${topicLabel} option B`,
        `${topicLabel} option C`,
        `${topicLabel} option D`
      ],
      correctIndex: (index - 1) % 4
    };
  }
}