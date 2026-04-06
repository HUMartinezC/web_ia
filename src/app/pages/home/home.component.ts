import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { HuggingfaceService } from '../../core/services/huggingface.service';

interface HomeQuoteState {
  quote: string;
  author: string;
  source: 'huggingface' | 'local';
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  private readonly huggingFaceService = inject(HuggingfaceService);

  readonly quote = signal<HomeQuoteState>({
    quote: 'Aprender es transformar curiosidad en conocimiento util.',
    author: 'Edupravia',
    source: 'local'
  });
  readonly isLoadingQuote = signal(false);

  constructor() {
    this.loadQuote();
  }

  async loadQuote(): Promise<void> {
    this.isLoadingQuote.set(true);

    try {
      const nextQuote = await this.huggingFaceService.generateEducationalQuote('educacion, aprendizaje y quiz');
      this.quote.set(nextQuote);
    } finally {
      this.isLoadingQuote.set(false);
    }
  }
}