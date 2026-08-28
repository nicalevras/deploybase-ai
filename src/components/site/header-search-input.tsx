import { Search, X } from "lucide-react";
import * as React from "react";

export function HeaderSearchInput({
  value,
  placeholder,
  onChange,
  onClear,
  onFocus,
  onKeyDown,
  expanded,
  listboxId,
  activeDescendant,
  combobox = false,
  autoFocus,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus?: () => void;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  expanded?: boolean;
  listboxId?: string;
  activeDescendant?: string;
  combobox?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex h-9 w-full items-center rounded-sm border border-input bg-site-chrome transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/15">
      <Search className="ml-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        className="h-full min-w-0 flex-1 bg-transparent px-2 text-sm text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        autoComplete="off"
        spellCheck={false}
        role={combobox ? "combobox" : undefined}
        aria-autocomplete={combobox ? "list" : undefined}
        aria-controls={combobox ? listboxId : undefined}
        aria-expanded={combobox ? Boolean(expanded) : undefined}
        aria-haspopup={combobox ? "listbox" : undefined}
        aria-activedescendant={combobox ? activeDescendant : undefined}
        autoFocus={autoFocus}
      />
      {value ? (
        <button
          type="button"
          onClick={onClear}
          className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}
