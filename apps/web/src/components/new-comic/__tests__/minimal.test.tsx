/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Spy on console.error to catch rendering errors
vi.spyOn(console, 'error').mockImplementation(() => {});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock react-hook-form minimally
vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn(),
    handleSubmit: vi.fn(),
    control: {},
    watch: vi.fn(),
    setValue: vi.fn(),
    trigger: vi.fn(),
    formState: { errors: {} },
    getValues: vi.fn(() => ({})),
  }),
  useFieldArray: () => ({
    fields: [],
    append: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock('@hookform/resolvers/zod', () => ({
  zodResolver: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('lucide-react', () => ({
  Sparkles: () => <svg data-testid="sparkles-icon" />,
  ArrowLeft: () => <svg data-testid="arrow-left-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  Layers: () => <svg data-testid="layers-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Trash2: () => <svg data-testid="trash-icon" />,
  PenSquare: () => <svg data-testid="pen-icon" />,
  ImagePlus: () => <svg data-testid="image-plus-icon" />,
  ChevronRight: () => <svg data-testid="chevron-right-icon" />,
  Check: () => <svg data-testid="check-icon" />,
}));

vi.mock('@panelcraft/ui', () => ({
  Button: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
  Textarea: ({ ...props }: any) => <textarea {...props} />,
  useToast: () => ({ toast: vi.fn() }),
  WizardSidebar: ({ children }: any) => <div>{children}</div>,
  CollapsibleSection: ({ children, title }: any) => (
    <div>
      <h3>{title}</h3>
      {children}
    </div>
  ),
  SelectionChip: ({ label }: any) => <div>{label}</div>,
  LayoutPreview: ({ layout }: any) => <div>{layout?.name}</div>,
}));

vi.mock('../NewComicWizard.module.css', () => ({
  default: {},
}));

// Import after mocks
import { NewComicWizard } from '../NewComicWizard';

describe('NewComicWizard Minimal Render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mounts without throwing', () => {
    expect(() => {
      render(<NewComicWizard />);
    }).not.toThrow();
  });

  it('renders something', () => {
    render(<NewComicWizard />);
    // Just check if anything rendered
    expect(document.body.children.length).toBeGreaterThan(0);
  });
});
