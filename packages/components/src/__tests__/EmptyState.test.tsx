import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState, Skeleton } from "../EmptyState";
import { Button } from "../Button";

describe("EmptyState", () => {
  it("renders with title", () => {
    render(<EmptyState title="暂无数据" />);
    expect(screen.getByText("暂无数据")).toBeInTheDocument();
  });

  it("renders with description", () => {
    render(<EmptyState title="空" description="书架是空的" />);
    expect(screen.getByText("书架是空的")).toBeInTheDocument();
  });

  it("renders with action element", () => {
    render(<EmptyState title="空" action={<Button>去逛逛</Button>} />);
    expect(screen.getByRole("button", { name: "去逛逛" })).toBeInTheDocument();
  });
});

describe("Skeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
