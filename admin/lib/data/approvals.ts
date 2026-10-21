// TODO: replace with Supabase query
import { store } from "@/lib/mock-data/store";
import { ModerationCase } from "@/lib/types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function getApprovalsInbox(tab: string = "hosts") {
  await delay(180);

  // Compute live cases for each queue
  const hostCases: ModerationCase[] = store.hosts
    .filter((h) => h.status === "under_review" || h.status === "applied")
    .map((h) => {
      const waitingDays = Math.max(1, Math.floor((Date.now() - new Date(h.joinedAt).getTime()) / 86400000));
      return {
        id: `mod_h_${h.id}`,
        type: "host",
        entityId: h.id,
        title: h.businessName || h.ownerName,
        subtitle: `${h.hostType.toUpperCase()} · ${h.city}`,
        submittedAt: h.joinedAt,
        waitingDays,
        priority: waitingDays > 3 ? "high" : "normal",
        hostType: h.hostType,
        wilayaCode: h.wilayaCode,
        status: h.status,
        details: h,
      };
    });

  const listingCases: ModerationCase[] = store.listings
    .filter((l) => l.status === "pending_review")
    .map((l) => {
      const waitingDays = Math.max(1, Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 86400000));
      return {
        id: `mod_l_${l.id}`,
        type: "listing",
        entityId: l.id,
        title: l.title,
        subtitle: `${l.category.toUpperCase()} · ${l.hostName} · ${l.price} DZD`,
        submittedAt: l.createdAt,
        waitingDays,
        priority: waitingDays > 4 ? "high" : "normal",
        vertical: l.category,
        wilayaCode: l.wilayaCode,
        status: l.status,
        details: l,
      };
    });

  const documentCases: ModerationCase[] = [];
  store.hosts.forEach((h) => {
    h.documents
      .filter((d) => d.status === "pending")
      .forEach((d) => {
        const waitingDays = Math.max(1, Math.floor((Date.now() - new Date(d.uploadedAt).getTime()) / 86400000));
        documentCases.push({
          id: `mod_d_${d.id}`,
          type: "document",
          entityId: d.id,
          title: d.title,
          subtitle: `Uploaded by ${h.businessName || h.ownerName} (${h.hostType})`,
          submittedAt: d.uploadedAt,
          waitingDays,
          priority: waitingDays > 3 ? "high" : "normal",
          hostType: h.hostType,
          status: d.status,
          details: { document: d, host: h },
        });
      });
  });

  const reviewCases: ModerationCase[] = store.reviews
    .filter((r) => r.status === "flagged")
    .map((r) => {
      const waitingDays = Math.max(1, Math.floor((Date.now() - new Date(r.createdAt).getTime()) / 86400000));
      return {
        id: `mod_r_${r.id}`,
        type: "review",
        entityId: r.id,
        title: `Flagged Review on: ${r.listingTitle}`,
        subtitle: `Guest: ${r.guestName} · Rating: ${r.rating}★ · Reason: ${r.flagReason || "User flagged"}`,
        submittedAt: r.createdAt,
        waitingDays,
        priority: "high",
        status: r.status,
        details: r,
      };
    });

  const disputeCases: ModerationCase[] = store.bookings
    .filter((b) => b.status === "disputed")
    .map((b) => {
      const waitingDays = Math.max(1, Math.floor((Date.now() - new Date(b.createdAt).getTime()) / 86400000));
      return {
        id: `mod_b_${b.id}`,
        type: "dispute",
        entityId: b.id,
        title: `Booking Dispute: ${b.reference}`,
        subtitle: `${b.guestName} vs ${b.hostName} · ${b.totalAmountDzd} DZD`,
        submittedAt: b.createdAt,
        waitingDays,
        priority: "high",
        status: b.status,
        details: b,
      };
    });

  const counts = {
    hosts: hostCases.length,
    listings: listingCases.length,
    documents: documentCases.length,
    reviews: reviewCases.length,
    disputes: disputeCases.length,
    total: hostCases.length + listingCases.length + documentCases.length + reviewCases.length + disputeCases.length,
  };

  let activeList: ModerationCase[] = [];
  if (tab === "listings") activeList = listingCases;
  else if (tab === "documents") activeList = documentCases;
  else if (tab === "reviews") activeList = reviewCases;
  else if (tab === "disputes") activeList = disputeCases;
  else activeList = hostCases;

  // Oldest first
  activeList.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

  return {
    items: activeList,
    counts,
  };
}
