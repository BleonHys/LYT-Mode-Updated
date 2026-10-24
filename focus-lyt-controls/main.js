const { Plugin, Platform, Notice, setIcon } = require('obsidian');
const PIN_COMMAND = 'obsidian-style-settings:style-settings-class-toggle-lyt-prism-lyt-prism-pin-bars';
const HEADER = '.mod-root .workspace-tabs:not(.mod-stacked) > .workspace-tab-header-container';

module.exports = class FocusLytControls extends Plugin {
  onload() {
    this.pins = new Map();
    this.observed = new Set();
    this.nextId = 0;
    this.disposed = false;
    if (Platform.isMobile) return;
    this.resizeObserver = new ResizeObserver(() => this.scheduleRefresh());
    this.classObserver = new MutationObserver(() => this.scheduleRefresh());
    this.classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.register(() => this.resizeObserver.disconnect());
    this.register(() => this.classObserver.disconnect());
    this.registerDomEvent(window, 'resize', () => this.scheduleRefresh());
    for (const event of ['layout-change', 'active-leaf-change', 'css-change']) {
      this.registerEvent(this.app.workspace.on(event, () => this.scheduleRefresh()));
    }
    this.app.workspace.onLayoutReady(() => this.scheduleRefresh());
  }

  scheduleRefresh() {
    if (this.disposed || this.frame) return;
    this.frame = requestAnimationFrame(() => { this.frame = 0; this.refresh(); });
  }

  refresh() {
    if (this.disposed) return;
    const body = document.body;
    const enabled = !body.classList.contains('is-mobile') &&
      getComputedStyle(body).getPropertyValue('--lyt-prism-theme-active').trim() === '1' &&
      body.classList.contains('lyt-prism-autohide-tabs');
    body.classList.toggle('lyt-prism-controls-enabled', enabled);
    if (!enabled) { this.removeControls(); return; }
    const headers = [...document.querySelectorAll(HEADER)];
    for (const [header, entry] of this.pins) {
      if (!headers.includes(header)) this.removePin(header, entry);
    }
    const pinned = body.classList.contains('lyt-prism-pin-bars');
    for (const header of headers) {
      let entry = this.pins.get(header);
      if (!entry) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'clickable-icon focus-lyt-pin';
        button.addEventListener('click', event => {
          this.togglePin();
          // Pointer clicks must not leave focus-within keeping Auto-Hide open.
          // Keyboard activation keeps focus for predictable Tab navigation.
          if (event.detail > 0) button.blur();
        });
        const ownedId = !header.id ? `focus-lyt-tabs-${++this.nextId}` : null;
        if (ownedId) header.id = ownedId;
        const reference = header.querySelector('.workspace-tab-header-tab-list, .sidebar-toggle-button');
        header.insertBefore(button, reference?.parentElement === header ? reference : null);
        entry = { button, ownedId };
        this.pins.set(header, entry);
      }
      if (entry.pinned !== pinned) {
        entry.pinned = pinned;
        const label = pinned ? 'Leiste lösen' : 'Leiste festsetzen';
        setIcon(entry.button, pinned ? 'lock' : 'unlock');
        entry.button.setAttribute('aria-label', label);
        entry.button.setAttribute('aria-pressed', String(pinned));
        entry.button.title = label;
      }
    }
    if (!this.trigger && headers.length) {
      this.trigger = document.createElement('button');
      this.trigger.type = 'button';
      this.trigger.className = 'focus-lyt-trigger';
      this.trigger.setAttribute('aria-labelledby', 'focus-lyt-trigger-label');
      setIcon(this.trigger, 'chevron-down');
      const label = document.createElement('span');
      label.id = 'focus-lyt-trigger-label';
      label.className = 'focus-lyt-control-label';
      label.textContent = 'Notizleiste einblenden';
      this.trigger.append(label);
      this.trigger.addEventListener('click', () => this.revealAndFocus());
      document.body.append(this.trigger);
    }
    if (!this.trigger) return;
    const activeTabs = this.app.workspace.activeLeaf?.view?.containerEl.closest('.workspace-tabs');
    const active = headers.find(header => header.parentElement === activeTabs);
    this.targetHeader = active || (headers.includes(this.targetHeader) ? this.targetHeader : headers[0]);
    if (!this.targetHeader) { this.removeControls(); return; }
    const rect = this.targetHeader.getBoundingClientRect();
    this.trigger.style.left = `${rect.left + rect.width / 2}px`;
    this.trigger.style.top = `${Math.max(0, rect.top)}px`;
    this.trigger.setAttribute('aria-controls', this.targetHeader.id);
    const watched = new Set(headers);
    for (const header of this.observed) if (!watched.has(header)) this.resizeObserver.unobserve(header);
    for (const header of watched) if (!this.observed.has(header)) this.resizeObserver.observe(header);
    this.observed = watched;
  }

  revealAndFocus() {
    document.body.classList.add('lyt-prism-controls-reveal');
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      this.pins.get(this.targetHeader)?.button.focus();
      document.body.classList.remove('lyt-prism-controls-reveal');
    }, 180);
  }

  togglePin() {
    if (!this.app.commands.commands[PIN_COMMAND]) {
      new Notice('Bitte Style Settings aktivieren, um die Leiste festzusetzen.');
      return;
    }
    this.app.commands.executeCommandById(PIN_COMMAND);
    this.scheduleRefresh();
  }

  removePin(header, entry) {
    entry.button.remove();
    if (entry.ownedId && header.id === entry.ownedId) header.removeAttribute('id');
    this.pins.delete(header);
  }

  removeControls() {
    for (const [header, entry] of this.pins) this.removePin(header, entry);
    this.trigger?.remove();
    this.trigger = null;
    this.targetHeader = null;
    for (const header of this.observed) this.resizeObserver?.unobserve(header);
    this.observed.clear();
    clearTimeout(this.focusTimer);
    if (document.body.classList.contains('lyt-prism-controls-reveal')) document.body.classList.remove('lyt-prism-controls-reveal');
  }

  onunload() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.focusTimer);
    this.classObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.removeControls();
    document.body.classList.remove('lyt-prism-controls-enabled');
  }
};
