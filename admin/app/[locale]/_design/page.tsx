"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Building,
  User,
  Star,
  DollarSign,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { Checkbox } from "@/components/ui/Checkbox";
import { Switch } from "@/components/ui/Switch";
import { Tabs } from "@/components/ui/Tabs";
import { StatusPill } from "@/components/ui/StatusPill";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Drawer } from "@/components/ui/Drawer";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { KpiCard } from "@/components/ui/KpiCard";
import { useToast } from "@/components/ui/Toast";

export default function DesignSystemShowcasePage() {
  const { toast, success, error, warning, info } = useToast();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rangeVal, setRangeVal] = useState<[number, number]>([5000, 45000]);
  const [multiSelectVal, setMultiSelectVal] = useState<string[]>(["16", "31"]);
  const [switchVal, setSwitchVal] = useState(true);
  const [activeTab, setActiveTab] = useState("tab1");
  const [page, setPage] = useState(1);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10 text-start">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-secondary/15 text-secondary border border-secondary/25">
            Internal Verification
          </span>
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">
            DARNA Design System & Primitives
          </h1>
        </div>
        <p className="text-xs text-neutral-500 mt-1">
          Earthy Minimal Palette: Primary (#2E3A2F), Secondary (#6B7F5B), Tertiary (#D9C9B2), Accent (#C96F4F), Background (#F8F6EE).
        </p>
      </div>

      {/* Buttons */}
      <section className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-primary">Buttons & Variants</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="primary" isLoading>
            Loading...
          </Button>
        </div>
        <div className="flex items-center gap-2 pt-2">
          <IconButton icon={<Search className="w-4 h-4" />} aria-label="Search" />
          <IconButton icon={<Filter className="w-4 h-4" />} aria-label="Filter" variant="secondary" />
          <IconButton icon={<Star className="w-4 h-4" />} aria-label="Star" variant="outline" />
        </div>
      </section>

      {/* Status Pills & Badges */}
      <section className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-primary">Status Pills (Accessible WCAG AA)</h2>
        <div className="flex flex-wrap gap-2">
          <StatusPill status="approved" />
          <StatusPill status="under_review" />
          <StatusPill status="pending_review" />
          <StatusPill status="rejected" />
          <StatusPill status="suspended" />
          <StatusPill status="banned" />
          <StatusPill status="active" />
          <StatusPill status="disputed" />
          <StatusPill status="flagged" />
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="primary">Primary Badge</Badge>
          <Badge variant="secondary">Secondary Badge</Badge>
          <Badge variant="accent">Accent Badge</Badge>
          <Badge variant="tertiary">Tertiary Badge</Badge>
        </div>
      </section>

      {/* Form Controls */}
      <section className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-primary">Form Controls & Inputs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Host Name" placeholder="e.g. Karim Benali" />
          <Select
            label="Property Type"
            options={[
              { value: "villa", label: "Villa / Private House" },
              { value: "apartment", label: "Traditional Apartment" },
              { value: "riad", label: "Casbah Heritage Riad" },
            ]}
          />
          <div className="flex flex-col gap-2 pt-5">
            <Checkbox label="Require Commercial Registration" defaultChecked />
            <Switch label="Instant Booking Mode" checked={switchVal} onChange={setSwitchVal} />
          </div>
        </div>

        <div className="pt-2">
          <MultiSelect
            label="Multi-Wilaya Selection"
            options={[
              { value: "16", label: "16 - Algiers (الجزائر)" },
              { value: "31", label: "31 - Oran (وهران)" },
              { value: "25", label: "25 - Constantine (قسنطينة)" },
              { value: "11", label: "11 - Tamanrasset (تمنراست)" },
              { value: "47", label: "47 - Ghardaïa (غرداية)" },
            ]}
            value={multiSelectVal}
            onChange={setMultiSelectVal}
            placeholder="Select Algerian Wilayas..."
          />
        </div>

        <div className="pt-2">
          <RangeSlider
            min={0}
            max={100000}
            step={1000}
            value={rangeVal}
            onChange={setRangeVal}
            label="Price Range (DZD) with Histogram"
            currency="DZD"
          />
        </div>
      </section>

      {/* KPI Cards with Sparklines */}
      <section className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-primary">KPI Cards with Sparklines</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Gross Revenue"
            value="4,850,000 DZD"
            delta="+24.2%"
            deltaType="increase"
            icon={<DollarSign className="w-5 h-5 text-secondary" />}
          />
          <KpiCard
            title="Active Listings"
            value="428"
            delta="+12.5%"
            deltaType="increase"
            icon={<Building className="w-5 h-5 text-secondary" />}
          />
          <KpiCard
            title="Dispute Rate"
            value="1.8%"
            delta="-0.4%"
            deltaType="decrease"
            icon={<AlertCircle className="w-5 h-5 text-accent" />}
          />
        </div>
      </section>

      {/* Toasts & Modals */}
      <section className="bg-white p-6 rounded-2xl border border-tertiary/80 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-primary">Modals, Drawers & Premium Toasts</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => success("Listing Approved", "Published to network search.", () => info("Undo clicked!"))}
          >
            Trigger Success Toast (with Undo)
          </Button>
          <Button variant="outline" onClick={() => error("Host Suspended", "Commercial tax ID expired.")}>
            Trigger Error Toast
          </Button>
          <Button variant="outline" onClick={() => setDrawerOpen(true)}>
            Open Side Inspection Drawer
          </Button>
          <Button variant="outline" onClick={() => setDialogOpen(true)}>
            Open Standard Dialog
          </Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Open Confirm Dialog
          </Button>
        </div>
      </section>

      {/* Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Side Inspection Drawer"
      >
        <div className="p-4 space-y-4 text-xs text-neutral-600">
          <p>
            RTL-aware drawer sliding from end direction with focus management and ESC key handling.
          </p>
          <div className="p-3 rounded-xl bg-darnaBg border border-tertiary">
            Host: <strong>Hotel Les Zianides (Tlemcen)</strong>
          </div>
        </div>
      </Drawer>

      {/* Dialog */}
      <Dialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Administrative Dialog"
      >
        <div className="space-y-4 text-xs text-neutral-600">
          <p>Modal dialog with frosted backdrop, keyboard focus trap, and auto-centering.</p>
          <div className="flex justify-end">
            <Button variant="primary" size="sm" onClick={() => setDialogOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          success("Confirmed", "Entity deletion executed.");
        }}
        title="Permanently Delete Listing?"
        description="This will permanently delete the stay and all historical calendar intervals. This action cannot be undone."
        confirmText="Confirm Permanent Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
