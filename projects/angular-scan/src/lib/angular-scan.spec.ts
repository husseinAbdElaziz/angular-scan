import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngularScan } from './angular-scan';

describe('AngularScan', () => {
  let component: AngularScan;
  let fixture: ComponentFixture<AngularScan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AngularScan],
    }).compileComponents();

    fixture = TestBed.createComponent(AngularScan);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
