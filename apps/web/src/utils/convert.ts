import type { Book } from '@novel/components';
import type { BookSummary } from '@/api/types';

export function toBook(b: BookSummary): Book {
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    cover: b.cover,
    tags: b.tags,
    intro: b.intro,
    rating: b.rating,
    status: b.status,
    updateTime: b.lastUpdated,
  };
}