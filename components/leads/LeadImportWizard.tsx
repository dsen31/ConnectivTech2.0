"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle2, XCircle, AlertCircle, ArrowRight } from "lucide-react";
import { bulkImportLeads } from "@/app/actions/leads";
import { LEAD_FIELDS, COMPANY_SIZES } from "@/types";
import type { Database } from "@/lib/supabase/types";
import { toast } from "sonner";

type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
type Step = "upload" | "mapping" | "preview" | "done";

const MAX_ROWS = 500;

const FIELD_ALIASES: Record<string, string> = {
  email: "email", email_address: "email", e_mail: "email",
  first_name: "first_name", firstname: "first_name", first: "first_name", given_name: "first_name",
  last_name: "last_name", lastname: "last_name", last: "last_name", surname: "last_name", family_name: "last_name",
  company: "company_name", company_name: "company_name", organization: "company_name", org: "company_name", account: "company_name",
  title: "job_title", job_title: "job_title", position: "job_title", role: "job_title",
  industry: "industry", vertical: "industry", sector: "industry",
  phone: "phone", phone_number: "phone", mobile: "phone", cell: "phone",
  website: "website", url: "website", domain: "website",
  linkedin: "linkedin_url", linkedin_url: "linkedin_url", linkedin_profile: "linkedin_url",
  notes: "notes", note: "notes", comments: "notes",
  company_size: "company_size", employees: "company_size", headcount: "company_size",
};

