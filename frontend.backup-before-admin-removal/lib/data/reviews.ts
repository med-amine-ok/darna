// TODO: replace with Supabase query
import { Review } from "@/types";

export const mockReviews: Review[] = [
  {
    id: "rev_01",
    listingId: "lst_tipaza_villa",
    userId: "usr_yacine",
    rating: 5,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 5,
    comment:
      "Exceptional stay. The sunrise over the Roman ruins and the Mediterranean breeze made this an unforgettable family weekend. Amina was a thoughtful host.",
    createdAt: "2024-05-02T16:00:00.000Z",
    user: {
      id: "usr_yacine",
      name: "Yacine Cherif",
      image: "/assets/avatar.png",
    },
  },
  {
    id: "rev_02",
    listingId: "lst_tipaza_villa",
    userId: "usr_meriem",
    rating: 4.9,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 4.8,
    comment:
      "The private olive garden and cliffside patio are even better than the pictures. Impeccable cleanliness and instant check-in.",
    createdAt: "2024-06-15T10:30:00.000Z",
    user: {
      id: "usr_meriem",
      name: "Meriem Hadj",
      image: "/assets/avatar.png",
    },
  },
  {
    id: "rev_03",
    listingId: "lst_algiers_casbah",
    userId: "usr_sofiane",
    rating: 5,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 5,
    comment:
      "An authentic architectural treasure in the heart of the Casbah. The restored cedar woodwork and central patio fountain are breathtaking.",
    createdAt: "2024-06-20T14:15:00.000Z",
    user: {
      id: "usr_sofiane",
      name: "Sofiane Boudiaf",
      image: "/assets/avatar.png",
    },
  },
  {
    id: "rev_04",
    listingId: "lst_djanet_tassili",
    userId: "usr_leila",
    rating: 5,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 5,
    comment:
      "Life-changing desert expedition! The Tuareg guides were legendary, food around the campfire was delicious, and the stars in Tassili are out of this world.",
    createdAt: "2024-07-04T09:00:00.000Z",
    user: {
      id: "usr_leila",
      name: "Leila Zerrouki",
      image: "/assets/avatar.png",
    },
  },
  {
    id: "rev_05",
    listingId: "lst_toyota_landcruiser",
    userId: "usr_tarek",
    rating: 5,
    cleanliness: 5,
    accuracy: 5,
    communication: 5,
    location: 5,
    value: 5,
    comment:
      "The Prado handled our road trip through the Aurès and northern Sahara with zero issues. Clean, powerful, and airport handover was on time.",
    createdAt: "2024-07-12T18:45:00.000Z",
    user: {
      id: "usr_tarek",
      name: "Tarek Bensaada",
      image: "/assets/avatar.png",
    },
  },
];

export async function getReviewsByListingId(listingId: string): Promise<Review[]> {
  await new Promise((resolve) => setTimeout(resolve, 80));
  return mockReviews.filter((r) => r.listingId === listingId);
}

export async function getReviewsByUserId(userId: string): Promise<Review[]> {
  await new Promise((resolve) => setTimeout(resolve, 60));
  return mockReviews.filter((r) => r.userId === userId || r.listingId === "lst_tipaza_villa");
}
