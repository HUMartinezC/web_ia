import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { GenerateComponent } from './pages/generate/generate.component';
import { QuizComponent } from './pages/quiz/quiz.component';
import { HistoryComponent } from './pages/history/history.component';
import { StatsComponent } from './pages/stats/stats.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'QuizAI'
  },
  {
    path: 'generate',
    component: GenerateComponent,
    title: 'Generar | QuizAI'
  },
  {
    path: 'quiz/:id',
    component: QuizComponent,
    title: 'Quiz | QuizAI'
  },
  {
    path: 'history',
    component: HistoryComponent,
    title: 'Historial | QuizAI'
  },
  {
    path: 'stats',
    component: StatsComponent,
    title: 'Estadisticas | QuizAI'
  },
  {
    path: '**',
    redirectTo: ''
  }
];