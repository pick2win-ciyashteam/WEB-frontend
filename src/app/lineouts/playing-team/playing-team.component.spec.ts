import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayingTeamComponent } from './playing-team.component';

describe('PlayingTeamComponent', () => {
  let component: PlayingTeamComponent;
  let fixture: ComponentFixture<PlayingTeamComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PlayingTeamComponent]
    });
    fixture = TestBed.createComponent(PlayingTeamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
