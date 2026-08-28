import type { JSX } from "react";

export type Option = {
  label: string;
  value: string | boolean | number | undefined;
};

type Input = {
  type: "input";
  options?: Option[];
  placeholder?: string;
};

type Checkbox = {
  type: "checkbox";
  component?: (props: Option) => JSX.Element | null;
  options?: Option[];
  /**
   * Optionally define how many placeholder rows to render while facets load.
   */
  skeletonRows?: number;
};

type Slider = {
  type: "slider";
  min: number;
  max: number;
  step?: number;
  // if options is undefined, we will provide all the steps between min and max
  options?: Option[];
};

type Base<TData> = {
  label: string;
  value: keyof TData | string;
  /**
   * Defines if the accordion in the filter bar is open by default
   */
  defaultOpen?: boolean;
  /**
   * Defines if the command input is disabled for this field
   */
  commandDisabled?: boolean;
};

export type DataTableCheckboxFilterField<TData> = Base<TData> & Checkbox;
export type DataTableSliderFilterField<TData> = Base<TData> & Slider;
export type DataTableInputFilterField<TData> = Base<TData> & Input;

export type DataTableFilterField<TData> =
  | DataTableCheckboxFilterField<TData>
  | DataTableSliderFilterField<TData>
  | DataTableInputFilterField<TData>;

/** ----------------------------------------- */

export type SheetField<TData, TMeta = Record<string, unknown>> = {
  id: keyof TData;
  label: string;
  // "readonly" displays the value; other types enable filter actions via dropdown
  type: "readonly" | "input" | "checkbox" | "slider";
  component?: (
    // REMINDER: this is used to pass additional data like the `InfiniteQueryMeta`
    props: TData & {
      metadata?: TMeta;
    }
  ) => JSX.Element | null | string;
  condition?: (props: TData) => boolean;
  className?: string;
  skeletonClassName?: string;
  hideLabel?: boolean;
  fullRowValue?: boolean;
  noPadding?: boolean;
  /** If true, truncate long values with ellipsis instead of wrapping */
  truncate?: boolean;
  /** Force mono/numeric styling — for component-rendered numeric values the raw-value heuristic can't detect */
  numeric?: boolean;
};
