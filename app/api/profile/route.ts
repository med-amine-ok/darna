import { getCurrentUser, updateUser } from "@/lib/data/auth";
import { mockCurrentUserStore } from "@/lib/mock-data";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const resolvedUser = user || mockCurrentUserStore;
    return NextResponse.json(resolvedUser);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch user profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    const targetUser = user || mockCurrentUserStore;

    const body = await request.json();
    const {
      name,
      image,
      phone,
      location,
      bio,
      languages,
      interests,
      occupation,
      emergencyContact,
      notificationPreferences,
    } = body;

    const updates: Record<string, any> = {};
    if (name !== undefined) updates.name = name;
    if (image !== undefined) updates.image = image;
    if (phone !== undefined) updates.phone = phone;
    if (location !== undefined) updates.location = location;
    if (bio !== undefined) updates.bio = bio;
    if (languages !== undefined) updates.languages = languages;
    if (interests !== undefined) updates.interests = interests;
    if (occupation !== undefined) updates.occupation = occupation;
    if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
    if (notificationPreferences !== undefined) updates.notificationPreferences = notificationPreferences;

    const updated = await updateUser(targetUser.id, updates);
    return NextResponse.json(updated || { ...targetUser, ...updates });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
