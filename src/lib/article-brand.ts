export function normalizeArticleAuthor(author: string): string {
  return author.trim().toLowerCase() === "deploybase"
    ? "Deploybase"
    : author;
}
