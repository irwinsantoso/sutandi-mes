import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { templateToBuffer, IMPORT_CONFIGS, type ImportType } from "@/lib/excel-import";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const importType = searchParams.get("type") as ImportType | null;

  if (!importType || !IMPORT_CONFIGS[importType]) {
    return NextResponse.json(
      { error: "Invalid import type" },
      { status: 400 }
    );
  }

  const config = IMPORT_CONFIGS[importType];
  const buffer = templateToBuffer(importType);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${config.sheetName.replace(/ /g, "_")}_Template.xlsx"`,
    },
  });
}
