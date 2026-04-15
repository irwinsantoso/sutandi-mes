import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { KopParseResult } from "@/lib/kop-import";
import { estimateItemMatch, type MatchConfidence } from "@/lib/kop-matcher";

export interface KopPreviewLine {
  kopCode: string;
  section: "output" | "material" | "accessory";
  quantity: number;
  uomCode: string;
  matchedItemId: string | null;
  matchedItemCode: string | null;
  matchedItemName: string | null;
  confidence: MatchConfidence;
}

export interface KopPreviewResponse {
  lines: KopPreviewLine[];
  missingUomCodes: string[];
  orderAlreadyExists: boolean;
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: { kop: KopParseResult } = await request.json();
  const kop = body.kop;
  if (!kop) {
    return NextResponse.json({ error: "Missing KOP payload" }, { status: 400 });
  }

  const [items, uoms, existingOrder] = await Promise.all([
    prisma.item.findMany({ select: { id: true, code: true, name: true } }),
    prisma.uom.findMany({ select: { code: true } }),
    kop.header.orderNumber
      ? prisma.productionOrder.findUnique({
          where: { orderNumber: kop.header.orderNumber },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const uomCodesLower = new Set(uoms.map((u) => u.code.toLowerCase()));

  const neededUomCodes = new Set<string>(["pcs"]);
  for (const m of kop.materials) neededUomCodes.add(m.uomCode.toLowerCase());
  const missingUomCodes = Array.from(neededUomCodes).filter(
    (c) => !uomCodesLower.has(c)
  );

  const lines: KopPreviewLine[] = [];

  for (const o of kop.outputs) {
    const match = estimateItemMatch(o.itemCode, items);
    lines.push({
      kopCode: o.itemCode,
      section: "output",
      quantity: o.quantity,
      uomCode: "pcs",
      matchedItemId: match.item?.id ?? null,
      matchedItemCode: match.item?.code ?? null,
      matchedItemName: match.item?.name ?? null,
      confidence: match.confidence,
    });
  }

  for (const m of kop.materials) {
    const match = estimateItemMatch(m.itemCode, items);
    lines.push({
      kopCode: m.itemCode,
      section: m.section === "material" ? "material" : "accessory",
      quantity: m.quantity,
      uomCode: m.uomCode,
      matchedItemId: match.item?.id ?? null,
      matchedItemCode: match.item?.code ?? null,
      matchedItemName: match.item?.name ?? null,
      confidence: match.confidence,
    });
  }

  const response: KopPreviewResponse = {
    lines,
    missingUomCodes,
    orderAlreadyExists: !!existingOrder,
  };

  return NextResponse.json(response);
}
