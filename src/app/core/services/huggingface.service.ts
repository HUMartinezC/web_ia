import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
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

interface QuizMetadata {
  title: string;
  category: string;
  categories: string[];
  model: string;
}

interface HuggingFaceZeroShotResponse {
  labels?: string[];
  scores?: number[];
}

interface HuggingFaceImageJsonResponse {
  error?: string;
  estimated_time?: number;
  image?: string;
}

interface EducationalQuote {
  quote: string;
  author: string;
  source: 'huggingface' | 'local';
}

@Injectable({ providedIn: 'root' })
export class HuggingfaceService {
  private readonly httpClient = inject(HttpClient);
  private readonly directApiToken = environment.huggingFace.apiToken?.trim() ?? '';
  private readonly useServerProxy = environment.huggingFace.useServerProxy ?? false;
  private readonly proxyUrl = environment.huggingFace.proxyUrl ?? '/api/hf';
  private readonly canUseRemoteApi = environment.huggingFace.enabled && (this.useServerProxy || !!this.directApiToken);
  private readonly modelId = environment.huggingFace.model;
  private readonly classificationModelId = environment.huggingFace.classificationModel;
  private readonly imageModelId = environment.huggingFace.imageModel;
  private readonly routerUrl = this.useServerProxy
    ? `${this.proxyUrl}?target=chat`
    : 'https://router.huggingface.co/v1/chat/completions';
  private readonly classificationUrl = this.useServerProxy
    ? `${this.proxyUrl}?target=classification&model=${encodeURIComponent(this.classificationModelId)}`
    : `https://router.huggingface.co/hf-inference/models/${this.classificationModelId}`;
  private readonly imageUrl = this.useServerProxy
    ? `${this.proxyUrl}?target=image&model=${encodeURIComponent(this.imageModelId)}`
    : `https://router.huggingface.co/hf-inference/models/${this.imageModelId}`;
  private readonly classificationCandidates: Array<{ label: string; category: string }> = [
    { label: 'Tecnologia y videojuegos de PC', category: 'Tecnologia' },
    { label: 'Ciencias y espacio', category: 'Ciencias' },
    { label: 'Historia y civilizaciones', category: 'Historia' },
    { label: 'Filosofia y pensamiento critico', category: 'Filosofia' },
    { label: 'Matematicas y estadistica', category: 'Matematicas' },
    { label: 'Geografia y paises', category: 'Geografia' },
    { label: 'Lengua e idiomas', category: 'Lengua' },
    { label: 'Negocios y economia', category: 'Negocios' },
    { label: 'Arte y cultura', category: 'Arte' },
    { label: 'Datos y analitica', category: 'Datos' },
    { label: 'General', category: 'General' }
  ];

  async generateQuiz(request: QuizGenerationRequest): Promise<GeneratedQuiz> {
    const questionCount = this.normalizeQuestionCount(request.questionCount);

    if (!this.canUseRemoteApi) {
      return this.buildLocalQuiz(request.topic, request.difficulty, questionCount);
    }

    const headers = this.buildHuggingFaceHeaders();

    try {
      const parsedQuiz = await this.requestQuizWithModel(
        request.topic,
        request.difficulty,
        questionCount,
        headers,
        false
      );

      const metadata = await this.generateQuizMetadata(
        parsedQuiz.originalTopic ?? parsedQuiz.topic,
        request.difficulty,
        parsedQuiz.questions
      );

      return {
        ...parsedQuiz,
        topic: metadata.title,
        category: metadata.category,
        categories: metadata.categories,
        source: 'huggingface',
        model: `${this.modelId} + ${metadata.model}`
      };
    } catch (error) {
      throw new Error(this.getReadableErrorMessage(error));
    }
  }

