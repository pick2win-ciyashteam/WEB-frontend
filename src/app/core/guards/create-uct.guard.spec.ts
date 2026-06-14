import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { createUctGuard } from './create-uct.guard';

describe('createUctGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => createUctGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
