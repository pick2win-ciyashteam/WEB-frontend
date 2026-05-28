import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateUctComponent } from './create-uct.component';

describe('CreateUctComponent', () => {
  let component: CreateUctComponent;
  let fixture: ComponentFixture<CreateUctComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CreateUctComponent]
    });
    fixture = TestBed.createComponent(CreateUctComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