  async generateQuizImageBase64(quiz: GeneratedQuiz): Promise<string | null> {
    if (
      !this.canUseRemoteApi ||
      !environment.huggingFace.imageEnabled ||
      !this.imageModelId
    ) {
      return null;
    }

    const headers = this.buildHuggingFaceHeaders();

    const prompt = this.buildImagePrompt(quiz);

    const imageHeaders = headers.set('Accept', 'image/png');

    try {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const result = await this.requestImageWithPossibleJson(prompt, imageHeaders);

        if (result.kind === 'image' && result.data) {
          return result.data;
        }

        if (result.kind === 'retry' && attempt < maxAttempts) {
          await this.delay(result.waitMs);
          continue;
        }

        break;
      }

      return null;
    } catch {
      return null;
    }
  }

  async generateEducationalQuote(topic: string = 'educacion'): Promise<EducationalQuote> {
    if (!this.canUseRemoteApi) {
      return this.buildLocalQuote(topic);
    }

    const headers = this.buildHuggingFaceHeaders();

    try {
      const response = await firstValueFrom(
        this.httpClient.post<HuggingFaceChatResponse>(
          this.routerUrl,
          {
            model: this.modelId,
            messages: this.buildQuoteMessages(topic),
            temperature: 0.75,
            max_tokens: 140,
            response_format: { type: 'json_object' }
          },
          { headers }
        )
      );

      const content = this.extractGeneratedText(response);
      const payload = this.extractJsonPayload(content);

      if (!payload) {
        return this.buildLocalQuote(topic);
      }

      const parsed = this.tryParseJsonDeep(payload) as { quote?: unknown; author?: unknown };
      const quote = this.sanitizeQuoteText(this.asNonEmptyString(parsed.quote));
      const author = this.sanitizeQuoteAuthor(this.asNonEmptyString(parsed.author));

      if (!quote) {
        return this.buildLocalQuote(topic);
      }

      return {
        quote,
        author,
        source: 'huggingface'
      };
    } catch {
      return this.buildLocalQuote(topic);
    }
  }

  private async requestImageWithPossibleJson(
    prompt: string,
    headers: HttpHeaders
  ): Promise<{ kind: 'image'; data: string | null } | { kind: 'retry'; waitMs: number } | { kind: 'none' }> {
    const response = await firstValueFrom(
      this.httpClient.post(this.imageUrl, { inputs: prompt }, { headers, responseType: 'blob', observe: 'response' })
    );

    return this.parseImageResponse(response);
  }

  private async parseImageResponse(
    response: HttpResponse<Blob>
  ): Promise<{ kind: 'image'; data: string | null } | { kind: 'retry'; waitMs: number } | { kind: 'none' }> {
    const blob = response.body;

    if (!blob || blob.size === 0) {
      return { kind: 'none' };
    }

    const contentType = response.headers.get('content-type') ?? blob.type ?? '';
    const normalizedType = contentType.toLowerCase();

    if (normalizedType.includes('application/json') || normalizedType.includes('text/json')) {
      const text = await blob.text();
      const parsed = this.tryParseJsonDeep(text) as HuggingFaceImageJsonResponse;

      if (typeof parsed?.image === 'string' && parsed.image.length > 0) {
        return {
          kind: 'image',
          data: parsed.image.startsWith('data:image/') ? parsed.image : `data:image/png;base64,${parsed.image}`
        };
      }

      if (typeof parsed?.estimated_time === 'number' && parsed.estimated_time > 0) {
        return { kind: 'retry', waitMs: Math.min(15000, Math.max(1200, Math.round(parsed.estimated_time * 1000))) };
      }

      if (typeof parsed?.error === 'string' && /loading|currently loading|warm|please try again/i.test(parsed.error)) {
        return { kind: 'retry', waitMs: 2500 };
      }

      return { kind: 'none' };
    }

    if (normalizedType.startsWith('image/')) {
      return { kind: 'image', data: await this.blobToBase64Resized(blob, 768, 0.8) };
    }

    // Some providers omit content-type headers for binary image payloads.
    return { kind: 'image', data: await this.blobToBase64Resized(blob, 768, 0.8) };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private buildHuggingFaceHeaders(extraHeaders?: Record<string, string>): HttpHeaders {
    const headersMap: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extraHeaders ?? {})
    };

    if (!this.useServerProxy && this.directApiToken) {
      headersMap['Authorization'] = `Bearer ${this.directApiToken}`;
    }

    return new HttpHeaders(headersMap);
  }

  private buildMessages(
    topic: string,
    difficulty: Difficulty,
    questionCount: number,
    strictSpanish: boolean
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const strictLanguageRule = strictSpanish
      ? 'Si usas palabras en otro idioma, la respuesta se considera invalida.'
      : 'Prioriza espanol neutro en toda la salida.';

    return [
      {
        role: 'system',
        content:
          `Eres un generador de cuestionarios. Responde SOLO JSON valido con este esquema: {"questions":[{"question":string,"options":string[4],"correctIndex":number}]}. Todas las preguntas y opciones deben estar en espanol. ${strictLanguageRule} Sin markdown ni comentarios.`
      },
      {
        role: 'user',
        content: `Genera un cuestionario de dificultad ${difficulty} sobre "${topic}" con exactamente ${questionCount} preguntas de opcion multiple y en espanol.`
      }
    ];
  }

  private async requestQuizWithModel(
    topic: string,
    difficulty: Difficulty,
    questionCount: number,
    headers: HttpHeaders,
    strictSpanish: boolean
  ): Promise<GeneratedQuiz> {
    const messages = this.buildMessages(topic, difficulty, questionCount, strictSpanish);

    const response = await firstValueFrom(
      this.httpClient.post<HuggingFaceChatResponse>(
        this.routerUrl,
        {
          model: this.modelId,
          messages,
          temperature: strictSpanish ? 0.1 : 0.2,
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

    return this.parseQuizResponse(generatedText, topic, difficulty, questionCount);
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
    try {
      const parsed = this.parseQuizContainer(text);

      const rawQuestions = this.extractRawQuestions(parsed);
      const questions = rawQuestions.slice(0, questionCount).map((question, index) =>
        this.normalizeQuestion(question, topic, index)
      );

      if (!questions.length) {
        throw new Error('Hugging Face returned JSON without valid questions.');
      }

      return {
        topic,
        originalTopic: topic,
        category: 'General',
        categories: ['General'],
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

  private parseQuizContainer(text: string): { questions?: unknown[]; quiz?: unknown[]; items?: unknown[] } {
    const candidates: string[] = [];
    const trimmed = text.trim();

    if (trimmed) {
      candidates.push(trimmed);
    }

    const extracted = this.extractJsonPayload(trimmed);
    if (extracted && extracted !== trimmed) {
      candidates.push(extracted);
    }

    for (const candidate of candidates) {
      const parsed = this.tryParseJsonDeep(candidate);
      const container = this.extractQuizContainerFromUnknown(parsed);
      if (container) {
        return container;
      }
    }

    throw new Error('Hugging Face returned a non-JSON answer.');
  }

  private tryParseJsonDeep(value: unknown): unknown {
    let current = value;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (typeof current !== 'string') {
        return current;
      }

      const trimmed = current.trim();
      if (!trimmed) {
        return trimmed;
      }

      try {
        current = JSON.parse(trimmed);
      } catch {
        return current;
      }
    }

    return current;
  }

  private extractQuizContainerFromUnknown(
    value: unknown
  ): { questions?: unknown[]; quiz?: unknown[]; items?: unknown[] } | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const asRecord = value as Record<string, unknown>;
    if (Array.isArray(asRecord['questions']) || Array.isArray(asRecord['quiz']) || Array.isArray(asRecord['items'])) {
      return asRecord as { questions?: unknown[]; quiz?: unknown[]; items?: unknown[] };
    }

    const directContent = this.asNonEmptyString(asRecord['content']);
    if (directContent) {
      const nested = this.extractQuizContainerFromUnknown(this.tryParseJsonDeep(directContent));
      if (nested) {
        return nested;
      }
    }

    const messageValue = asRecord['message'];
    if (messageValue && typeof messageValue === 'object') {
      const messageContent = this.asNonEmptyString((messageValue as Record<string, unknown>)['content']);
      if (messageContent) {
        const nested = this.extractQuizContainerFromUnknown(this.tryParseJsonDeep(messageContent));
        if (nested) {
          return nested;
        }
      }
    }

    const choicesValue = asRecord['choices'];
    if (Array.isArray(choicesValue)) {
      for (const choice of choicesValue) {
        const nested = this.extractQuizContainerFromUnknown(choice);
        if (nested) {
          return nested;
        }
      }
    }

    return null;
  }

  private normalizeQuestion(rawQuestion: unknown, topic: string, questionIndex: number): QuizQuestion {
    if (typeof rawQuestion === 'string') {
      return this.buildQuestionWithFallbackOptions(rawQuestion, topic, questionIndex);
    }

    if (!rawQuestion || typeof rawQuestion !== 'object') {
      return this.buildQuestionWithFallbackOptions(
        `Pregunta ${questionIndex + 1}: ${topic}`,
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

    return candidate ?? `Pregunta ${index + 1}: ${topic}`;
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
      normalized.push(`${topic} opcion ${String.fromCharCode(65 + normalized.length)}-${questionIndex + 1}`);
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
    const questionText = text.trim() || `Pregunta ${questionIndex + 1}: ${topic}`;

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

  private async generateQuizMetadata(topic: string, difficulty: Difficulty, questions: QuizQuestion[]): Promise<QuizMetadata> {
    const fallbackTitle = this.buildDeterministicTitle(topic, difficulty);
    const fallbackCategory = this.classifyTopicCategory(topic);

    let title = fallbackTitle;
    let titleModel = 'title-fallback';
    let categories = [fallbackCategory];
    let categoryModel = 'classification-fallback';

    if (!this.canUseRemoteApi || !this.classificationModelId) {
      return {
        title,
        category: categories[0],
        categories,
        model: `${titleModel} + ${categoryModel}`
      };
    }

    const headers = this.buildHuggingFaceHeaders();

    try {
      title = await this.generateCreativeTitleFromQuiz(topic, difficulty, questions, headers);
      titleModel = this.modelId;
    } catch {
      title = fallbackTitle;
      titleModel = 'title-fallback';
    }

    try {
      categories = await this.classifyCategoriesWithBart(topic, questions, headers);
      categoryModel = this.classificationModelId;
    } catch {
      categories = [fallbackCategory];
      categoryModel = 'classification-fallback';
    }

    if (!categories.length) {
      categories = [fallbackCategory];
    }

    return {
      title,
      category: categories[0],
      categories,
      model: `${titleModel} + ${categoryModel}`
    };
  }

  private async generateCreativeTitleFromQuiz(
    topic: string,
    difficulty: Difficulty,
    questions: QuizQuestion[],
    headers: HttpHeaders
  ): Promise<string> {
    const response = await firstValueFrom(
      this.httpClient.post<HuggingFaceChatResponse>(
        this.routerUrl,
        {
          model: this.modelId,
          messages: this.buildCreativeTitleMessages(topic, difficulty, questions),
          temperature: 0.4,
          max_tokens: 220,
          response_format: { type: 'json_object' }
        },
        { headers }
      )
    );

    const text = this.extractGeneratedText(response);
    const payload = this.extractJsonPayload(text);

    if (!payload) {
      return this.buildDeterministicTitle(topic, difficulty);
    }

    const parsed = this.tryParseJsonDeep(payload) as { title?: unknown };
    return this.sanitizeGeneratedTitle(this.asNonEmptyString(parsed.title), topic, difficulty);
  }

  private buildCreativeTitleMessages(
    topic: string,
    difficulty: Difficulty,
    questions: QuizQuestion[]
  ): Array<{ role: 'system' | 'user'; content: string }> {
    const questionDigest = questions
      .slice(0, 5)
      .map((question, index) => `Q${index + 1}: ${question.question}`)
      .join(' | ');

    return [
      {
        role: 'system',
        content:
          'Eres un asistente creativo de titulacion. Devuelve SOLO JSON valido con esquema {"title":string}. El titulo debe estar en espanol, tener entre 3 y 6 palabras y reflejar el contenido real del quiz. Evita prefijos redundantes como "cuestionario sobre" o "test sobre".'
      },
      {
        role: 'user',
        content: `Tema original: "${topic}". Dificultad: ${difficulty}. Contenido del quiz: ${questionDigest}. Genera un titulo creativo y claro.`
      }
    ];
  }

  private async classifyCategoriesWithBart(
    topic: string,
    questions: QuizQuestion[],
    headers: HttpHeaders
  ): Promise<string[]> {
    const inputText = this.buildClassificationInput(topic, questions);
    const candidateLabels = this.classificationCandidates.map((item) => item.label);

    const response = await firstValueFrom(
      this.httpClient.post<HuggingFaceZeroShotResponse | HuggingFaceZeroShotResponse[]>(
        this.classificationUrl,
        {
          inputs: inputText,
          parameters: {
            candidate_labels: candidateLabels,
            multi_label: true
          }
        },
        { headers }
      )
    );

    const normalizedResponse = Array.isArray(response) ? response[0] : response;
    const labels = Array.isArray(normalizedResponse?.labels) ? normalizedResponse.labels : [];
    const scores = Array.isArray(normalizedResponse?.scores) ? normalizedResponse.scores : [];

    if (!labels.length) {
      return [this.classifyTopicCategory(topic)];
    }

    const ranked = labels
      .map((label, index) => ({ label, score: typeof scores[index] === 'number' ? scores[index] : 0 }))
      .sort((a, b) => b.score - a.score);

    const selected = ranked
      .filter((entry, index) => index === 0 || entry.score >= 0.25)
      .slice(0, 3)
      .map((entry) => this.mapCandidateLabelToCategory(entry.label));

    const categories = Array.from(new Set(selected)).filter((category) => category.length > 0);
    const inferred = this.classifyTopicCategory(topic);

    if (!categories.length) {
      return [inferred];
    }

    if (categories.length === 1 && categories[0] === 'General' && inferred !== 'General') {
      return [inferred];
    }

    return categories;
  }

  private mapCandidateLabelToCategory(label: string): string {
    const normalizedLabel = this.normalizeText(label);
    const found = this.classificationCandidates.find((item) => this.normalizeText(item.label) === normalizedLabel);
    if (found) {
      return found.category;
    }

    return this.sanitizeGeneratedCategory(label);
  }

  private buildClassificationInput(topic: string, questions: QuizQuestion[]): string {
    const sampleQuestions = questions
      .slice(0, 4)
      .map((question, index) => `Q${index + 1}: ${question.question}`)
      .join(' | ');

    return `Tema: ${topic}. Preguntas: ${sampleQuestions}`;
  }

  private buildImagePrompt(quiz: GeneratedQuiz): string {
    const hints = quiz.questions
      .slice(0, 3)
      .map((question) => question.question)
      .join(' | ');

    return [
      `Ilustracion educativa estilo retro escolar moderno sobre ${quiz.topic}.`,
      `Categoria: ${quiz.category}. Dificultad: ${quiz.difficulty}.`,
      `Elementos clave: ${hints}.`,
      'High detail, cinematic lighting, clean composition, no text, no watermark.'
    ].join(' ');
  }

  private buildQuoteMessages(topic: string): Array<{ role: 'system' | 'user'; content: string }> {
    return [
      {
        role: 'system',
        content:
          'Eres un generador de citas educativas. Devuelve SOLO JSON valido con esquema {"quote":string,"author":string}. La cita debe estar en espanol, ser inspiradora y centrada en aprendizaje, curiosidad, disciplina o pensamiento critico. El autor puede ser una figura historica real o una atribucion sintetica breve si no recuerdas una cita real. No uses markdown.'
      },
      {
        role: 'user',
        content: `Tema base: ${topic}. Genera una cita educativa breve para la portada de la aplicacion.`
      }
    ];
  }

  private buildLocalQuote(topic: string): EducationalQuote {
    const quotes: Array<{ quote: string; author: string }> = [
      { quote: 'Aprender es transformar curiosidad en conocimiento util.', author: 'Edupravia' },
      { quote: 'La educacion es el mapa mas fiable para explorar cualquier tema.', author: 'Edupravia' },
      { quote: 'Cada pregunta bien hecha abre una puerta nueva al entendimiento.', author: 'Edupravia' },
      { quote: 'La constancia convierte el estudio en progreso visible.', author: 'Edupravia' }
    ];

    const index = this.normalizeText(topic).length % quotes.length;
    const selected = quotes[index] ?? quotes[0];

    return {
      ...selected,
      source: 'local'
    };
  }

  private sanitizeQuoteText(value: string | null): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/^['"\s]+|['"\s]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private sanitizeQuoteAuthor(value: string | null): string {
    if (!value) {
      return 'Edupravia';
    }

    const cleaned = value.replace(/^[-–—\s]+|[-–—\s]+$/g, '').trim();
    return cleaned || 'Edupravia';
  }

  private blobToBase64Resized(blob: Blob, maxSize: number, quality: number): Promise<string | null> {
    if (typeof window === 'undefined') {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const objectUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        const scale = Math.min(1, maxSize / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          URL.revokeObjectURL(objectUrl);
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        const encoded = canvas.toDataURL('image/jpeg', quality);
        URL.revokeObjectURL(objectUrl);
        resolve(encoded);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(null);
      };

      image.src = objectUrl;
    });
  }

  private sanitizeGeneratedTitle(candidate: string | null, fallbackTopic: string, difficulty: Difficulty): string {
    const base = (candidate ?? fallbackTopic)
      .replace(/^((un|una)\s+)?(quiz|test|cuestionario|examen)\s*(sobre|de|about)?\s*/i, '')
      .replace(/\s+/g, ' ')
      .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, '')
      .trim();

    if (!base) {
      return this.buildDeterministicTitle(fallbackTopic || 'cultura general', difficulty);
    }

    const words = base.split(' ').filter((word) => word.length > 0);
    const trimmedWords = words.slice(0, 12);

    if (trimmedWords.length < 2) {
      return this.buildDeterministicTitle(fallbackTopic || base, difficulty);
    }

    const candidateTitle = trimmedWords.join(' ');

    if (candidateTitle.length < 10) {
      return this.buildDeterministicTitle(fallbackTopic || base, difficulty);
    }

    if (/\b(de|del|la|el|y|en|para|sobre|con|por)$/i.test(candidateTitle)) {
      return this.buildDeterministicTitle(fallbackTopic || base, difficulty);
    }

    return this.capitalizeSentence(candidateTitle);
  }

  private sanitizeGeneratedCategory(candidate: string | null): string {
    if (!candidate) {
      return 'General';
    }

    const normalized = this.normalizeText(candidate);

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

    if (
      normalized.includes('juego') ||
      normalized.includes('gaming') ||
      normalized.includes('gamer') ||
      normalized.includes('videojuego') ||
      normalized.includes('pc game')
    ) {
      return 'Tecnologia';
    }

    if (
      normalized.includes('espacio') ||
      normalized.includes('space') ||
      normalized.includes('astronomy') ||
      normalized.includes('astronomia') ||
      normalized.includes('cosmos') ||
      normalized.includes('universo')
    ) {
      return 'Ciencias';
    }

    return 'General';
  }

  private sanitizeGeneratedCategories(candidate: unknown, topic: string): string[] {
    const rawValues: string[] = [];

    if (Array.isArray(candidate)) {
      for (const value of candidate) {
        if (typeof value === 'string' && value.trim().length > 0) {
          rawValues.push(value.trim());
        }
      }
    } else if (typeof candidate === 'string') {
      rawValues.push(
        ...candidate
          .split(/,|\||;/)
          .map((part) => part.trim())
          .filter((part) => part.length > 0)
      );
    }

    const normalized = Array.from(
      new Set(
        rawValues
          .map((value) => this.sanitizeGeneratedCategory(value))
          .filter((value) => value.length > 0)
      )
    ).slice(0, 3);

    const inferred = this.classifyTopicCategory(topic);

    if (!normalized.length) {
      return [inferred];
    }

    if (normalized.length === 1 && normalized[0] === 'General' && inferred !== 'General') {
      return [inferred];
    }

    return normalized;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private capitalizeSentence(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return trimmed;
    }

    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }

  private buildDeterministicTitle(topic: string, difficulty: Difficulty): string {
    const cleanedTopic = topic.replace(/\s+/g, ' ').trim();
    const finalTopic = cleanedTopic || 'cultura general';
    const difficultyLabel: Record<Difficulty, string> = {
      easy: 'Facil',
      normal: 'Normal',
      hard: 'Avanzado'
    };

    const normalizedTopic = this.capitalizeSentence(
      finalTopic
        .replace(/^(quiz|test|cuestionario|examen)\s+(sobre|de|about)\s+/i, '')
        .replace(/\b(quiz|test|cuestionario|examen)\b\s*(sobre|de)?\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim()
    );

    return `Test ${difficultyLabel[difficulty]} ${normalizedTopic || 'Cultura general'}`.trim();
  }

  private classifyTopicCategory(topic: string): string {
    const normalized = this.normalizeText(topic);

    if (/(historia|guerra|imperio|revoluci|edad media|renacimiento)/.test(normalized)) {
      return 'Historia';
    }

    if (/(filosof|fisolof|platon|aristot|nietzsche|etica|metafisica|epistem)/.test(normalized)) {
      return 'Filosofia';
    }

    if (/(program|software|inform|comput|internet|algorit|base de datos|codigo)/.test(normalized)) {
      return 'Tecnologia';
    }

    if (/(juego|juegos|videojuego|gaming|gamer|steam|playstation|xbox|nintendo|pc\b|e-sports|esports)/.test(normalized)) {
      return 'Tecnologia';
    }

    if (/(datos|data|analitica|analisis de datos|big data|machine learning)/.test(normalized)) {
      return 'Datos';
    }

    if (/(arte|pintura|musica|teatro|literatura|cine)/.test(normalized)) {
      return 'Arte';
    }

    if (/(geografia|pais|capital|continente|mapa)/.test(normalized)) {
      return 'Geografia';
    }

    if (/(ciencia|fisica|quimica|biologia|astronomia)/.test(normalized)) {
      return 'Ciencias';
    }

    if (/(espacio|space|cosmos|universo|galax|planeta|nasa|astronaut|orbita|estelar)/.test(normalized)) {
      return 'Ciencias';
    }

    if (/(matemat|algebra|calculo|estadistica)/.test(normalized)) {
      return 'Matematicas';
    }

    if (/(idioma|lengua|gramatica|ingles|espanol|frances)/.test(normalized)) {
      return 'Lengua';
    }

    if (/(negocio|empresa|marketing|finanzas|economia)/.test(normalized)) {
      return 'Negocios';
    }

    return 'General';
  }

  private buildLocalQuiz(topic: string, difficulty: Difficulty, questionCount: number): GeneratedQuiz {
    const mainCategory = this.classifyTopicCategory(topic);

    return {
      topic: this.buildDeterministicTitle(topic, difficulty),
      originalTopic: topic,
      category: mainCategory,
      categories: [mainCategory],
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
      easy: 'ideas basicas',
      normal: 'conceptos clave',
      hard: 'detalles avanzados'
    };

    const focus = focusByDifficulty[difficulty];
    const topicLabel = this.capitalizeSentence(topic);

    return {
      question: `Pregunta ${index}: Que describe mejor ${topicLabel} al enfocarse en ${focus}?`,
      options: [
        `${topicLabel} opcion A`,
        `${topicLabel} opcion B`,
        `${topicLabel} opcion C`,
        `${topicLabel} opcion D`
      ],
      correctIndex: (index - 1) % 4
    };
  }
}