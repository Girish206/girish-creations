import React from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { FilterSelect } from "./filters";
import "../css/components/SelectInput.css";

interface Option {
    value: any;
    label: any;
}

interface SelectProps {
    options?: Option[];
    label?: string | React.ReactNode;
    id?: string;
    value?: any;
    name?: string;
    error?: string;
    isMulti?: boolean;
    required?: boolean;
    readOnly?: boolean;
    clearable?: boolean;
    placeholder?: string;
    onChange: (value: any) => void;
    className?: string;
    floating?: boolean;
    size?: "sm" | "md" | "lg";
    creatable?: boolean;
    isLoading?: boolean;
}

const labelNode = (label: string | React.ReactNode) =>
    typeof label === "string" ? <span dangerouslySetInnerHTML={{ __html: label }} /> : label;

const SelectInput: React.FC<SelectProps> = ({
    options = [],
    label = "",
    id = "",
    value = "",
    name = "",
    error = "",
    isMulti = false,
    required = false,
    readOnly = false,
    clearable = true,
    placeholder = "",
    onChange,
    className = "",
    floating = false,
    size = "md",
    creatable = false,
    isLoading = false,
}) => {
    const [isFocused, setIsFocused] = React.useState(false);

    // Every normal dropdown is drm-react's FilterSelect (./filters): one 38px
    // box, label inside on the left, value on the right, "First +N" for a
    // multi-select with a card listing everything picked.
    if (!floating) {
        return (
            <FilterSelect
                id={id || undefined}
                label={
                    label ? (
                        <>
                            {labelNode(label)}
                            {required && <span className="text-danger-brand">*</span>}
                        </>
                    ) : undefined
                }
                options={options}
                value={value}
                onChange={onChange}
                isMulti={isMulti}
                placeholder={placeholder || "Select"}
                clearable={clearable}
                isLoading={isLoading}
                disabled={readOnly}
                error={error || undefined}
                className={className}
                creatable={creatable}
            />
        );
    }

    const sizeClass = `select-${size}`;
    const hasValue = isMulti
        ? Array.isArray(value) && value.length > 0
        : value !== null && value !== undefined && value !== "";
    const isLabelFloating = isFocused || hasValue;

    const sharedProps = {
        name,
        inputId: id,
        classNamePrefix: "select",
        className: "select-floating",
        // Always a space so the control never looks empty (the label covers it).
        placeholder: isFocused ? placeholder : " ",
        options,
        isClearable: clearable,
        isMulti,
        isLoading,
        menuPosition: "absolute" as const,
        menuPlacement: "auto" as const,
        onFocus: () => setIsFocused(true),
        onBlur: () => setIsFocused(false),
        styles: {
            menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
        },
        menuPortalTarget: document.body,
        isDisabled: readOnly,
    };

    const resolvedValue = isMulti
        ? options.filter(
            (option) =>
                Array.isArray(value) && value.includes(option.value),
        )
        : options.find(
            (option) =>
                option?.value?.toString() === value?.toString(),
        ) ||
        (value && typeof value !== "object"
            ? {
                value,
                label: isNaN(Number(value)) ? value : "Loading...",
            }
            : null);

    const creatableValue = isMulti
        ? Array.isArray(value)
            ? value.map(
                (val) =>
                    options.find((opt) => opt.value === val) || {
                        label: val,
                        value: val,
                    },
            )
            : []
        : options.find(
            (opt) => opt?.value?.toString() === value?.toString(),
        ) ||
        (value && typeof value !== "object"
            ? { label: value, value }
            : null);

    const handleChange = (selected: any) => {
        if (isMulti) {
            onChange((selected as Option[] | null)?.map((opt) => opt.value) || []);
        } else {
            onChange((selected as Option | null)?.value || "");
        }
    };

    return (
        <div className={`m-1 text-start ${className}`}>
            <div className={`${sizeClass} form-floating select-wrapper`}>
                {creatable ? (
                    <CreatableSelect
                        {...sharedProps}
                        value={creatableValue}
                        onChange={handleChange}
                        formatCreateLabel={(inputValue) =>
                            `Add "${inputValue}"`
                        }
                    />
                ) : (
                    <Select
                        {...sharedProps}
                        value={resolvedValue}
                        onChange={handleChange}
                    />
                )}

                {label && (
                    <label
                        htmlFor={id}
                        className={`select-floating-label ${isLabelFloating ? "floating-label-active" : ""
                            }`}
                    >
                        {labelNode(label)}
                        {required && (
                            <span className="text-danger-brand">&nbsp;*</span>
                        )}
                    </label>
                )}
            </div>
            {error && (
                <small className="text-danger-brand ms-1">{error}</small>
            )}
        </div>
    );
};

export default SelectInput;
