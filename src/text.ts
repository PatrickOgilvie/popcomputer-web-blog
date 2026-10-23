// Small text helpers the server and the editor share.

/** An address from a title: `Writing in Markdown!` reads `writing-in-markdown`. */
export function slugify(title: string, most = 80): string {
  return title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, most)
    .replace(/^-+|-+$/g, '')
}

const words = (markdown: string) => markdown.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length

/** How long a post takes to read, at 220 words a minute: one minute at least. */
export function readingMinutes(markdown: string): number {
  return Math.max(1, Math.round(words(markdown) / 220))
}

/** The number of words in a post. */
export const wordCount = words

/** A post's first paragraph as plain text, for a list where it has no excerpt of its own. */
export function plainExcerpt(markdown: string, most = 200): string {
  const paragraph =
    markdown
      .replace(/```[\s\S]*?```/g, '')
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find((block) => block !== '' && !/^(#|>|[-*+] |\d+\. |!\[|\||---)/.test(block)) ?? ''
  const plain = paragraph
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return plain.length <= most ? plain : `${plain.slice(0, most).replace(/\s+\S*$/, '')}…`
}
