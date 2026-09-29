/** A deliberately small Markdown subset. No HTML parsing, images, or active URLs.
 * Every payload leaf goes through textContent, including unfinished stream tokens.
 */
export function renderChatMessage(container: HTMLElement, text: string): void {
  const doc = container.ownerDocument;
  const element = (tag: string, value?: string): HTMLElement => {
    const node = doc.createElement(tag);
    if (value !== undefined) node.textContent = value;
    return node;
  };
  const inline = (parent: HTMLElement, source: string, depth = 0): void => {
    if (depth >= 4) { parent.textContent = source; return; }
    const pattern = /(`+)([^`\n]+?)\1|\*\*([^*\n]+)\*\*|__([^_\n]+)__|\*([^*\n]+)\*/g;
    let position = 0;
    let matched = false;
    for (const match of source.matchAll(pattern)) {
      matched = true;
      if (match.index > position) parent.appendChild(element("span", source.slice(position, match.index)));
      const node = element(match[1] ? "code" : match[5] ? "em" : "strong");
      if (match[1]) node.textContent = match[2];
      else inline(node, match[3] ?? match[4] ?? match[5], depth + 1);
      parent.appendChild(node);
      position = match.index + match[0].length;
    }
    if (!matched) parent.textContent = source;
    else if (position < source.length) parent.appendChild(element("span", source.slice(position)));
  };
  container.textContent = "";
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  const fence = (line: string) => /^\s{0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  const list = (line: string) => /^\s{0,3}([-+*]|\d+[.)])\s+(.*)$/.exec(line);
  const heading = (line: string) => /^\s{0,3}(#{1,6})\s+(.*)$/.exec(line);
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const opening = fence(line);
    if (opening) {
      const content: string[] = [];
      index++;
      while (index < lines.length) {
        const closing = fence(lines[index]);
        if (closing && closing[1][0] === opening[1][0] && closing[1].length >= opening[1].length && !closing[2].trim()) { index++; break; }
        content.push(lines[index++]);
      }
      const pre = element("pre");
      pre.appendChild(element("code", content.join("\n")));
      container.appendChild(pre);
      continue;
    }
    const title = heading(line);
    if (title) {
      const node = element(`h${Math.min(6, title[1].length + 2)}`);
      inline(node, title[2]); container.appendChild(node); index++; continue;
    }
    const item = list(line);
    if (item) {
      const ordered = /^\d/.test(item[1]);
      const node = element(ordered ? "ol" : "ul");
      if (ordered) node.setAttribute("start", String(parseInt(item[1], 10)));
      while (index < lines.length) {
        const next = list(lines[index]);
        if (!next || /^\d/.test(next[1]) !== ordered) break;
        const li = element("li"); inline(li, next[2]); node.appendChild(li); index++;
      }
      container.appendChild(node); continue;
    }
    const paragraph = [line]; index++;
    while (index < lines.length && lines[index].trim() && !fence(lines[index]) && !heading(lines[index]) && !list(lines[index])) paragraph.push(lines[index++]);
    const node = element("p");
    node.className = "agent-transcript-line";
    inline(node, paragraph.join("\n")); container.appendChild(node);
  }
}
