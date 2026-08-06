import type { Book } from "@novel/components";
import type { BookSummary } from "@/api/types";
import { generateCoverSvgDataUrl } from "./generateDefaultCover";

export function toBook(b: BookSummary): Book {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.cover || generateCoverSvgDataUrl(b.title, b.author),
    tags: b.tags,
    intro: b.intro,
    rating: b.rating,
    status: b.status,
    updateTime: b.lastUpdated,
  };
}
