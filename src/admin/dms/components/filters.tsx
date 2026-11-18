/**
 * Compact filter fields for filter bars (ReportFilters, FilterPanel, page toolbars).
 * Forms keep using SelectInput / InputComp; filters use these so every filter bar looks the same:
 * one 38px row, label inside on the left, value on the right, never grows when more is picked.
 *
 *   <FilterSelect label="Campus" options={campusOptions} isMulti value={campus} onChange={setCampus} />
 *   <FilterSelect label="Status" options={statusOptions} value={status} onChange={setStatus} clearable={false} />
 *   <FilterDate label="As on" value={date} onChange={setDate} min={fy.start} max={fy.end} />
 *   <FilterSearch value={q} onChange={setQ} placeholder="Search name, email…" />
 *   <FilterText label="PAN" value={pan} onChange={setPan} />
 *
 * Copied from drm-react (shared with pbmt-dms and dms). Local additions: `creatable`, so a
 * typed-in name can be added (the expense group / people pickers).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Select, {
    components,
    type ControlProps,
    type MenuListProps,
    type OptionProps,
    type PlaceholderProps,
    type SingleValueProps,
    type StylesConfig,
    type ValueContainerProps,
} from "react-select";
import CreatableSelect from "react-select/creatable";
import "../css/components/filters.css";

export interface FilterOption {
    value: any;
    label: any;
}

const same = (a: any, b: any) =>
    a !== null && a !== undefined && b !== null && b !== undefined ? a.toString() === b.toString() : a === b;

/** an "All" / "All Lead Types" option means "no filter": it doesn't count as an active filter */
const isAllOption = (o?: FilterOption | null) =>
    !!o && (String(o.value).toLowerCase() === "all" || /^all(\s|$)/i.test(String(o.label ?? "").trim()));

/* ---------- react-select parts ---------- */

// label inside the box, before the value
const Control = (props: ControlProps<FilterOption, boolean>) => {
    const { filterLabel, filterIcon } = props.selectProps as any;
    return (
        <components.Control {...props}>
            {(filterIcon || filterLabel) && (
                <span className="ui-filter__label">
                    {filterIcon && <i className={`fa-solid ${filterIcon}`}></i>}
                    {filterLabel}
                </span>
            )}
            {props.children}
        </components.Control>
    );
};

// multi: one summary line ("Mysuru +2") instead of chips, so the box never grows
const ValueContainer = (props: ValueContainerProps<FilterOption, boolean>) => {
    const { isMulti, getValue, selectProps } = props;
    const selected = getValue();
    const showSummary = isMulti && selected.length > 0 && !selectProps.inputValue;
    // only "All" picked: show it muted, like the empty placeholder
    const onlyAll = selected.length > 0 && selected.every(isAllOption);
    return (
        <components.ValueContainer {...props}>
            {showSummary && (
                <Summary
                    className={`ui-filter__summary${onlyAll ? " ui-filter__summary--all" : ""}`}
                    selected={selected as FilterOption[]}
                    // the dropdown already lists everything while it's open
                    disabled={onlyAll || selected.length < 2 || !!selectProps.menuIsOpen}
                />
            )}
            {props.children}
        </components.ValueContainer>
    );
};

const TOOLTIP_MAX_ITEMS = 12;

