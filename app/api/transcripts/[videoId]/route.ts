import { NextResponse, NextRequest } from 'next/server';
import { getTranscriptByVideoId } from '@/lib/db';  // Assuming you add this function

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;  // Await params as it's a Promise in Next.js 13+
    console.log('Fetching transcript for videoId:', videoId);

    // Fetch from DB
    const transcript = await getTranscriptByVideoId(videoId);
    if (!transcript) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    // Return the transcript text
    return NextResponse.json({ transcript_text: transcript.transcript_text });
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}