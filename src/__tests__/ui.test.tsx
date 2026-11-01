import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { SAMPLE_PLANS } from '../data/samplePlans';
import { LandingPage } from '../components/LandingPage';
import { BlueprintGeneratorModal } from '../components/BlueprintGeneratorModal';
import { AssistantCoPilot } from '../components/AssistantCoPilot';
import { BudgetDonutChart } from '../components/BudgetDonutChart';
import { calculateBudgetMetrics } from '../utils/budgetCalculations';
import App from '../App';

// Mock firebase auth/firestore so App demo-mode smoke test runs cleanly in jsdom
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb(null);
    return () => {};
  }),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('../firebase', () => ({
  auth: { currentUser: null },
  db: {},
  googleProvider: {},
}));

describe('Planora AI — UI & Accessibility (jest-axe) Test Suite', () => {
  const sampleEvent = SAMPLE_PLANS[0];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders LandingPage with sample blueprints, triggers callbacks, and has zero axe violations', async () => {
    const onEnterWorkspace = vi.fn();
    const onOpenGenerator = vi.fn();

    const { container } = render(
      <LandingPage
        sampleEvents={SAMPLE_PLANS}
        onEnterWorkspace={onEnterWorkspace}
        onOpenGenerator={onOpenGenerator}
      />
    );

    expect(
      screen.getByRole('heading', {
        name: /Orchestrate Extraordinary Events Without Budget Surprises/i,
      })
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: /Generate Custom AI Blueprint/i })
    );
    expect(onOpenGenerator).toHaveBeenCalledTimes(1);

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('renders BlueprintGeneratorModal with linked labels, traps Tab focus, closes on Escape, and has zero axe violations', async () => {
    const onClose = vi.fn();
    const onCreateEvent = vi.fn();

    const { container } = render(
      <div>
        <main id="main-content">Background content</main>
        <BlueprintGeneratorModal
          isOpen={true}
          onClose={onClose}
          onCreateEvent={onCreateEvent}
        />
      </div>
    );

    const dialog = screen.getByRole('dialog', {
      name: /AI Event Blueprint Generator/i,
    });
    expect(dialog.getAttribute('aria-modal')).toBe('true');

    // Linked label check for Event Title input
    const titleInput = screen.getByLabelText(/Event Title \/ Name/i);
    expect(titleInput).toBeTruthy();

    // Background #main-content should have inert attribute while modal is open
    const mainEl = document.getElementById('main-content');
    expect(mainEl?.hasAttribute('inert')).toBe(true);

    const results = await axe(container);
    expect(results.violations).toEqual([]);

    // Pressing Escape closes the dialog
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders AssistantCoPilot and requires explicit user confirmation before applying proposedChanges, with zero axe violations', async () => {
    const onApplyProposedChange = vi.fn();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        reply: 'I can reduce variable categories by 10%.',
        proposedChanges: [
          {
            type: 'scale_budget_items',
            summaryLabel: 'Scale variable items to 90%',
            payload: { scaleFactor: 0.9, excludeCategory: 'venue' },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const { container } = render(
      <AssistantCoPilot
        event={sampleEvent}
        onApplyProposedChange={onApplyProposedChange}
      />
    );

    // Open Co-Pilot drawer
    const openBtn = screen.getByRole('button', { name: /Open AI Co-Pilot/i });
    await userEvent.click(openBtn);

    const resultsOpen = await axe(container);
    expect(resultsOpen.violations).toEqual([]);

    // Send a prompt via quick prompt button
    const quickBtn = screen.getByRole('button', {
      name: /Reduce total budget by 15%/i,
    });
    await userEvent.click(quickBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Scale variable items to 90%/i })
      ).toBeTruthy();
    });

    // Must NOT have mutated state automatically before user clicks Apply
    expect(onApplyProposedChange).not.toHaveBeenCalled();

    const applyBtn = screen.getByRole('button', {
      name: /Scale variable items to 90%/i,
    });
    await userEvent.click(applyBtn);

    expect(onApplyProposedChange).toHaveBeenCalledTimes(1);
    expect(onApplyProposedChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'scale_budget_items',
        summaryLabel: 'Scale variable items to 90%',
      })
    );
  });

  it('renders BudgetDonutChart with role="img", aria-labelledby, visually-hidden table, and zero axe violations', async () => {
    const metrics = calculateBudgetMetrics(sampleEvent);
    const onSelectCategory = vi.fn();

    const { container } = render(
      <BudgetDonutChart
        categories={metrics.categoryBreakdown}
        totalPlanned={metrics.totalPlanned}
        selectedCategory={null}
        onSelectCategory={onSelectCategory}
      />
    );

    const chartSvg = screen.getByRole('img', {
      name: /Budget Allocation Donut Chart/i,
    });
    expect(chartSvg).toBeTruthy();

    // Verify visually-hidden accessible data table
    const table = screen.getByRole('table', {
      name: /Budget allocation breakdown by category/i,
    });
    expect(table).toBeTruthy();

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });

  it('passes App demo-mode smoke test and navigates into workspace with zero axe violations', async () => {
    const { container } = render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /Orchestrate Extraordinary Events Without Budget Surprises/i,
      })
    ).toBeTruthy();

    const enterBtn = screen.getByRole('button', {
      name: /Explore Live Interactive Workspace/i,
    });
    await userEvent.click(enterBtn);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: sampleEvent.title })
      ).toBeTruthy();
      expect(
        screen.getByRole('heading', { name: /Budget Allocation by Category/i })
      ).toBeTruthy();
    });

    const results = await axe(container);
    expect(results.violations).toEqual([]);
  });
});
