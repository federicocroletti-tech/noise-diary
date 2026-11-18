import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'guida',
    title: 'Guida all’uso | Diario Rumore',
    loadComponent: () => import('./user-guide/user-guide').then(({ UserGuide }) => UserGuide),
  },
  {
    path: 'mappa',
    title: 'Mappa della casa | Diario Rumore',
    loadComponent: () => import('./floor-map/floor-map').then(({ FloorMap }) => FloorMap),
  },
  { path: '', pathMatch: 'full', children: [], title: 'Diario Rumore' },
];
