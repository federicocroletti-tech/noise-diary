import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { MapContext } from './map-context.service';

/** La mappa contiene dati del diario: si apre solo dentro una sessione, altrimenti si torna all'accesso. */
export const sessionGuard: CanActivateFn = () => {
  const router = inject(Router);
  return toObservable(inject(MapContext).sessionState).pipe(
    filter((state) => state !== 'loading'),
    take(1),
    map((state) => (state === 'open' ? true : router.parseUrl('/'))),
  );
};
