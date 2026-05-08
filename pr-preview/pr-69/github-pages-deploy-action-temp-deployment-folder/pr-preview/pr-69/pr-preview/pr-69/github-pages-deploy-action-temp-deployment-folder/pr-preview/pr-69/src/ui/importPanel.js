export function setMessage(el, text, kind = 'info') {
  el.textContent = text;
  el.className = `alert ${kind}`;
  el.hidden = !text;
}
