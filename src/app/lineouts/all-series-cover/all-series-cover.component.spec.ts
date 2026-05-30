import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllSeriesCoverComponent } from './all-series-cover.component';

describe('AllSeriesCoverComponent', () => {
  let component: AllSeriesCoverComponent;
  let fixture: ComponentFixture<AllSeriesCoverComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AllSeriesCoverComponent]
    });
    fixture = TestBed.createComponent(AllSeriesCoverComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
