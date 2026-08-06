import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tag } from "../Tag";

describe("Tag", () => {
  it("renders with text", () => {
    render(<Tag>玄幻</Tag>);
    expect(screen.getByText("玄幻")).toBeInTheDocument();
  });

  it("renders with color variant", () => {
    const { container } = render(<Tag color="success">热门</Tag>);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("renders closable tag", () => {
    const { container } = render(<Tag closable>可关闭</Tag>);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
