import { NextResponse, NextRequest } from "next/server";
import { insertTranscript } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { videoId, url, transcriptText, language, isGenerated } = body;

    // Basic validation
    if (!videoId || !url || !transcriptText) {
      return NextResponse.json({ error: "Missing required fields: videoId, url, transcriptText" }, { status: 400 });
    }

    // Insert into database
    await insertTranscript({
      videoId,
      url,
      transcriptText,
      language: language || 'en',
      isGenerated: isGenerated || false,
    });

    return NextResponse.json({ message: "Transcript stored successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error storing transcript:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}