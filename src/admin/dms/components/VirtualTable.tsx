import React, { useState, useMemo, useEffect, useRef } from "react";
import DataTable, { createTheme, type TableColumn } from "react-data-table-component";
import * as XLSX from "xlsx";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ExportToImage from "./ExportToImage";
import InputComp from "./InputComp";
import CustomButton from "./CustomButton";
import { useIsAdminDark } from "../../useAdminTheme";

// Navy surfaces for the admin dark theme (see ../css/dark.css).
createTheme(
    "admin-dark",
    {
        text: { primary: "#c9c7de", secondary: "#a3a2bf", disabled: "rgba(255,255,255,0.3)" },
        background: { default: "#0e1030" },
        context: { background: "#171a42", text: "#f1eff9" },
        divider: { default: "rgba(255,255,255,0.09)" },
        button: { default: "#c9c7de", hover: "rgba(255,255,255,0.08)", focus: "rgba(255,255,255,0.12)", disabled: "rgba(255,255,255,0.25)" },
        selected: { default: "rgba(243,106,34,0.15)", text: "#f1eff9" },
        highlightOnHover: { default: "#171a42", text: "#f1eff9" },
        striped: { default: "#11133a", text: "#c9c7de" },
    },
    "dark",
);

interface ExtendedColumn extends TableColumn<any> {
    export?: boolean;
    exportSelector?: (row: any) => any;
}

interface VirtualTableProps {
    data: any[];
    columns?: ExtendedColumn[] | any;
    selectableRows?: boolean;
    loading: boolean;
    itemsPerPage?: number;
    enableExport?: boolean;
    enableSearch?: boolean;
    onRowsSelected?: (selectedRows: any[]) => void;
    defaultSelectedRows?: any[];
    selectableRowsSingle?: boolean;
    title?: string;
    displayTitle?: string;
    slno?: boolean;
    onExportExcel?: (filteredData: any[], title?: string) => void;
}

// Reusable base styles
const baseCellPadding = "12px";
const baseFontSize = "16px";
const baseBorder = "1px solid #dee2e6";
const baseHoverColor = "#f1f1f1";

const customStyles = {
    headCells: {
        style: {
            backgroundColor: "#fce8e9",
            fontWeight: "bold",
            color: "#84161d",
            fontSize: baseFontSize,
            padding: baseCellPadding,
            border: baseBorder,
        },
    },
    headRow: {
        style: {
            backgroundColor: "#fce8e9", // Ensures header row (including checkbox) gets same color
        },
    },
    cells: {
        style: {
            padding: baseCellPadding,
            fontSize: baseFontSize,
            border: baseBorder,
            transition: "background-color 0.2s ease",
            "&:hover": {
                backgroundColor: baseHoverColor,
                cursor: "pointer",
            },
        },
    },
    rows: {
        style: {
            minHeight: "48px",
            transition: "background-color 0.2s ease",
            "&:hover": {
                backgroundColor: baseHoverColor,
            },
        },
    },
    selectCheckbox: {
        style: {
            appearance: "none",
            width: "20px",
            height: "20px",
            border: "2px solid #fc6a03",
            borderRadius: "0px",
            outline: "none",
            cursor: "pointer",
            backgroundColor: "white",
            transition: "all 0.2s ease",
        },
    },
    selectCheckboxDisabled: {
        style: {
            backgroundColor: baseHoverColor,
            borderColor: "#dee2e6",
        },
    },
};

