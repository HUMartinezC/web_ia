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

  readonly canGenerate = computed(() => this.topic().trim().length >= 3 && !this.isGenerating());

  setTopic(value: string): void {
    this.topic.set(value);
  }

  setDifficulty(value: Difficulty): void {
    this.difficulty.set(value);
  }

  async generateQuiz(): Promise<void> {
    const topic = this.topic().trim();

    if (topic.length < 3) {
      this.statusMessage.set('Enter a topic with at least 3 characters.');
      return;
    }

    this.isGenerating.set(true);
    this.statusMessage.set('Generating quiz with Hugging Face...');

    try {
      const quiz = await this.huggingFaceService.generateQuiz({
        topic,
        difficulty: this.difficulty()
      });

      this.generatedQuiz.set(quiz);
      this.modelStatus.set(quiz.source === 'huggingface' ? `Model: ${quiz.model}` : 'Model: local fallback ready');
      this.statusMessage.set(
        quiz.source === 'huggingface'
          ? 'Quiz generated with Hugging Face. Preview is ready.'
          : 'Hugging Face is not configured, so the local fallback preview was used.'
      );
    } catch (error) {
      this.statusMessage.set(error instanceof Error ? error.message : 'Unable to generate quiz.');
      this.modelStatus.set('Model: generation failed');
    } finally {
      this.isGenerating.set(false);
    }
  }
}