<script lang="ts">
  /**
   * Text input with a list of suggestions (WAI-ARIA combobox with listbox popup).
   * Arrow keys move through the options, Enter picks one, Escape closes the list.
   */
  interface Option {
    id: string;
    label: string;
    hint?: string;
  }

  interface Props {
    label: string;
    value: string;
    options: readonly Option[];
    onselect: (id: string) => void;
    placeholder?: string;
    /** Announced to screen readers; shown when the list is closed. */
    status?: string;
    hideLabel?: boolean;
  }

  let {
    label,
    value = $bindable(),
    options,
    onselect,
    placeholder,
    status = '',
    hideLabel = false,
  }: Props = $props();

  const id = $props.id();
  let open = $state(false);
  let active = $state(-1);
  const expanded = $derived(open && options.length > 0);

  // A new list of options starts with nothing highlighted.
  $effect.pre(() => {
    void options;
    active = -1;
  });

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    open = false;
    active = -1;
    onselect(option.id);
  }

  function onkeydown(event: KeyboardEvent) {
    const count = options.length;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        open = true;
        active = (active + 1) % count;
        break;
      case 'ArrowUp':
        if (count === 0) return;
        event.preventDefault();
        open = true;
        active = active <= 0 ? count - 1 : active - 1;
        break;
      case 'Enter':
        if (expanded && active >= 0) {
          event.preventDefault();
          choose(active);
        }
        break;
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          open = false;
          active = -1;
        }
        break;
    }
  }
</script>

<div class="combobox">
  <label for="{id}-input" class:visually-hidden={hideLabel}>{label}</label>
  <input
    id="{id}-input"
    type="search"
    role="combobox"
    autocomplete="off"
    aria-autocomplete="list"
    aria-expanded={expanded}
    aria-controls="{id}-listbox"
    aria-activedescendant={active >= 0 ? `${id}-option-${active}` : undefined}
    {placeholder}
    bind:value
    oninput={() => (open = true)}
    onfocus={() => (open = true)}
    onblur={() => (open = false)}
    {onkeydown}
  />
  <ul id="{id}-listbox" role="listbox" aria-label={label} hidden={!expanded}>
    {#each options as option, index (option.id)}
      <!-- Keyboard selection happens on the input (aria-activedescendant); mousedown keeps focus there. -->
      <li
        id="{id}-option-{index}"
        role="option"
        aria-selected={index === active}
        onmousedown={(event) => {
          event.preventDefault();
          choose(index);
        }}
      >
        <span class="label">{option.label}</span>
        {#if option.hint}<span class="hint">{option.hint}</span>{/if}
      </li>
    {/each}
  </ul>
  <p class="status" class:visually-hidden={expanded || !status} role="status">{status}</p>
</div>

<style>
  .combobox {
    position: relative;
    display: grid;
    gap: var(--space-1);
  }

  label {
    font-size: var(--text-xs);
    font-weight: var(--weight-bold);
    color: var(--color-text-muted);
  }

  input {
    width: 100%;
    min-height: var(--control-height);
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  ul {
    position: absolute;
    top: calc(100% + var(--space-1));
    left: 0;
    right: 0;
    z-index: 1;
    margin: 0;
    padding: var(--space-1);
    list-style: none;
    max-height: 18rem;
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-overlay);
  }

  li {
    display: grid;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
  }

  li:hover,
  li[aria-selected='true'] {
    background: var(--color-primary-soft);
  }

  .label {
    font-size: var(--text-sm);
  }

  .hint {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .status {
    padding: var(--space-1) var(--space-3);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    background: var(--color-surface);
    border-radius: var(--radius-sm);
  }
</style>
