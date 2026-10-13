"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import { Link, useRouter } from "@/navigation";
import { Trip, User, Organization } from "@/types";
import { updateTrip, deleteTrip } from "@/lib/data/trips";
import PriceDisplay from "@/components/common/PriceDisplay";
import ConfirmDialog from "@/components/models/ConfirmDialog";
import { toast } from "react-toastify";
import {
  Compass,
  Plus,
  Calendar,
  Users,
  MapPin,
  Star,
  Search,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";

interface AgencyTripsClientProps {
  initialTrips: Trip[];
  currentUser?: User | null;
  organization?: Organization | null;
}

export default function AgencyTripsClient({
  initialTrips,
  currentUser,
  organization,
}: AgencyTripsClientProps) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter((trip) => {
      if (statusFilter !== "all" && trip.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !trip.title.toLowerCase().includes(q) &&
          !trip.city.toLowerCase().includes(q) &&
          !trip.locationValue.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [trips, searchQuery, statusFilter]);

  // KPIs
  const activeCount = trips.filter((t) => t.status === "active").length;
  const draftCount = trips.filter((t) => t.status === "draft").length;
  const totalDepartures = trips.reduce(
    (acc, t) => acc + (t.departureDates?.length || 0),
    0
  );

  // Toggle status
  const handleToggleStatus = async (trip: Trip) => {
    const nextStatus = trip.status === "active" ? "draft" : "active";
    try {
      const updated = await updateTrip(trip.id, { status: nextStatus });
      if (updated) {
        setTrips((prev) =>
          prev.map((t) => (t.id === trip.id ? { ...t, status: nextStatus } : t))
        );
        toast.info(
          nextStatus === "active"
            ? "Circuit published and live on DARNA."
            : "Circuit paused and hidden from public search."
        );
      }
    } catch {
      toast.error("Failed to update circuit status.");
    }
  };

  // Delete trip
  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const success = await deleteTrip(id);
      if (success) {
        setTrips((prev) => prev.filter((t) => t.id !== id));
        toast.success("Circuit permanently deleted from agency portfolio.");
        setDeletingId(null);
      }
    } catch {
      toast.error("Failed to delete circuit.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider mb-2">
            <Compass size={14} />
            <span>{organization?.name || "Agency Workspace"} · Exclusive Vertical</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-black text-primary">
            Agency Expeditions & Guided Circuits
          </h1>
          <p className="text-sm text-neutral-600 mt-1 max-w-2xl">
            Curate multi-day packaged expeditions across Algeria. Define day-by-day itineraries, scheduled departure dates, and all-inclusive pricing in DZD.
          </p>
        </div>

        {/* Add Trip CTA */}
        <button
          type="button"
          onClick={() => router.push("/host/agency/trips/new")}
          className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-2xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm self-start md:self-auto cursor-pointer btn-press"
        >
          <Plus size={18} className="text-tertiary" />
          <span>+ Add a Trip</span>
        </button>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Total Circuits
          </span>
          <span className="text-2xl font-black text-primary">{trips.length}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Online & Bookable
          </span>
          <span className="text-2xl font-black text-emerald-700">{activeCount}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-amber-600 uppercase tracking-wider">
            Scheduled Departures
          </span>
          <span className="text-2xl font-black text-amber-700">{totalDepartures}</span>
        </div>
        <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs">
          <span className="block text-xs font-bold text-secondary uppercase tracking-wider">
            Avg Traveler Rating
          </span>
          <span className="text-2xl font-black text-secondary flex items-center gap-1">
            4.95 <Star size={18} className="text-amber-500 fill-amber-500" />
          </span>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-tertiary/70 p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search
            size={18}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search circuit by title or wilaya..."
            className="w-full ps-10 pe-4 py-2 bg-neutral-50 border border-tertiary/80 rounded-xl text-xs sm:text-sm text-primary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "all"
                ? "bg-primary text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            All ({trips.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "active"
                ? "bg-emerald-700 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("draft")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              statusFilter === "draft"
                ? "bg-amber-600 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            Draft ({draftCount})
          </button>
        </div>
      </div>

      {/* Trips Feed / Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-3xl border border-tertiary/70 p-12 text-center space-y-4 shadow-2xs">
          <Compass size={48} className="mx-auto text-neutral-300" />
          <h3 className="font-serif text-lg font-bold text-primary">No Circuits Found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            {searchQuery
              ? "No circuits match your search criteria. Try a different term or clear filters."
              : "Your agency has not created any multi-day trips yet. Launch your first expedition."}
          </p>
          <button
            type="button"
            onClick={() => router.push("/host/agency/trips/new")}
            className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition"
          >
            Create First Circuit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTrips.map((trip) => {
            const nights = Math.max(1, trip.durationDays - 1);

            return (
              <div
                key={trip.id}
                className="bg-white rounded-3xl border border-tertiary/70 overflow-hidden shadow-2xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Media */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={trip.coverPhoto}
                      alt={trip.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                    {/* Top status & duration pills */}
                    <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                      <span className="px-3 py-1 rounded-full bg-white/95 backdrop-blur-md text-[11px] font-bold text-primary flex items-center gap-1.5 shadow-xs">
                        <Calendar size={13} className="text-secondary" />
                        <span>
                          {trip.durationDays} Days / {nights} Nights
                        </span>
                      </span>

                      <span
                        className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-xs ${
                          trip.status === "active"
                            ? "bg-emerald-500 text-white"
                            : "bg-amber-500 text-white"
                        }`}
                      >
                        {trip.status === "active" ? "● Active" : "○ Draft"}
                      </span>
                    </div>

                    {/* Bottom overlay: Location & Rating */}
                    <div className="absolute bottom-3 start-3 end-3 flex items-center justify-between text-white text-xs">
                      <div className="flex items-center gap-1 font-semibold">
                        <MapPin size={14} className="text-secondary" />
                        <span>{trip.city}, Algeria</span>
                      </div>
                      <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-lg text-xs font-bold">
                        <Star size={12} className="text-amber-400 fill-amber-400" />
                        <span>{trip.rating?.toFixed(2) || "New"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-serif text-lg font-bold text-primary line-clamp-1">
                      {trip.title}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>

                    {/* Logistics highlights */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-tertiary/40 text-xs">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Users size={14} className="text-secondary" />
                        <span>
                          Group: {trip.minGroupSize || 2}–{trip.maxGroupSize} guests
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <Layers size={14} className="text-secondary" />
                        <span>{trip.itinerary?.length || trip.durationDays} Days Itinerary</span>
                      </div>
                    </div>

                    {/* Scheduled departure dates chips */}
                    {trip.departureDates && trip.departureDates.length > 0 && (
                      <div className="pt-2">
                        <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                          Upcoming Departures ({trip.departureDates.length})
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {trip.departureDates.slice(0, 3).map((date) => (
                            <span
                              key={date}
                              className="px-2 py-0.5 rounded-lg bg-neutral-100 text-neutral-700 text-[11px] font-medium"
                            >
                              {date}
                            </span>
                          ))}
                          {trip.departureDates.length > 3 && (
                            <span className="text-[10px] text-neutral-400 font-semibold">
                              +{trip.departureDates.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="p-5 pt-3 border-t border-tertiary/40 bg-neutral-50/50 flex items-center justify-between gap-3">
                  <div>
                    <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                      Price per traveler
                    </span>
                    <PriceDisplay
                      price={trip.pricePerPerson}
                      priceClassName="text-base font-black text-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(trip)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        trip.status === "active"
                          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                      }`}
                    >
                      {trip.status === "active" ? "Pause" : "Publish"}
                    </button>

                    <Link
                      href={`/trips/${trip.id}`}
                      target="_blank"
                      className="p-2 rounded-xl bg-white border border-tertiary/70 text-neutral-700 hover:text-primary hover:border-primary transition shadow-2xs"
                      title="View public booking page"
                    >
                      <ExternalLink size={16} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeletingId(trip.id)}
                      className="p-2 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 transition shadow-2xs cursor-pointer"
                      title="Delete circuit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onCancel={() => setDeletingId(null)}
        onConfirm={() => {
          if (deletingId) handleDelete(deletingId);
        }}
        title="Delete Agency Circuit?"
        message="Are you sure you want to delete this trip? Existing bookings will remain on file, but this circuit will be permanently removed from your catalog and public search."
        confirmLabel="Delete Circuit"
        variant="destructive"
      />
    </div>
  );
}
