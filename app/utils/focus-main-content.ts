/**
 * The shared skip link retains native #main-content navigation and also moves
 * keyboard focus into the page landmark, which is not focusable by default.
 * No DOM is accessed during SSR: the default document is evaluated on click.
 */
export function focusMainContent(
  doc: Pick<Document, "getElementById"> = document,
): boolean {
  const main = doc.getElementById("main-content");
  if (!main) return false;
  if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
  main.focus({ preventScroll: true });
  return true;
}
