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
    title: 'Edupravia'
  },
  {
    path: 'generate',
    component: GenerateComponent,
    title: 'Generar | Edupravia'
  },
  {
    path: 'quiz/:id',
    component: QuizComponent,
    title: 'Quiz | Edupravia'
  },
  {
    path: 'history',
    component: HistoryComponent,
    title: 'Historial | Edupravia'
  },
  {
    path: 'stats',
    component: StatsComponent,
    title: 'Estadisticas | Edupravia'
  },
  {
    path: '**',
    redirectTo: ''
  }
];