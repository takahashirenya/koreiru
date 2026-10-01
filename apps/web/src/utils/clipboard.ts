export async function copyText(
  text: string,
  input: HTMLInputElement | HTMLTextAreaElement | null,
): Promise<void> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // HTTP接続や権限拒否では、表示中の入力欄からコピーする。
  }
  if (!input) throw new Error("コピーできませんでした");
  const previousFocus = document.activeElement;
  input.focus({ preventScroll: true });
  input.select();
  input.setSelectionRange(0, text.length);
  if (!document.execCommand("copy")) throw new Error("コピーできませんでした");
  if (previousFocus instanceof HTMLElement)
    previousFocus.focus({ preventScroll: true });
  else input.blur();
}
