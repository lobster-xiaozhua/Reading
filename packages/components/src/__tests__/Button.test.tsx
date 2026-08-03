import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>点击</Button>);
    expect(screen.getByRole('button', { name: '点击' })).toBeInTheDocument();
  });

  it('renders with variant classes', () => {
    const { container } = render(<Button variant="primary">主按钮</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('primary');
  });

  it('renders with size classes', () => {
    const { container } = render(<Button size="lg">大按钮</Button>);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('lg');
  });

  it('shows loading state', () => {
    render(<Button loading>提交</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disabled state prevents click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>禁用</Button>);
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('default type is button (prevents form submit)', () => {
    render(<Button>默认</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('accepts custom className', () => {
    const { container } = render(<Button className="custom-cls">自定义</Button>);
    expect(container.firstChild).toHaveClass('custom-cls');
  });
});

describe('Button variants', () => {
  const variants = ['primary', 'secondary', 'ghost', 'danger', 'link'] as const;
  for (const v of variants) {
    it(`renders ${v} variant`, () => {
      const { container } = render(<Button variant={v}>{v}</Button>);
      expect(container.firstChild).toBeInTheDocument();
    });
  }
});

describe('Button sizes', () => {
  const sizes = ['sm', 'md', 'lg'] as const;
  for (const s of sizes) {
    it(`renders ${s} size`, () => {
      const { container } = render(<Button size={s}>{s}</Button>);
      expect(container.firstChild).toBeInTheDocument();
    });
  }
});