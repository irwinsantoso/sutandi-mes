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
import { type KopParseResult, parseKopFile } from "@/lib/kop-import";
import type { KopPreviewResponse, KopPreviewLine } from "@/app/api/import/kop/preview/route";

type ImportStep = "select" | "preview" | "result";

interface ImportResultData {
  summary: { total: number; imported: number; errors: number };
  results: Array<{ rowIndex: number; success: boolean; error?: string }>;
}

interface UomOption {
  code: string;
  name: string;
}

export function ImportClient({ uoms }: { uoms: UomOption[] }) {
  const [importType, setImportType] = useState<ImportType | "">("");
  const [step, setStep] = useState<ImportStep>("select");
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [kopResult, setKopResult] = useState<KopParseResult | null>(null);
  const [kopPreview, setKopPreview] = useState<KopPreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [defaultBaseUomCode, setDefaultBaseUomCode] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = importType ? IMPORT_CONFIGS[importType] : null;
  const needsBaseUom = importType === "items-simple";
  const isKop = importType === "kop-production-order";
  const uploadReady = !!importType && (!needsBaseUom || !!defaultBaseUomCode);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !importType) return;

      setFileName(file.name);

      try {
        const buffer = await file.arrayBuffer();

        if (importType === "kop-production-order") {
          const kop = parseKopFile(buffer);
          if (kop.outputs.length === 0 && kop.materials.length === 0) {
            toast.error("Could not find any outputs or materials in the KOP sheet.");
            return;
          }
          setKopResult(kop);
          setKopPreview(null);
          setStep("preview");
          try {
            const resp = await fetch("/api/import/kop/preview", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ kop }),
            });
            if (resp.ok) {
              setKopPreview((await resp.json()) as KopPreviewResponse);
            }
          } catch {
            // Match preview is best-effort; fall back to unmatched display.
          }
        } else {
          const result = parseExcelFile(buffer, importType);
          if (result.totalRows === 0) {
            toast.error("No data rows found in the file. Check that the sheet has data below the header row.");
            return;
          }
          setParseResult(result);
          setStep("preview");
        }
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
    if (!importType) return;

    let requestBody: Record<string, unknown>;

    if (importType === "kop-production-order") {
      if (!kopResult) return;
      if (kopResult.errors.length > 0) {
        toast.error("Fix the parse errors before importing.");
        return;
      }
      requestBody = { importType, kop: kopResult };
    } else {
      if (!parseResult) return;
      const validRows = parseResult.rows.filter((r) => r.errors.length === 0);
      if (validRows.length === 0) {
        toast.error("No valid rows to import. Fix the errors and re-upload.");
        return;
      }
      requestBody = {
        importType,
        rows: validRows.map((r) => ({ rowIndex: r.rowIndex, data: r.data })),
      };
      if (importType === "items-simple") {
        if (!defaultBaseUomCode) {
          toast.error("Pick a default Base UOM before importing.");
          return;
        }
        requestBody.defaultBaseUomCode = defaultBaseUomCode;
      }
    }

    setIsImporting(true);

    try {
      const response = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
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
  }, [parseResult, kopResult, importType, defaultBaseUomCode]);

  const handleReset = useCallback(() => {
    setStep("select");
    setParseResult(null);
    setKopResult(null);
    setKopPreview(null);
    setImportResult(null);
    setFileName("");
    setImportType("");
    setDefaultBaseUomCode("");
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
                  setKopResult(null);
                  setKopPreview(null);
                  setImportResult(null);
                  setDefaultBaseUomCode("");
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

            {config && !config.customParser && (
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

          {config && needsBaseUom && step === "select" && (
            <div className="space-y-2">
              <Label>Default Base UOM</Label>
              <Select
                value={defaultBaseUomCode}
                onValueChange={(val) => setDefaultBaseUomCode(val ?? "")}
              >
                <SelectTrigger className="w-full sm:w-80">
                  <SelectValue placeholder="Pick a base UOM applied to every row" />
                </SelectTrigger>
                <SelectContent>
                  {uoms.map((u) => (
                    <SelectItem key={u.code} value={u.code}>
                      {u.code} — {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The legacy export has no UOM column, so this one UOM is applied to every row.
              </p>
            </div>
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
                  disabled={!uploadReady}
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

      {/* Step 2: KOP Preview */}
      {step === "preview" && kopResult && isKop && (
        <KopPreview
          result={kopResult}
          preview={kopPreview}
          isImporting={isImporting}
          onImport={handleImport}
          onReset={handleReset}
        />
      )}

      {/* Step 2: Generic Preview */}
      {step === "preview" && parseResult && config && !isKop && (
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

function KopPreview({
  result,
  preview,
  isImporting,
  onImport,
  onReset,
}: {
  result: KopParseResult;
  preview: KopPreviewResponse | null;
  isImporting: boolean;
  onImport: () => void;
  onReset: () => void;
}) {
  const { header, outputs, materials, errors } = result;
  const materialCount = materials.filter((m) => m.section === "material").length;
  const accessoryCount = materials.filter((m) => m.section === "accessory").length;

  const matchByKey = new Map<string, KopPreviewLine>();
  if (preview) {
    for (const line of preview.lines) {
      matchByKey.set(`${line.section}|${line.kopCode}`, line);
    }
  }
  const matchedCount = preview?.lines.filter((l) => l.confidence !== "none").length ?? 0;
  const placeholderCount = preview ? preview.lines.length - matchedCount : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>KOP Preview</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{outputs.length} outputs</Badge>
            <Badge variant="outline">{materialCount} materials</Badge>
            <Badge variant="outline">{accessoryCount} accessories</Badge>
            {preview && (
              <>
                <Badge variant="outline" className="border-green-500 text-green-700">
                  {matchedCount} matched
                </Badge>
                {placeholderCount > 0 && (
                  <Badge variant="outline" className="border-amber-500 text-amber-700">
                    {placeholderCount} to auto-create
                  </Badge>
                )}
              </>
            )}
            {errors.length > 0 && (
              <Badge variant="destructive">{errors.length} errors</Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-2 rounded-md border p-4 text-sm sm:grid-cols-2">
          <HeaderRow label="No. WO" value={header.orderNumber} />
          <HeaderRow label="Tanggal WO" value={header.plannedStartDateRaw} />
          <HeaderRow label="Proyek" value={header.description} />
          <HeaderRow label="Jenis/Warna" value={header.jenisWarna} />
          <HeaderRow label="Type" value={header.typeVariant} />
          <HeaderRow label="Tangga" value={header.tangga} />
          <HeaderRow label="Nama Departemen" value={header.departmentName} />
        </div>

        {preview?.orderAlreadyExists && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            An order with number <span className="font-mono">{header.orderNumber}</span> already exists. Importing will fail — edit the source file or delete the existing order.
          </div>
        )}

        {preview && preview.missingUomCodes.length > 0 && (
          <div className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">UOMs that will be auto-created:</p>
            <p className="font-mono text-xs">{preview.missingUomCodes.join(", ")}</p>
          </div>
        )}

        {errors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            <p className="font-medium">Parse errors:</p>
            <ul className="ml-5 list-disc">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Section</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-24">UOM</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outputs.map((o, i) => (
                <TableRow key={`o-${i}`}>
                  <TableCell><Badge variant="outline">Output</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{o.itemCode}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell>pcs</TableCell>
                  <TableCell>
                    <MatchCell line={matchByKey.get(`output|${o.itemCode}`)} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[o.warna, o.keterangan].filter(Boolean).join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
              {materials.map((m, i) => (
                <TableRow key={`m-${i}`}>
                  <TableCell>
                    <Badge variant="outline">
                      {m.section === "material" ? "Material" : "Accessory"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{m.itemCode}</TableCell>
                  <TableCell>{m.quantity}</TableCell>
                  <TableCell>{m.uomCode}</TableCell>
                  <TableCell>
                    <MatchCell
                      line={matchByKey.get(
                        `${m.section === "material" ? "material" : "accessory"}|${m.itemCode}`
                      )}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[
                      m.panjang != null ? `PANJANG ${m.panjang}` : null,
                      m.keterangan,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onReset}>
            Start Over
          </Button>
          <Button onClick={onImport} disabled={isImporting || errors.length > 0}>
            {isImporting ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-1 h-4 w-4" />
                Import Production Order
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

const CONFIDENCE_LABEL: Record<KopPreviewLine["confidence"], string> = {
  exact: "Exact",
  "code-fuzzy": "Code fuzzy",
  "name-contains-code": "Name match",
  "name-contains-numeric": "Numeric match",
  none: "No match",
};

function MatchCell({ line }: { line: KopPreviewLine | undefined }) {
  if (!line) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  if (line.confidence === "none") {
    return (
      <Badge variant="outline" className="border-amber-500 text-amber-700">
        Will auto-create
      </Badge>
    );
  }
  const strong = line.confidence === "exact" || line.confidence === "code-fuzzy";
  return (
    <div className="flex flex-col gap-0.5">
      <Badge
        variant="outline"
        className={
          strong
            ? "border-green-500 text-green-700"
            : "border-blue-500 text-blue-700"
        }
      >
        {CONFIDENCE_LABEL[line.confidence]}
      </Badge>
      <span className="font-mono text-[11px] text-muted-foreground">
        {line.matchedItemCode}
      </span>
      {line.matchedItemName && (
        <span className="text-[11px] text-muted-foreground">{line.matchedItemName}</span>
      )}
    </div>
  );
}

function HeaderRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex gap-2">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
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