function autoDetect(header: string): string {
  const key = header.toLowerCase().replace(/[\s\-\/]+/g, "_").replace(/[^a-z0-9_]/g, "");
  return FIELD_ALIASES[key] ?? "ignore";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

interface ValidatedLead {
  lead: LeadInsert | null;
  errors: string[];
  row: Record<string, string>;
}

function mapRow(
  row: Record<string, string>,
  mapping: Record<string, string>
): ValidatedLead {
  const errors: string[] = [];
  const lead: Partial<LeadInsert> = {};

  for (const [csvCol, fieldName] of Object.entries(mapping)) {
    if (fieldName === "ignore") continue;
    const val = row[csvCol]?.trim() ?? "";
    if (val) {
      (lead as Record<string, string>)[fieldName] = val;
    }
  }

  if (!lead.email) errors.push("Email is required");
  else if (!isValidEmail(lead.email)) errors.push("Invalid email format");
  if (!lead.first_name) errors.push("First name is required");
  if (!lead.last_name) errors.push("Last name is required");

  if (lead.company_size && !COMPANY_SIZES.includes(lead.company_size as never)) {
    lead.company_size = undefined;
  }

  if (errors.length > 0) return { lead: null, errors, row };
  return { lead: lead as LeadInsert, errors: [], row };
}

export function LeadImportWizard() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validated, setValidated] = useState<ValidatedLead[]>([]);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function applyParsedData(cols: string[], rows: Record<string, string>[]) {
    setHeaders(cols);
    setRawRows(rows.slice(0, MAX_ROWS));
    const initialMapping: Record<string, string> = {};
    for (const col of cols) {
      initialMapping[col] = autoDetect(col);
    }
    setMapping(initialMapping);
    setStep("mapping");
  }

  function processFile(file: File) {
    const name = file.name.toLowerCase();

    if (name.endsWith(".csv")) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          applyParsedData(results.meta.fields ?? [], results.data);
        },
        error: () => toast.error("Failed to parse CSV"),
      });
      return;
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
            raw: false,
          });

          if (rawRows.length < 2) {
            toast.error("Spreadsheet appears to be empty");
            return;
          }

          const cols = (rawRows[0] as unknown[])
            .map((h) => String(h ?? "").trim())
            .filter(Boolean);

          const rows = rawRows.slice(1).map((row) => {
            const obj: Record<string, string> = {};
            cols.forEach((col, i) => {
              obj[col] = String((row as unknown[])[i] ?? "").trim();
            });
            return obj;
          }).filter((row) => Object.values(row).some((v) => v !== ""));

          applyParsedData(cols, rows);
        } catch {
          toast.error("Failed to parse spreadsheet");
        }
      };
      reader.onerror = () => toast.error("Failed to read file");
      reader.readAsArrayBuffer(file);
      return;
    }

    toast.error("Please upload a .csv, .xlsx, or .xls file");
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  function handleContinueToPreview() {
    const mappedFields = Object.values(mapping);
    if (!mappedFields.includes("email")) {
      toast.error("You must map the Email column before continuing");
      return;
    }
    if (!mappedFields.includes("first_name") || !mappedFields.includes("last_name")) {
      toast.error("You must map First Name and Last Name columns before continuing");
      return;
    }
    const results = rawRows.map((row) => mapRow(row, mapping));
    setValidated(results);
    setStep("preview");
  }

  function handleImport() {
    const validLeads = validated
      .filter((v) => v.lead !== null)
      .map((v) => v.lead as LeadInsert);

    if (validLeads.length === 0) {
      toast.error("No valid leads to import");
      return;
    }

    startTransition(async () => {
      try {
        const res = await bulkImportLeads(validLeads);
        setResult(res);
        setStep("done");
      } catch {
        toast.error("Import failed. Please try again.");
      }
    });
  }

  const validCount = validated.filter((v) => v.errors.length === 0).length;
  const invalidCount = validated.filter((v) => v.errors.length > 0).length;

  // Step indicators
  const steps: Array<{ id: Step; label: string }> = [
    { id: "upload", label: "Upload" },
    { id: "mapping", label: "Map columns" },
    { id: "preview", label: "Preview" },
    { id: "done", label: "Done" },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                i < stepIndex
                  ? "bg-primary text-primary-foreground"
                  : i === stepIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span
              className={`text-sm ${i === stepIndex ? "font-medium" : "text-muted-foreground"}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <Card>
          <CardContent className="pt-6">
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop your file here</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV, Excel (.xlsx, .xls) — max {MAX_ROWS} rows
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </label>
            <p className="text-xs text-muted-foreground mt-4">
              Accepts CSV or Excel files. Required columns: <strong>Email</strong>,{" "}
              <strong>First Name</strong>, <strong>Last Name</strong>. Column names are auto-detected.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Column mapping ── */}
      {step === "mapping" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {rawRows.length} rows detected. Map each CSV column to a lead field.
              </p>
            </div>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CSV Column</TableHead>
                    <TableHead>Sample value</TableHead>
                    <TableHead>Maps to</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {headers.map((col) => (
                    <TableRow key={col}>
                      <TableCell className="font-medium text-sm">{col}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {rawRows[0]?.[col] ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[col] ?? "ignore"}
                          onValueChange={(val) =>
                            setMapping((prev) => ({ ...prev, [col]: val ?? "ignore" }))
                          }
                        >
                          <SelectTrigger className="h-8 w-44 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LEAD_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                                {f.required && (
                                  <span className="text-destructive ml-1">*</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Back
              </Button>
              <Button onClick={handleContinueToPreview}>
                Preview import
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Preview ── */}
      {step === "preview" && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span>{validCount} valid</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span>{invalidCount} invalid (will be skipped)</span>
                </div>
              )}
            </div>

            {/* Preview table — first 10 rows */}
            <div className="rounded-lg border overflow-auto max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validated.slice(0, 10).map((v, i) => (
                    <TableRow
                      key={i}
                      className={v.errors.length > 0 ? "bg-destructive/5" : ""}
                    >
                      <TableCell>
                        {v.errors.length === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {v.lead?.first_name ?? v.row[Object.keys(mapping).find(k => mapping[k] === 'first_name') ?? ''] ?? '—'}{' '}
                        {v.lead?.last_name ?? v.row[Object.keys(mapping).find(k => mapping[k] === 'last_name') ?? ''] ?? ''}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.lead?.email ?? v.row[Object.keys(mapping).find(k => mapping[k] === 'email') ?? ''] ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.lead?.company_name ?? '—'}
                      </TableCell>
                      <TableCell className="text-xs text-destructive">
                        {v.errors.join(", ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {validated.length > 10 && (
              <p className="text-xs text-muted-foreground">
                Showing first 10 of {validated.length} rows.
              </p>
            )}

            {invalidCount > 0 && (
              <div className="flex items-start gap-2 rounded-lg bg-orange-50 border border-orange-200 p-3">
                <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                <p className="text-xs text-orange-700">
                  {invalidCount} row{invalidCount > 1 ? "s" : ""} with errors will be skipped.
                  Go back to fix the column mapping if needed.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={isPending || validCount === 0}>
                {isPending
                  ? "Importing…"
                  : `Import ${validCount} lead${validCount !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Done ── */}
      {step === "done" && result && (
        <Card>
          <CardContent className="pt-6 space-y-5">
            <div className="text-center space-y-1">
              <CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
              <p className="font-semibold text-lg mt-2">Import complete</p>
            </div>
            <div className="flex justify-center gap-8 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                <div className="text-muted-foreground">Imported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{result.skipped}</div>
                <div className="text-muted-foreground">Skipped (duplicate)</div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{result.errors.length}</div>
                  <div className="text-muted-foreground">Errors</div>
                </div>
              )}
            </div>
            {result.errors.length > 0 && (
              <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-destructive">
                    {e}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setHeaders([]);
                  setRawRows([]);
                  setMapping({});
                  setValidated([]);
                  setResult(null);
                }}
              >
                Import another file
              </Button>
              <Button onClick={() => router.push("/leads")}>
                Go to leads
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
