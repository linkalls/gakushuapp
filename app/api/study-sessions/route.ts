import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Assuming you have auth middleware
import { db } from "@/lib/db";
import { studySessions } from "@/lib/db/drizzle-schema";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const data = await db
      .select()
      .from(studySessions)
      .where(eq(studySessions.userId, session.user.id))
      .orderBy(desc(studySessions.createdAt));

    return NextResponse.json(data);
  } catch (error) {
    console.error("[STUDY_SESSIONS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { deckId, duration, cardsReviewed } = body;

    if (!deckId || !duration || !cardsReviewed) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    await db.insert(studySessions).values({
      userId: session.user.id,
      deckId,
      duration,
      cardsReviewed,
    });

    return new NextResponse("OK", { status: 200 });
  } catch (error) {
    console.error("[STUDY_SESSIONS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
