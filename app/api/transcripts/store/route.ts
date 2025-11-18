import { NextResponse, NextRequest } from "next/server";
import { insertTranscript } from "@/lib/db";
import { TranscriptDTO } from "@/lib/dto";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { video_id, url, transcript_text, language, is_generated } = body;

    // Basic validation
    if (!video_id || !url || !transcript_text) {
      return NextResponse.json({ error: "Missing required fields: video_id, url, transcript_text" }, { status: 400 });
    }
    const transcriptDTO = new TranscriptDTO({
      video_id,
      url,
      transcript_text,
      language: language || 'en',
      is_generated: is_generated || false,
    });

    await insertTranscript(transcriptDTO);

    return NextResponse.json({ message: "Transcript stored successfully" }, { status: 201 });
  } catch (error) {
    console.error("Error storing transcript:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}