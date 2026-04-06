import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';

import { QuizSessionService } from '../../core/services/quiz-session.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  private readonly router = inject(Router);
  private readonly quizSessionService = inject(QuizSessionService);

  readonly completedToday = signal(0);
  readonly completedTodayLabel = computed(() => {
    const count = this.completedToday();
    return count === 1 ? 'quiz completado hoy' : 'quizzes completados hoy';
  });

  constructor() {
    this.reloadTodayCount();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => this.reloadTodayCount());
  }

  reloadTodayCount(): void {
    this.completedToday.set(this.quizSessionService.getCompletedTodayCount());
  }
}