// "Mysuru +2" with a styled card listing every picked option (portalled, so nothing clips it).
// Mouse: shown on hover. Touch (no hover): tapping "+N" toggles it without opening the dropdown;
// the next tap anywhere, a scroll or a resize closes it.
const Summary = ({ selected, className, disabled }: { selected: FilterOption[]; className: string; disabled: boolean }) => {
    const ref = useRef<HTMLSpanElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
    const [tapped, setTapped] = useState(false);

    const show = () => {
        if (disabled || !ref.current) return;
        const box = (ref.current.closest(".ui-filter") as HTMLElement) || ref.current;
        const r = box.getBoundingClientRect();
        const width = Math.min(300, window.innerWidth - 16);
        setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)), width });
    };
    const hide = () => {
        setPos(null);
        setTapped(false);
    };

    // touch: "+N" toggles the card; stopping the event keeps react-select from opening the menu,
    // and preventDefault stops the browser's follow-up mouse events
    const onMoreTouch = (e: React.TouchEvent) => {
        if (disabled) return;
        e.stopPropagation();
        e.preventDefault();
        if (pos) {
            hide();
        } else {
            show();
            setTapped(true);
        }
    };

    useEffect(() => {
        if (disabled) hide();
    }, [disabled]);

    // a card opened by a tap closes on the next tap elsewhere, on scroll or on rotation; height-only
    // resizes are ignored (phones fire those when the address bar slides in or out)
    useEffect(() => {
        if (!tapped) return;
        const openWidth = window.innerWidth;
        const close = (e: Event) => {
            if (e.type === "touchstart" && (e.target as Node | null) && ref.current?.contains(e.target as Node)) return;
            if (e.type === "resize" && window.innerWidth === openWidth) return;
            hide();
        };
        document.addEventListener("touchstart", close, true);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("touchstart", close, true);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [tapped]);

    const shown = selected.slice(0, TOOLTIP_MAX_ITEMS);
    return (
        <>
            {/* the first name shortens with "…" in a narrow box; "+N" always stays visible */}
            <span ref={ref} className={className} onMouseEnter={show} onMouseLeave={() => !tapped && hide()}>
                <span
                    className="ui-filter__summary-first"
                    // one pick: no card, so a name cut with "…" shows in full on hover
                    title={selected.length === 1 && typeof selected[0].label === "string" ? selected[0].label : undefined}
                >
                    {selected[0].label}
                </span>
                {selected.length > 1 && (
                    <span
                        className="ui-filter__summary-more"
                        onTouchEnd={onMoreTouch}
                        // touch: the tap on "+N" belongs to the card, not to the dropdown
                        onTouchStart={(e) => !disabled && e.stopPropagation()}
                    >
                        +{selected.length - 1}
                    </span>
                )}
            </span>
            {pos &&
                createPortal(
                    <div className="ui-filter__tooltip" style={{ top: pos.top, left: pos.left, width: pos.width }} role="tooltip">
                        <div className="ui-filter__tooltip-head">{selected.length} selected</div>
                        <ul>
                            {shown.map((o) => (
                                <li key={String(o.value)}>
                                    <i className="fa-solid fa-check"></i>
                                    <span>{o.label}</span>
                                </li>
                            ))}
                        </ul>
                        {selected.length > shown.length && (
                            <div className="ui-filter__tooltip-more">+{selected.length - shown.length} more</div>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
};

// react-select always draws the placeholder when it isn't drawing the values (multi here),
// so hide it once something is picked; the summary above takes its place
const Placeholder = (props: PlaceholderProps<FilterOption, boolean>) =>
    props.isMulti && props.getValue().length > 0 ? null : <components.Placeholder {...props} />;

// single select: a value cut with "…" in a narrow box shows in full on hover
const SingleValue = (props: SingleValueProps<FilterOption, boolean>) => (
    <components.SingleValue {...props}>
        <span title={typeof props.data.label === "string" ? props.data.label : undefined}>{props.children}</span>
    </components.SingleValue>
);

// multi: tick box in front of each option
const Option = (props: OptionProps<FilterOption, boolean>) => (
    <components.Option {...props}>
        {props.isMulti && (
            <span className={`ui-filter__check${props.isSelected ? " is-checked" : ""}`}>
                {props.isSelected && <i className="fa-solid fa-check"></i>}
            </span>
        )}
        <span className="ui-filter__option-label">{props.label}</span>
    </components.Option>
);

// multi: "Select all · Clear" above the list
const MenuList = (props: MenuListProps<FilterOption, boolean>) => {
    const { isMulti, options, setValue, clearValue, getValue, selectProps } = props;
    const visible = (options as FilterOption[]).filter((o) =>
        !selectProps.inputValue || String(o.label).toLowerCase().includes(selectProps.inputValue.toLowerCase()),
    );
    const hold = (e: React.MouseEvent) => e.preventDefault(); // keep the menu open
    // lists with their own "All" option: the page handles All vs others, so no extra "Select all"
    const hasAllOption = (options as FilterOption[]).some(isAllOption);
    return (
        <>
            {isMulti && visible.length > 1 && (
                <div className="ui-filter__menu-actions">
                    {!hasAllOption && (
                        <>
                    <button
                        type="button"
                        onMouseDown={hold}
                        onClick={() => {
                            const current = getValue() as FilterOption[];
                            const merged = [...current, ...visible.filter((o) => !current.some((c) => same(c.value, o.value)))];
                            setValue(merged, "select-option");
                        }}
                    >
                        Select all{selectProps.inputValue ? " shown" : ""}
                    </button>
                    <span>·</span>
                        </>
                    )}
                    <button type="button" onMouseDown={hold} onClick={() => clearValue()}>
                        Clear
                    </button>
                </div>
            )}
            <components.MenuList {...props}>{props.children}</components.MenuList>
        </>
    );
};

const MENU_MAX_WIDTH = 420;
// menu list (280) + the Select all / Clear bar + gaps
const MENU_FULL_HEIGHT = 340;

/* inline styles only for what react-select sets inline; the rest is in filters.css */
const styles: StylesConfig<FilterOption, boolean> = {
    control: () => ({}),
    // 2px at the bottom: the font sits low in its line box, this lifts the text to the optical centre
    valueContainer: (base) => ({ ...base, padding: "0 0 2px", flexWrap: "nowrap", gap: 0 }),
    input: (base) => ({ ...base, margin: 0, padding: 0, color: "inherit" }),
    placeholder: (base) => ({ ...base, margin: 0 }),
    singleValue: (base) => ({ ...base, margin: 0, color: "inherit" }),
    indicatorSeparator: () => ({ display: "none" }),
    dropdownIndicator: (base) => ({ ...base, padding: "0 2px" }),
    clearIndicator: (base) => ({ ...base, padding: "0 2px" }),
    loadingIndicator: (base) => ({ ...base, padding: "0 2px" }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    // sized to its options (up to MENU_MAX_WIDTH, never wider than the screen); when there is no room
    // to the right of the box it lines up with the box's right edge and opens leftwards instead
    menu: (base, props) => ({
        ...base,
        minWidth: "100%",
        width: "max-content",
        maxWidth: `min(${MENU_MAX_WIDTH}px, calc(100vw - 16px))`,
        marginTop: 6,
        marginBottom: 6,
        ...((props.selectProps as any).menuAlignRight ? { left: "auto", right: 0 } : {}),
    }),
    menuList: (base) => ({ ...base, padding: 4, maxHeight: 280 }),
    option: () => ({}),
};

/* ---------- FilterSelect ---------- */

interface FilterSelectProps {
    /** shown inside the box, left of the value */
    label?: ReactNode;
    /** Font Awesome icon (e.g. "fa-building") shown before the label */
    icon?: string;
    options?: FilterOption[];
    /** single: the option value; multi: array of option values */
    value?: any;
    /** single: the value ("" when cleared); multi: array of values */
    onChange: (value: any) => void;
    isMulti?: boolean;
    /** shown when nothing is picked */
    placeholder?: string;
    clearable?: boolean;
    searchable?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    /** validation message under the box (e.g. a required filter) */
    error?: string;
    className?: string;
    id?: string;
    /** local addition: a typed name not in the list can be added ("Add …") */
    creatable?: boolean;
}

export const FilterSelect = ({
    label,
    icon,
    options = [],
    value,
    onChange,
    isMulti = false,
    placeholder = "All",
    clearable = true,
    searchable = true,
    isLoading = false,
    disabled = false,
    error,
    className = "",
    id,
    creatable = false,
}: FilterSelectProps) => {
    const selected = useMemo(() => {
        // creatable: a typed-in value isn't in `options` yet, so it shows as itself
        const typed = (v: any): FilterOption | null =>
            creatable && v !== "" && v !== null && v !== undefined && typeof v !== "object" ? { value: v, label: v } : null;
        if (isMulti) {
            const values = Array.isArray(value) ? value : [];
            if (creatable) {
                return values
                    .map((v) => options.find((o) => same(o.value, v)) || typed(v))
                    .filter(Boolean) as FilterOption[];
            }
            return options.filter((o) => values.some((v) => same(o.value, v)));
        }
        return options.find((o) => same(o.value, value)) || typed(value);
    }, [isMulti, options, value, creatable]);
    const SelectComponent = (creatable ? CreatableSelect : Select) as typeof Select;

    // active = a real filter is set; "All" alone is not one
    const hasValue = isMulti
        ? (selected as FilterOption[]).some((o) => !isAllOption(o))
        : Boolean(selected) && !isAllOption(selected as FilterOption);

    // where the dropdown opens: measured each time it opens, from the space left of / right of the box
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [menuAlignRight, setMenuAlignRight] = useState(false);
    const [menuPlacement, setMenuPlacement] = useState<"bottom" | "top">("bottom");
    const placeMenu = () => {
        const r = boxRef.current?.getBoundingClientRect();
        if (!r) return;
        const viewport = document.documentElement.clientWidth;
        const roomRight = viewport - r.left;
        const roomLeft = r.right;
        // open leftwards only when it doesn't fit to the right and there's more room on the left
        setMenuAlignRight(roomRight < MENU_MAX_WIDTH + 8 && roomLeft > roomRight);
        // open upwards when the full menu doesn't fit below and there's more room above
        // (react-select's "auto" only flips below 140px and otherwise squeezes the menu)
        const roomBelow = window.innerHeight - r.bottom;
        const roomAbove = r.top;
        setMenuPlacement(roomBelow < MENU_FULL_HEIGHT && roomAbove > roomBelow ? "top" : "bottom");
    };

    return (
        <div
            ref={boxRef}
            className={`m-1 ui-filter${hasValue ? " ui-filter--active" : ""}${disabled ? " ui-filter--disabled" : ""}${error ? " ui-filter--error" : ""} ${className}`}
        >
            <SelectComponent
                inputId={id}
                classNamePrefix="ui-filter"
                options={options}
                value={selected}
                isMulti={isMulti}
                placeholder={placeholder}
                isClearable={clearable && hasValue}
                isSearchable={searchable}
                isLoading={isLoading}
                isDisabled={disabled}
                closeMenuOnSelect={!isMulti}
                hideSelectedOptions={false}
                controlShouldRenderValue={!isMulti}
                backspaceRemovesValue={!isMulti}
                // up / down: react-select picks the side with room; left / right: placeMenu
                menuPlacement={menuPlacement}
                menuPortalTarget={document.body}
                onMenuOpen={placeMenu}
                styles={styles}
                components={{ Control, ValueContainer, Placeholder, SingleValue, Option, MenuList }}
                {...({
                    filterLabel: label,
                    filterIcon: icon,
                    menuAlignRight,
                    ...(creatable ? { formatCreateLabel: (input: string) => `Add "${input}"` } : {}),
                } as any)}
                onChange={(picked: any) =>
                    onChange(isMulti ? (picked || []).map((o: FilterOption) => o.value) : picked?.value ?? "")
                }
            />
            {error && <small className="ui-filter__error">{error}</small>}
        </div>
    );
};

/* ---------- FilterDate ---------- */

interface FilterDateProps {
    label?: ReactNode;
    /** yyyy-mm-dd, "" = not set */
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    /** shown while no date is picked */
    placeholder?: string;
    clearable?: boolean;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export const FilterDate = ({
    label,
    value,
    onChange,
    min,
    max,
    placeholder = "Select date",
    clearable = true,
    disabled = false,
    className = "",
    id,
}: FilterDateProps) => (
    <div className={`m-1 ui-filter ui-filter-field${value ? " ui-filter--active" : ""}${disabled ? " ui-filter--disabled" : ""} ${className}`}>
        <label className="ui-filter__label" htmlFor={id}>
            <i className="fa-regular fa-calendar"></i>
            {label}
        </label>
        {/* a date input has no placeholder of its own: while empty and not focused, its "dd-mm-yyyy"
            is hidden and this text shows instead; clicking in brings the mask back for typing */}
        <span className="ui-filter__date">
            <input
                id={id}
                type="date"
                className={`ui-filter__input${value ? "" : " ui-filter__input--empty"}`}
                value={value}
                min={min}
                max={max}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
            />
            {!value && <span className="ui-filter__date-placeholder">{placeholder}</span>}
        </span>
        {clearable && value && !disabled && (
            <button type="button" className="ui-filter__clear" aria-label="Clear date" onClick={() => onChange("")}>
                <i className="fa-solid fa-xmark"></i>
            </button>
        )}
    </div>
);

/* ---------- FilterSearch ---------- */

interface FilterSearchProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
}

export const FilterSearch = ({ value, onChange, placeholder = "Search…", disabled = false, className = "", id }: FilterSearchProps) => (
    <div className={`m-1 ui-filter ui-filter-field${value ? " ui-filter--active" : ""}${disabled ? " ui-filter--disabled" : ""} ${className}`}>
        <label className="ui-filter__label" htmlFor={id} aria-label="Search">
            <i className="fa-solid fa-magnifying-glass"></i>
        </label>
        <input
            id={id}
            type="search"
            className="ui-filter__input"
            value={value}
            placeholder={placeholder}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
        />
        {value && !disabled && (
            <button type="button" className="ui-filter__clear" aria-label="Clear search" onClick={() => onChange("")}>
                <i className="fa-solid fa-xmark"></i>
            </button>
        )}
    </div>
);

/* ---------- FilterText ---------- */

interface FilterTextProps {
    /** shown inside the box, left of the value */
    label?: ReactNode;
    /** Font Awesome icon (e.g. "fa-id-card") shown before the label */
    icon?: string;
    value: string;
    onChange: (value: string) => void;
    /** default: "Type to search…" ("Enter amount" for type="number") */
    placeholder?: string;
    /** input type: text, email, tel, number… */
    type?: string;
    maxLength?: number;
    disabled?: boolean;
    className?: string;
    id?: string;
    name?: string;
}

/** a labelled free-text filter (PAN, mobile, city…), same box as FilterDate */
export const FilterText = ({
    label,
    icon,
    value,
    onChange,
    placeholder,
    type = "text",
    maxLength,
    disabled = false,
    className = "",
    id,
    name,
}: FilterTextProps) => (
    <div className={`m-1 ui-filter ui-filter-field${value ? " ui-filter--active" : ""}${disabled ? " ui-filter--disabled" : ""} ${className}`}>
        {(icon || label) && (
            <label className="ui-filter__label" htmlFor={id}>
                {icon && <i className={`fa-solid ${icon}`}></i>}
                {label}
            </label>
        )}
        <input
            id={id}
            name={name}
            type={type}
            className="ui-filter__input ui-filter__input--text"
            value={value ?? ""}
            placeholder={placeholder ?? (type === "number" ? "Enter amount" : "Type to search…")}
            maxLength={maxLength}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
        />
        {value && !disabled && (
            <button type="button" className="ui-filter__clear" aria-label="Clear" onClick={() => onChange("")}>
                <i className="fa-solid fa-xmark"></i>
            </button>
        )}
    </div>
);
