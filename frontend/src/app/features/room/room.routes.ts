import { Routes } from '@angular/router';


export const ROOM_ROUTES: Routes = [
  {
    path: ':id',
    loadComponent: () => import('./pages/room/room.component').then((m) => m.RoomComponent),
  },
];
