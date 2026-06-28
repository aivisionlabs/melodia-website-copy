import { NextRequest, NextResponse } from "next/server";
import { getSongBySlugLightweight } from "@/lib/db/queries/select";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: "Song slug is required" },
        { status: 400 }
      );
    }

    const song = await getSongBySlugLightweight(slug);

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ song });
  } catch (error) {
    console.error("Error fetching lightweight song data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
