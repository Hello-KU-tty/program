/**
 * Minimal in-memory DOM stub for testing the framework-free webview renderer.
 *
 * The renderer (src/webview/render.ts) uses only a small slice of the DOM API.
 * Rather than add a jsdom/happy-dom dependency (the task keeps the webview
 * dependency-free), this module implements just that slice: element creation,
 * class/text/attribute/property access, an event listener registry with a
 * synchronous `click`, `dataset`, `classList`, `hidden`, and the few input
 * properties (`value`, `readOnly`, `disabled`, `rows`, `type`). It also installs
 * `globalThis.document`, `globalThis.addEventListener`, and a no-op
 * `acquireVsCodeApi` so `bootstrap` runs without a real browser.
 *
 * This is test-only scaffolding and is intentionally not exhaustive.
 */

type Listener = (event: unknown) => void;

/** A minimal element supporting the properties/methods the renderer touches. */
export class FakeElement {
  tagName: string;
  className = "";
  private _textContent = "";
  hidden = false;
  value = "";
  readOnly = false;
  disabled = false;
  rows = 0;
  type = "";
  scrollTop = 0;
  scrollHeight = 0;
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly attributes: Record<string, string> = {};
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly classes = new Set<string>();
  readonly ownerDocument: FakeDocument;

  constructor(tagName: string, ownerDocument: FakeDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
  }

  /** Setting textContent clears children, mirroring real DOM behavior. */
  get textContent(): string {
    return this._textContent;
  }
  set textContent(value: string) {
    this._textContent = value;
    this.children.length = 0;
  }

  readonly classList = {
    add: (cls: string): void => {
      this.classes.add(cls);
      this.syncClassName();
    },
    toggle: (cls: string, on?: boolean): void => {
      const shouldHave = on ?? !this.classes.has(cls);
      if (shouldHave) {
        this.classes.add(cls);
      } else {
        this.classes.delete(cls);
      }
      this.syncClassName();
    },
  };

  private syncClassName(): void {
    // Keep className roughly in sync for `classList.add` on the root; the
    // renderer queries by exact className for created elements, so we do not
    // overwrite an explicitly-set className with class-list additions.
    if (this.classes.size > 0 && this.className === "") {
      this.className = [...this.classes].join(" ");
    }
  }

  setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  appendChild(child: FakeElement): FakeElement {
    this.children.push(child);
    return child;
  }

  addEventListener(type: string, listener: Listener): void {
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener);
  }

  /** Fires listeners for an event type (test helper). */
  dispatchEvent(type: string, event: unknown = {}): void {
    const set = this.listeners.get(type);
    if (set) {
      for (const listener of [...set]) {
        listener(event);
      }
    }
  }

  /** Synchronously invokes click listeners (test helper). */
  click(): void {
    this.dispatchEvent("click", {});
  }

  /** Depth-first search over this subtree matching a predicate (test helper). */
  queryAll(predicate: (e: FakeElement) => boolean): FakeElement[] {
    const out: FakeElement[] = [];
    const visit = (node: FakeElement): void => {
      if (predicate(node)) {
        out.push(node);
      }
      for (const child of node.children) {
        visit(child);
      }
    };
    for (const child of this.children) {
      visit(child);
    }
    if (predicate(this)) {
      out.unshift(this);
    }
    return out;
  }
}

/** A minimal document that creates {@link FakeElement}s. */
export class FakeDocument {
  createElement(tag: string): FakeElement {
    return new FakeElement(tag, this);
  }
  getElementById(): FakeElement | null {
    return null;
  }
}

/**
 * Installs the fake DOM globals and returns a `restore` to remove them, plus a
 * `createElement` convenience for building a root element bound to the document.
 */
export function installFakeDom(): {
  document: FakeDocument;
  createElement: (tag: string) => FakeElement;
  restore: () => void;
} {
  const doc = new FakeDocument();
  const g = globalThis as Record<string, unknown>;
  const prevDocument = g.document;
  const prevAddEventListener = g.addEventListener;
  const prevAcquire = g.acquireVsCodeApi;

  g.document = doc;
  g.addEventListener = () => undefined;
  g.acquireVsCodeApi = undefined;

  return {
    document: doc,
    createElement: (tag: string) => doc.createElement(tag),
    restore: () => {
      g.document = prevDocument;
      g.addEventListener = prevAddEventListener;
      g.acquireVsCodeApi = prevAcquire;
    },
  };
}
