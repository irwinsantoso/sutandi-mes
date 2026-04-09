"use client";

import { useState, useRef, useCallback } from "react";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ImportType,
  type ParseResult,
  type ParsedRow,
  IMPORT_CONFIGS,
  parseExcelFile,
} from "@/lib/excel-import";

type ImportStep = "select" | "preview" | "result";

interface ImportResultData {
  summary: { total: number; imported: number; errors: number };
  results: Array<{ rowIndex: number; success: boolean; error?: string }>;
}

export function ImportClient() {
  const [importType, setImportType] = useState<ImportType | "">("");
  const [step, setStep] = useState<ImportStep>("select");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = importType ? IMPORT_CONFIGS[importType] : null;

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !importType) return;

      setFileName(file.name);

      try {
        const buffer = await file.arrayBuffer();
        const result = parseExcelFile(buffer, importType);

        if (result.totalRows === 0) {
          toast.error("No data rows found in the file. Check that the sheet has data below the header row.");
          return;
        }

        setParseResult(result);
        setStep("preview");
      } catch {
        toast.error("Failed to parse the Excel file. Please check the file format.");
      }

      // Reset file input so the same file can be re-uploaded
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [importType]
  );

  const handleImport = useCallback(async () => {
    if (!parseResult || !importType) return;

    const validRows = parseResult.rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error("No valid rows to import. Fix the errors and re-upload.");
      return;
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importType,
          rows: validRows.map((r) => ({
            rowIndex: r.rowIndex,
            data: r.data,
          })),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Import failed");
      }

      const result = await response.json();
      setImportResult(result);
      setStep("result");

      if (result.summary.errors === 0) {
        toast.success(`Successfully imported ${result.summary.imported} rows.`);
      } else {
        toast.warning(
          `Imported ${result.summary.imported} rows with ${result.summary.errors} errors.`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Import failed";
      toast.error(msg);
    } finally {
      setIsImporting(false);
    }
  }, [parseResult, importType]);

  const handleReset = useCallback(() => {
    setStep("select");
    setParseResult(null);
    setImportResult(null);
    setFileName("");
    setImportType("");
  }, []);

  return (
    <div className="space-y-6">
      {/* Step 1: Select import type */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Import Type</Label>
              <Select
                value={importType}
                onValueChange={(val) => {
                  setImportType(val as ImportType);
                  setStep("select");
                  setParseResult(null);
                  setImportResult(null);
                }}
                disabled={step === "result"}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select what to import">
                    {(value: string | null) => {
                      if (!value) return "Select what to import";
                      const c = IMPORT_CONFIGS[value as ImportType];
                      return c ? c.label : value;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_CONFIGS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {config && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.open(
                      `/api/import/template?type=${importType}`,
                      "_blank"
                    );
                  }}
                >
                  <Download className="mr-1 h-4 w-4" />
                  Download Template
                </Button>
              </div>
            )}
          </div>

          {config && (
            <p className="text-sm text-muted-foreground">{config.description}</p>
          )}

          {config && step === "select" && (
            <div className="space-y-2">
              <Label>Upload Excel File</Label>
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-1 h-4 w-4" />
                  Choose File
                </Button>
                {fileName && (
                  <span className="text-sm text-muted-foreground">
                    {fileName}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Preview */}
      {step === "preview" && parseResult && config && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Data Preview</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {parseResult.totalRows} rows
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-700"
                  >
                    {parseResult.validRows} valid
                  </Badge>
                  {parseResult.errorRows > 0 && (
                    <Badge variant="destructive">
                      {parseResult.errorRows} errors
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-[500px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead className="w-16">Status</TableHead>
                      {config.columns.map((col) => (
                        <TableHead key={col.key}>{col.header}</TableHead>
                      ))}
                      <TableHead>Errors</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.map((row) => (
                      <PreviewRow
                        key={row.rowIndex}
                        row={row}
                        columns={config.columns}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <Button variant="outline" onClick={handleReset}>
                  Start Over
                </Button>
                <div className="flex items-center gap-3">
                  {parseResult.errorRows > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Rows with errors will be skipped.
                    </p>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={isImporting || parseResult.validRows === 0}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-1 h-4 w-4" />
                        Import {parseResult.validRows} Rows
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Step 3: Results */}
      {step === "result" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <ResultCard
                label="Total Processed"
                value={importResult.summary.total}
              />
              <ResultCard
                label="Imported"
                value={importResult.summary.imported}
                variant="success"
              />
              <ResultCard
                label="Errors"
                value={importResult.summary.errors}
                variant={importResult.summary.errors > 0 ? "error" : "default"}
              />
            </div>

            {importResult.summary.errors > 0 && (
              <div className="max-h-[300px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Row</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.results
                      .filter((r) => !r.success)
                      .map((r) => (
                        <TableRow key={r.rowIndex}>
                          <TableCell>{r.rowIndex}</TableCell>
                          <TableCell className="text-destructive">
                            {r.error}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleReset}>Import More Data</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PreviewRow({
  row,
  columns,
}: {
  row: ParsedRow;
  columns: { key: string; header: string }[];
}) {
  const hasErrors = row.errors.length > 0;

  return (
    <TableRow className={hasErrors ? "bg-destructive/5" : ""}>
      <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
      <TableCell>
        {hasErrors ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
      </TableCell>
      {columns.map((col) => (
        <TableCell key={col.key} className="text-sm">
          {row.data[col.key] != null ? String(row.data[col.key]) : ""}
        </TableCell>
      ))}
      <TableCell className="text-xs text-destructive">
        {row.errors.join("; ")}
      </TableCell>
    </TableRow>
  );
}

function ResultCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: number;
  variant?: "default" | "success" | "error";
}) {
  const colorClass =
    variant === "success"
      ? "text-green-700"
      : variant === "error"
        ? "text-destructive"
        : "";

  return (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-3xl font-bold ${colorClass}`}>{value}</p>
    </div>
  );
}
