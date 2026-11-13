import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'guida',
    title: 'Guida all’uso | Diario Rumore',
    loadComponent: () => import('./user-guide/user-guide').then(({ UserGuide }) => UserGuide),
  },
  { path: '', pathMatch: 'full', children: [], title: 'Diario Rumore' },
];
