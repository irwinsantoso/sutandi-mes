import { Boxes, PackagePlus, Factory, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const kpiCards = [
  {
    title: "Total Items",
    value: "1,248",
    icon: Boxes,
    description: "Registered items in master data",
  },
  {
    title: "Pending Inbound",
    value: "23",
    icon: PackagePlus,
    description: "Awaiting receipt confirmation",
  },
  {
    title: "Active Production Orders",
    value: "7",
    icon: Factory,
    description: "Currently in progress",
  },
  {
    title: "Low Stock Items",
    value: "15",
    icon: AlertTriangle,
    description: "Below minimum threshold",
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Sutandi MES Warehouse Management.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <card.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
