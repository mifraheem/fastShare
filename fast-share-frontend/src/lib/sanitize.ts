import DOMPurify from "dompurify";

/** Allowed tags for rich message content (headings, lists, emphasis, etc.) */
const MESSAGE_TAGS = [
  "p", "br", "div", "span",
  "strong", "b", "em", "i", "u", "s",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a",
];

/**
 * Sanitize HTML for storing or rendering message content.
 * Keeps structure (headings, lists, bold, links) and strips scripts/styles.
 */
export function sanitizeMessageHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: MESSAGE_TAGS,
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * Check if a string looks like HTML (contains tags).
 */
export function isHtml(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

/**
 * Get plain text from HTML for copying to clipboard.
 */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? html;
}
