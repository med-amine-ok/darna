import { Notification } from "@/types";

export const mockNotifications: Notification[] = [
  {
    id: "notif_01",
    userId: "usr_yacine",
    type: "booking",
    title: "Reservation Confirmed",
    message: "Your stay at Seaside Luxury Villa in Tipaza is confirmed for Nov 15–20, 2026.",
    link: "/trips",
    read: false,
    createdAt: "2026-10-07T14:30:00.000Z",
  },
  {
    id: "notif_02",
    userId: "usr_yacine",
    type: "message",
    title: "New message from Amina Benali",
    message: "Marhaban Yacine! The villa will be fully ready by 2:00 PM tomorrow.",
    link: "/messages/conv_01",
    read: false,
    createdAt: "2026-10-07T11:45:00.000Z",
  },
  {
    id: "notif_03",
    userId: "usr_yacine",
    type: "price",
    title: "Price drop on saved stay",
    message: "Modern Seafront Apartment in Oran is now 15% off for upcoming dates in November.",
    link: "/listings/lst_oran_seafront",
    read: true,
    createdAt: "2026-10-06T09:15:00.000Z",
  },
  {
    id: "notif_04",
    userId: "usr_yacine",
    type: "system",
    title: "Identity Verification Approved",
    message: "Your Algerian National ID verification has been successfully verified. Trust badge added.",
    link: "/settings",
    read: true,
    createdAt: "2026-10-04T16:20:00.000Z",
  },
];
