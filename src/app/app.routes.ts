import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { GenerateComponent } from './pages/generate/generate.component';
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
    title: 'Generate | QuizAI'
  },
  {
    path: 'history',
    component: HistoryComponent,
    title: 'History | QuizAI'
  },
  {
    path: 'stats',
    component: StatsComponent,
    title: 'Stats | QuizAI'
  },
  {
    path: '**',
    redirectTo: ''
  }
];