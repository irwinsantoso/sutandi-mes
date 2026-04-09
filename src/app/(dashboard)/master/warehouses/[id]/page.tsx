import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { LocationClient } from "./_components/location-client";

interface WarehouseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function WarehouseDetailPage({
  params,
}: WarehouseDetailPageProps) {
  const { id } = await params;

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      locations: {
        orderBy: { code: "asc" },
      },
    },
  });

  if (!warehouse) {
    notFound();
  }

  const locations = warehouse.locations.map((loc) => ({
    id: loc.id,
    code: loc.code,
    name: loc.name,
    zone: loc.zone,
    isActive: loc.isActive,
    warehouseId: loc.warehouseId,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          render={<Link href="/master/warehouses" />}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <PageHeader
          title={warehouse.name}
          description={`Warehouse ${warehouse.code}`}
        />
        <div className="ml-auto">
          <Badge variant={warehouse.isActive ? "default" : "secondary"}>
            {warehouse.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Code</p>
            <p className="font-medium">{warehouse.code}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{warehouse.name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{warehouse.address || "-"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight">Locations</h2>
        <LocationClient warehouseId={warehouse.id} data={locations} />
      </div>
    </div>
  );
}