const VirtualTable: React.FC<VirtualTableProps> = ({
    data,
    columns: providedColumns,
    selectableRows = false,
    loading,
    itemsPerPage = 10,
    enableExport = true,
    enableSearch = true,
    onRowsSelected,
    defaultSelectedRows = [],
    selectableRowsSingle = false,
    title = "Report",
    displayTitle = "",
    slno = true,
    onExportExcel,
}) => {
    const isDark = useIsAdminDark();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRows, setSelectedRows] =
        useState<any[]>(defaultSelectedRows);
    const [hasMounted, setHasMounted] = useState(false);

    const targetRef = useRef<HTMLTableElement | null>(null);
    // When data prop changes while rows are selected, DataTable fires
    // onSelectedRowsChange([]) as it resets its internal state.
    // We use this flag to ignore that one spurious empty event.
    const skipNextEmptySelection = useRef(false);
    const prevDataRef = useRef(data);

    useEffect(() => {
        if (prevDataRef.current !== data) {
            prevDataRef.current = data;
            if (selectedRows.length > 0) {
                skipNextEmptySelection.current = true;
            }
        }
    }, [data, selectedRows]);

    console.log("selectedRows", selectedRows);
    // Sync defaultSelectedRows → selectedRows
    useEffect(() => {
        // Create a stable comparison based on IDs
        const defaultIds =
            defaultSelectedRows
                ?.map((r) => r.id)
                .sort()
                .join(",") || "";
        const currentIds =
            selectedRows
                ?.map((r) => r.id)
                .sort()
                .join(",") || "";

        if (defaultIds !== currentIds && defaultSelectedRows?.length > 0) {
            setSelectedRows(defaultSelectedRows);
        }
    }, [defaultSelectedRows]);

    // Prevent firing on initial render
    useEffect(() => {
        //
        // console.log("selectedRows", selectedRows);

        if (hasMounted && onRowsSelected) {
            onRowsSelected(selectedRows);
        } else {
            setHasMounted(true);
        }
    }, [selectedRows]);

    const selectedRowIds = useMemo(
        () => new Set(selectedRows.map((row) => row.id)),
        [selectedRows],
    );

    const allKeys = data?.length > 0 ? Object.keys(data[0]) : [];
    const baseColumns: ExtendedColumn[] =
        providedColumns ||
        allKeys.map((key) => ({
            name: key,
            selector: (row: any) => row[key],
            sortable: true,
        }));

    // Automatically wrap string-based column names in a div for layout consistency
    const dynamicColumns: ExtendedColumn[] = useMemo(() => {
        return baseColumns.map((col: ExtendedColumn) => {
            if (typeof col.name === "string") {
                return {
                    ...col,
                    name: (
                        <div style={{ whiteSpace: "normal" }}>{col.name}</div>
                    ),
                };
            }
            return col;
        });
    }, [baseColumns]);

    const slNoColumn: ExtendedColumn = {
        name: <div style={{ whiteSpace: "normal" }}>Sl. No</div>,
        selector: (row: any) => row.sl_no,
        sortable: true,
        width: "80px",
        wrap: true,
    };

    // Check if "Actions" column exists
    const actionsIndex = dynamicColumns.findIndex((col: any) => {
        // Handles both string and JSX column names
        if (typeof col.name === "string")
            return col.name.toLowerCase() === "actions";
        if (React.isValidElement(col.name)) {
            const children = col.name.props?.children;
            if (typeof children === "string")
                return children.toLowerCase() === "actions";
            if (Array.isArray(children))
                return children.join("").toLowerCase() === "actions";
        }
        return false;
    });

    // Inject sl_no column accordingly
    const columns: ExtendedColumn[] = useMemo(() => {
        if (!slno) return dynamicColumns;

        return actionsIndex >= 0
            ? [
                  ...dynamicColumns.slice(0, actionsIndex + 1),
                  slNoColumn,
                  ...dynamicColumns.slice(actionsIndex + 1),
              ]
            : [slNoColumn, ...dynamicColumns];
    }, [dynamicColumns, slno, actionsIndex]);

    // Replace literal "null" / "Null" / "NULL" strings with empty string
    const sanitizeRow = (row: any): any => {
        const sanitized: any = {};
        for (const key in row) {
            const val = row[key];
            if (
                typeof val === "string" &&
                val.toLowerCase() === "null"
            ) {
                sanitized[key] = "";
            } else {
                sanitized[key] = val;
            }
        }
        return sanitized;
    };

    const filteredData = useMemo(() => {
        const term = searchTerm.trim().toLowerCase();

        const filtered = !term
            ? data
            : data.filter((row) =>
                  Object.values(row).some((value: any) => {
                      if (value == null) return false;
                      if (typeof value === "object")
                          return JSON.stringify(value)
                              .toLowerCase()
                              .includes(term);
                      return value.toString().toLowerCase().includes(term);
                  }),
              );

        // Sanitize null strings and add sl_no to each row
        return filtered.map((row, index) => ({
            ...sanitizeRow(row),
            sl_no: index + 1,
        }));
    }, [data, searchTerm]);

    const lastSelectedRef = useRef<any[]>([]);

    const handleRowSelected = (state: any) => {
        const newVisibleSelection = state.selectedRows;

        // Ignore the spurious empty event DataTable fires when data prop
        // changes and it resets its internal selection state.
        if (
            skipNextEmptySelection.current &&
            newVisibleSelection.length === 0
        ) {
            skipNextEmptySelection.current = false;
            return;
        }
        skipNextEmptySelection.current = false;

        // Get IDs of visible selected rows
        const newSelectedIds = new Set(
            newVisibleSelection.map((row: any) => row.id),
        );

        // Remove deselected rows from full selectedRows
        const newSelected = [
            // Keep rows previously selected but not visible in current filter
            ...selectedRows.filter(
                (row) =>
                    !filteredData.find((d) => d.id === row.id) ||
                    newSelectedIds.has(row.id),
            ),
            // Add newly selected visible rows that weren't already selected
            ...newVisibleSelection.filter(
                (row: any) => !selectedRows.find((r) => r.id === row.id),
            ),
        ];

        // Ensure uniqueness
        const uniqueSelected = Array.from(
            new Map(newSelected.map((row) => [row.id, row])).values(),
        );

        // 🔒 Only update state if the selection actually changed
        const currentIds = new Set(selectedRows.map((row) => row.id));
        const newIds = new Set(uniqueSelected.map((row) => row.id));

        const isSame =
            currentIds.size === newIds.size &&
            [...currentIds].every((id) => newIds.has(id));

        if (!isSame) {
            setSelectedRows(uniqueSelected);
            lastSelectedRef.current = uniqueSelected;
        }
    };

    const exportExcel = () => {
        if (onExportExcel) {
            onExportExcel(filteredData, title);
            return;
        }
        if (filteredData.length === 0) return;

        const headerRow = columns
            .filter((col: any) => col?.export !== false)
            .map((col: any) => col.name?.props?.children);

        const exportableColumns = columns.filter(
            (col: any) => col?.export !== false,
        );

        //console.log(headerRow);

        const dataRows = filteredData.map((row) =>
            exportableColumns.map((col) => {
                const rawValue =
                    typeof col.exportSelector === "function"
                        ? col.exportSelector(row)
                        : typeof col.selector === "function"
                          ? col.selector(row)
                          : "";

                if (rawValue instanceof Date) {
                    return rawValue; // Excel handles Date objects
                }
                if (typeof rawValue === "number") {
                    return rawValue; // Excel handles numbers
                }
                return rawValue ?? "";
            }),
        );

        const worksheetData = [headerRow, ...dataRows];
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
        XLSX.writeFile(workbook, `${title}.xlsx`);
    };

    return (
        <div className="virtual-table-container">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    {displayTitle && (
                        <h5 className="mb-0 fw-bold text-dark">
                            {displayTitle}
                        </h5>
                    )}
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {enableSearch && (
                        <div style={{ minWidth: "300px" }}>
                            <InputComp
                                type="text"
                                label=""
                                placeholder="Search records..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    )}
                    {enableExport && (
                        <div className="d-flex gap-2">
                            <CustomButton
                                bg="white"
                                className="border text-dark shadow-sm"
                                onClick={exportExcel}
                            >
                                <i className="fa-solid fa-file-excel me-2 text-success"></i>
                                Excel
                            </CustomButton>
                            <ExportToImage
                                targetRef={targetRef}
                                pdf={false}
                                fileName={title}
                                title={title}
                            />
                        </div>
                    )}
                </div>
            </div>

            {!loading ? (
                <div
                    style={{ flex: 1, minHeight: 0, borderRadius: "10px" }}
                    ref={targetRef}
                >
                    <DataTable
                        columns={columns}
                        data={filteredData}
                        pagination
                        paginationPerPage={itemsPerPage}
                        paginationRowsPerPageOptions={
                            Array.from(new Set([itemsPerPage, 10, 20, 50])) // 🔑
                        }
                        highlightOnHover
                        responsive
                        fixedHeader
                        fixedHeaderScrollHeight="100%" // Important!
                        selectableRows={selectableRows}
                        customStyles={customStyles}
                        theme={isDark ? "admin-dark" : "default"}
                        onSelectedRowsChange={handleRowSelected}
                        selectableRowSelected={(row) =>
                            selectedRowIds.has(row.id)
                        }
                        selectableRowsSingle={selectableRowsSingle}
                    />
                </div>
            ) : (
                <div
                    className="virtual-table-skeleton"
                    style={{
                        borderRadius: "8px",
                        overflowX: "auto",
                        border: "1px solid #dee2e6",
                        backgroundColor: "#ffffff",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                    }}
                >
                    <div
                        style={{
                            minWidth: `${Math.max(800, (columns.length || 6) * 140)}px`,
                        }}
                    >
                        {/* Skeleton Header Row */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${
                                    columns.length || 6
                                }, 1fr)`,
                                backgroundColor: "#fce8e9",
                                borderBottom: "2px solid #f5c2c7",
                            }}
                        >
                            {Array.from({ length: columns.length || 6 }).map(
                                (_, i) => (
                                    <div key={i} style={{ padding: "14px 12px" }}>
                                        <Skeleton
                                            height={16}
                                            baseColor="#f8d7da"
                                            highlightColor="#ffffff"
                                            width={`${60 + ((i * 17) % 35)}%`}
                                        />
                                    </div>
                                ),
                            )}
                        </div>
                        {/* Skeleton Data Rows */}
                        <div style={{ backgroundColor: "#ffffff" }}>
                            {Array.from({ length: 8 }).map((_, rowIndex) => (
                                <div
                                    key={rowIndex}
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: `repeat(${
                                            columns.length || 6
                                        }, 1fr)`,
                                        backgroundColor:
                                            rowIndex % 2 === 0
                                                ? "#ffffff"
                                                : "#fdfbfb",
                                        borderBottom:
                                            rowIndex < 7
                                                ? "1px solid #f1f3f5"
                                                : "none",
                                    }}
                                >
                                    {Array.from({
                                        length: columns.length || 6,
                                    }).map((_, colIndex) => (
                                        <div
                                            key={colIndex}
                                            style={{ padding: "14px 12px" }}
                                        >
                                            <Skeleton
                                                height={14}
                                                baseColor={
                                                    rowIndex % 2 === 0
                                                        ? "#f1f3f5"
                                                        : "#e9ecef"
                                                }
                                                highlightColor="#ffffff"
                                                width={`${50 + (((rowIndex + colIndex) * 23) % 45)}%`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(VirtualTable);
