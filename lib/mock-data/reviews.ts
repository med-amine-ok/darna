import { SafeReview } from "@/types";
import { initialMockUsers } from "./users";

export const initialMockReviews: SafeReview[] = [
  {
    id: "review-1",
    listingId: "listing-1",
    userId: "user-8",
    rating: 5,
    comment:
      "An absolute dream of a stay! The sunset terrace views are even better in person than in the photos. The saltwater pool was crystal clear and the private stairs to the sea made daily swims effortless.",
    createdAt: "2024-05-18T14:30:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-8"),
  },
  {
    id: "review-2",
    listingId: "listing-1",
    userId: "user-3",
    rating: 5,
    comment:
      "Architecturally brilliant. The seamless transition between indoor and outdoor living was exquisite. Sophia was a wonderful host with great local restaurant recommendations.",
    createdAt: "2024-05-24T10:15:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-3"),
  },
  {
    id: "review-3",
    listingId: "listing-2",
    userId: "user-9",
    rating: 5,
    comment:
      "Staying in an authentic windmill was unforgettable! The interior craftsmanship was outstanding, combining historical integrity with modern comfort. The canal bicycles were a delightful bonus.",
    createdAt: "2024-05-30T16:45:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-9"),
  },
  {
    id: "review-4",
    listingId: "listing-3",
    userId: "user-1",
    rating: 5,
    comment:
      "Peaceful and profoundly restorative. The cedar onsen bath amidst the bamboo trees in the morning mist was a spiritual experience. Yuki's hospitality is second to none.",
    createdAt: "2024-06-02T09:20:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-1"),
  },
  {
    id: "review-5",
    listingId: "listing-7",
    userId: "user-4",
    rating: 5,
    comment:
      "The ski-in ski-out access was seamless! Sitting in the outdoor hot tub watching snow fall over the Matterhorn was breathtaking. Spotlessly clean and well-appointed.",
    createdAt: "2024-06-05T18:10:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-4"),
  },
  {
    id: "review-6",
    listingId: "listing-8",
    userId: "user-5",
    rating: 5,
    comment:
      "World-class luxury. From the private helipad greeting to the bespoke dining experience, every detail was executed with precision. Will certainly return next season.",
    createdAt: "2024-06-12T11:00:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-5"),
  },
  {
    id: "review-7",
    listingId: "listing-4",
    userId: "user-8",
    rating: 4,
    comment:
      "A magical Tuscan experience. The olive oil and wine from the estate were superb. The only minor note is that rural cellular reception is weak, but high-speed WiFi worked fine.",
    createdAt: "2024-06-14T15:40:00.000Z",
    status: "published",
    user: initialMockUsers.find((u) => u.id === "user-8"),
  },
  {
    id: "review-8",
    listingId: "listing-16",
    userId: "user-9",
    rating: 3,
    comment:
      "Great location right by the waves, but a bit smaller than expected for two people with large suitcases. Perfect for minimalist solo travelers though.",
    createdAt: "2024-06-16T12:00:00.000Z",
    status: "flagged",
    user: initialMockUsers.find((u) => u.id === "user-9"),
  },
];
