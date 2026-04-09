import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UomConversionClient } from "./_components/uom-conversion-client";

const categoryLabelMap: Record<string, string> = {
  RAW_MATERIAL: "Raw Material",
  WIP: "WIP",
  FINISHED_GOOD: "Finished Good",
  PACKAGING: "Packaging",
  CONSUMABLE: "Consumable",
};

const categoryColorMap: Record<string, string> = {
  RAW_MATERIAL: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  WIP: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  FINISHED_GOOD: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  PACKAGING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  CONSUMABLE: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
};

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      baseUom: true,
      uomConversions: {
        include: {
          fromUom: true,
          toUom: true,
        },
      },
    },
  });

  if (!item) {
    notFound();
  }

  const uoms = await prisma.uom.findMany({
    orderBy: { name: "asc" },
  });

  const conversions = item.uomConversions.map((c) => ({
    id: c.id,
    fromUomId: c.fromUomId,
    fromUomName: c.fromUom.name,
    fromUomCode: c.fromUom.code,
    toUomId: c.toUomId,
    toUomName: c.toUom.name,
    toUomCode: c.toUom.code,
    conversionFactor: Number(c.conversionFactor),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={item.name} description={`Item code: ${item.code}`}>
        <Button variant="outline" render={<Link href={`/master/items/${item.id}/edit`} />}>
          <Pencil className="h-4 w-4" />
          Edit Item
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Item Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Code</p>
                <p className="font-mono font-medium">{item.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{item.name}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge className={categoryColorMap[item.category] || ""}>
                  {categoryLabelMap[item.category] || item.category}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Base UOM</p>
                <p className="font-medium">{item.baseUom.name} ({item.baseUom.code})</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={item.isActive ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}>
                  {item.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="text-sm">{item.description || "No description"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>UOM Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <UomConversionClient
              itemId={item.id}
              conversions={conversions}
              uoms={uoms}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
