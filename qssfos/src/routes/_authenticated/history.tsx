import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Download, History, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/pos/format";
import {
  historyToCsv,
  orderCustomerName,
  orderCustomerPhone,
  todayKey,
  useOrderHistory,
} from "@/lib/pos/history";
import {
  downloadCsv,
  useArchiveOrder,
  useDeleteOrder,
  useOrderArchives,
} from "@/lib/pos/archives";
import type { OrderWithItems } from "@/lib/pos/types";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Order history — QSSF OS" },
      {
        name: "description",
        content:
          "Daily audit log of every order: customer name, contact, items, payment and status timeline.",
      },
      { property: "og:title", content: "Order history — QSSF OS" },
      {
        property: "og:description",
        content: "Daily audit log of every order placed across your kitchen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

const statusTone: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400",
  preparing: "bg-blue-500/15 text-blue-400",
  ready: "bg-violet-500/15 text-violet-400",
  completed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

function HistoryPage() {
  const [date, setDate] = useState(todayKey());
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const { data, isLoading } = useOrderHistory(date);

  const orders = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? []).filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!term) return true;
      return (
        String(o.order_number).includes(term) ||
        orderCustomerName(o).toLowerCase().includes(term) ||
        orderCustomerPhone(o).includes(term) ||
        (o.order_items ?? []).some((i) => i.product_name.toLowerCase().includes(term))
      );
    });
  }, [data, q, status]);

  const totals = useMemo(() => {
    const billable = orders.filter((o) => o.status !== "cancelled");
    const revenue = billable.reduce((s, o) => s + Number(o.total), 0);
    return {
      count: orders.length,
      revenue,
      avg: billable.length ? revenue / billable.length : 0,
      cancelled: orders.length - billable.length,
    };
  }, [orders]);

  function exportCsv() {
    const blob = new Blob([historyToCsv(orders)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Order history</h1>
            <p className="text-sm text-muted-foreground">
              Daily audit log — every order, customer and payment, kept after completion.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!orders.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Orders logged" value={String(totals.count)} />
        <Stat label="Revenue" value={formatINR(totals.revenue)} />
        <Stat label="Average bill" value={formatINR(totals.avg)} />
        <Stat label="Cancelled" value={String(totals.cancelled)} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => setDate(e.target.value)}
          className="w-[170px]"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, item or order #"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-sm text-muted-foreground">
          No orders logged for this day.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <LogRow key={o.id} order={o} />
          ))}
        </div>
      )}

      <MonthlyArchives />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function MonthlyArchives() {
  const { data = [], isLoading } = useOrderArchives();
  if (isLoading || data.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4">
      <h2 className="text-sm font-semibold">Monthly archives</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        At the start of each month the previous month's orders are saved as a spreadsheet and
        removed from these daily views. Download any month below.
      </p>
      <ul className="mt-3 divide-y divide-border/50">
        {data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm font-medium">{a.label}</p>
              <p className="text-xs text-muted-foreground">
                {a.order_count} orders · {formatINR(a.total)}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadCsv(`orders-${a.period}.csv`, a.csv)}
            >
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LogRow({ order }: { order: OrderWithItems }) {
  const archive = useArchiveOrder();
  const remove = useDeleteOrder();
  const phone = orderCustomerPhone(order);
  const stamps = [
    ["Placed", order.created_at],
    ["Accepted", order.accepted_at],
    ["Ready", order.ready_at],
  ].filter(([, v]) => Boolean(v)) as [string, string][];

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">#{order.order_number}</p>
            <Badge className={statusTone[order.status] ?? ""} variant="secondary">
              {order.status}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.source === "pos" ? "Counter" : "Online"}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {order.order_type.replace("_", " ")}
            </Badge>
          </div>
          <p className="mt-1 text-sm">
            {orderCustomerName(order)}
            {phone ? <span className="text-muted-foreground"> · {phone}</span> : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{formatINR(Number(order.total))}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {order.payment_method ?? "unpaid"} · {order.payment_status}
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-1 border-t border-border/40 pt-3 text-sm text-muted-foreground">
        {(order.order_items ?? []).map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span>
              {i.quantity} × {i.product_name}
            </span>
            <span>{formatINR(Number(i.line_total))}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {stamps.map(([label, iso]) => (
          <span key={label}>
            {label}: {new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        ))}
        {order.rejection_reason ? (
          <span className="text-destructive">Rejected: {order.rejection_reason}</span>
        ) : null}
        {order.notes ? <span>Note: {order.notes}</span> : null}
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={archive.isPending}
          onClick={() => {
            archive.mutate(order.id, {
              onSuccess: () => toast.success(`Order #${order.order_number} archived`),
              onError: (e: Error) => toast.error(e.message),
            });
          }}
        >
          Archive
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          disabled={remove.isPending}
          onClick={() => {
            if (!window.confirm(`Delete order #${order.order_number}? This cannot be undone.`))
              return;
            remove.mutate(order.id, {
              onSuccess: () => toast.success(`Order #${order.order_number} deleted`),
              onError: (e: Error) => toast.error(e.message),
            });
          }}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}
