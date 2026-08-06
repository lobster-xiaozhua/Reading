import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BookDetailRelated } from "../BookDetailPage/BookDetailRelated";
import type { BookSummary } from "@/api/types";

const mockBooks: BookSummary[] = [
  {
    id: "1",
    title: "相关书1",
    author: "作者A",
    cover: "/cover1.jpg",
    category: "xuanhuan",
    status: "ongoing",
    wordCount: 100000,
    rating: 4.5,
    ratingCount: 100,
    followCount: 1000,
    clickCount: 5000,
    tags: ["热血"],
    flags: [],
    lastUpdated: 1700000000000,
    intro: "简介1",
  },
  {
    id: "2",
    title: "相关书2",
    author: "作者B",
    cover: "/cover2.jpg",
    category: "urban",
    status: "ongoing",
    wordCount: 200000,
    rating: 4.0,
    ratingCount: 200,
    followCount: 2000,
    clickCount: 8000,
    tags: ["都市"],
    flags: [],
    lastUpdated: 1700000000000,
    intro: "简介2",
  },
];

describe("BookDetailRelated", () => {
  it("renders related books grid when data is provided", () => {
    render(<BookDetailRelated related={mockBooks} loading={false} />);
    expect(screen.getByText("相关推荐")).toBeInTheDocument();
    expect(screen.getByText("相关书1")).toBeInTheDocument();
    expect(screen.getByText("相关书2")).toBeInTheDocument();
  });

  it("renders empty state when no related books", () => {
    render(<BookDetailRelated related={[]} loading={false} />);
    expect(screen.getByText("暂无相关推荐")).toBeInTheDocument();
  });

  it("renders skeleton when loading", () => {
    const { container } = render(
      <BookDetailRelated related={[]} loading={true} />,
    );
    expect(container.querySelector(".novel-skeleton")).not.toBeNull();
  });
});
