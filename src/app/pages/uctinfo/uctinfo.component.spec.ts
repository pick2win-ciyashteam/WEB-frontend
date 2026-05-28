import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UctinfoComponent } from './uctinfo.component';

describe('UctinfoComponent', () => {
  let component: UctinfoComponent;
  let fixture: ComponentFixture<UctinfoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UctinfoComponent]
    });
    fixture = TestBed.createComponent(UctinfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
