/** Copy text to the clipboard, returning whether it succeeded.
 *
 * The async Clipboard API can be blocked by focus/permission state, so we fall
 * back to the legacy `execCommand('copy')` path, which works synchronously inside
 * a user-gesture (click) handler. Used by both the popup and the report reader. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the execCommand path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}
