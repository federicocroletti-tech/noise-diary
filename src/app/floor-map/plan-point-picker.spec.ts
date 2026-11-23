import 'fake-indexeddb/auto';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PlanPointPicker } from './plan-point-picker';
import { PlanStore } from './plan-store';

describe('PlanPointPicker', () => {
  let fixture: ComponentFixture<PlanPointPicker> | undefined;

  beforeEach(async () => {
    await PlanStore.clear();
    await PlanStore.save({
      fileName: 'synthetic-plan.pdf',
      savedAt: '2026-11-23T00:00:00.000Z',
      pdf: new Blob(['synthetic PDF']),
      rooms: [
        {
          id: 'room-apartment',
          kind: 'apartment',
          label: 'Appartamento',
          image: new Blob(['synthetic image'], { type: 'image/png' }),
          width: 100,
          height: 50,
        },
      ],
    });
    await TestBed.configureTestingModule({
      imports: [PlanPointPicker],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(async () => {
    fixture?.destroy();
    fixture = undefined;
    await PlanStore.clear();
    vi.restoreAllMocks();
  });

  it('emits a normalized point for the selected room when the plan is clicked', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:synthetic-plan');
    const revokedUrl = vi.spyOn(URL, 'revokeObjectURL');
    const testFixture = TestBed.createComponent(PlanPointPicker);
    fixture = testFixture;
    const emitted = vi.fn();
    testFixture.componentInstance.pointChange.subscribe(emitted);
    testFixture.detectChanges();
    await testFixture.whenStable();
    await vi.waitFor(() => {
      testFixture.detectChanges();
      expect((testFixture.nativeElement as HTMLElement).querySelector('.plan')).not.toBeNull();
    });
    const image = (testFixture.nativeElement as HTMLElement).querySelector<HTMLImageElement>(
      '.plan img',
    );
    if (!image) {
      throw new Error('Plan picker image is missing.');
    }
    vi.spyOn(image, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 200,
      height: 100,
    } as DOMRect);
    const plan = (testFixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.plan');
    if (!plan) {
      throw new Error('Plan picker container is missing.');
    }
    plan.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 60, clientY: 45 }));

    expect(emitted).toHaveBeenCalledWith({ x: 0.25, y: 0.25, planId: 'room-apartment' });

    testFixture.destroy();
    fixture = undefined;
    expect(revokedUrl).toHaveBeenCalledWith('blob:synthetic-plan');
  });
});
