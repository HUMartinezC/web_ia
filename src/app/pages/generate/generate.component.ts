import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

type Difficulty = 'easy' | 'normal' | 'hard';

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface GeneratedQuiz {
  topic: string;
  difficulty: Difficulty;
  questions: QuizQuestion[];
}

@Component({
  selector: 'app-generate',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './generate.component.html',
  styleUrl: './generate.component.css'
})
export class GenerateComponent {
  readonly topic = signal('');
  readonly difficulty = signal<Difficulty>('normal');
  readonly isGenerating = signal(false);
  readonly generatedQuiz = signal<GeneratedQuiz | null>(null);
  readonly statusMessage = signal('Ready to generate a quiz preview.');

  readonly canGenerate = computed(() => this.topic().trim().length >= 3 && !this.isGenerating());

  setTopic(value: string): void {
    this.topic.set(value);
  }

  setDifficulty(value: Difficulty): void {
    this.difficulty.set(value);
  }

  generateQuiz(): void {
    const topic = this.topic().trim();

    if (topic.length < 3) {
      this.statusMessage.set('Enter a topic with at least 3 characters.');
      return;
    }

    this.isGenerating.set(true);
    this.statusMessage.set('Generating quiz preview...');

    window.setTimeout(() => {
      this.generatedQuiz.set(this.buildQuiz(topic, this.difficulty()));
      this.isGenerating.set(false);
      this.statusMessage.set('Preview ready. Replace this local generator with Hugging Face in the next phase.');
    }, 650);
  }

  private buildQuiz(topic: string, difficulty: Difficulty): GeneratedQuiz {
    return {
      topic,
      difficulty,
      questions: [
        this.createQuestion(topic, difficulty, 1),
        this.createQuestion(topic, difficulty, 2),
        this.createQuestion(topic, difficulty, 3),
        this.createQuestion(topic, difficulty, 4),
        this.createQuestion(topic, difficulty, 5)
      ]
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