import { NextResponse, NextRequest } from "next/server";
import { subscribeToJob } from "@/lib/db";

// Server-Sent Events endpoint for job progress streaming
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('SSE route called for job', id);
    const { readable, send, close } = createSSEStream();

    // Subscribe to progress/result events for this job id
    const unsubscribe = await subscribeToJob(id, (evt: { type: string; data: any }) => {
      console.log('SSE callback triggered for job', id, 'event:', evt);
      // evt: { type: "progress" | "token" | "done" | "error", data: any }
      send('message', JSON.stringify({ type: evt.type, data: evt.data }));
      if (evt.type === "done" || evt.type === "error") {
        // Allow client to finish reading before closing
        setTimeout(() => {
          close();
          unsubscribe();
        }, 50);
      }
    });

    console.log('SSE subscription set up for job', id);
    // Heartbeats so proxies don't kill the connection
    const ping = setInterval(() => send("ping", Date.now().toString()), 15000);

    // Clean up on client disconnect
    readable.cancel = () => {
      clearInterval(ping);
      unsubscribe();
      close();
      return Promise.resolve();
    };

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // for some proxies
      },
    });
  } catch (error) {
    console.error('SSE Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function createSSEStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;
  const queue: string[] = [];
  const stream = new ReadableStream({
    start(c) {
      controller = c;
      // Send queued messages
      while (queue.length) {
        controller.enqueue(encoder.encode(queue.shift()!));
      }
    }
  });
  const send = (event: string, data: string) => {
    const payload = `event: ${event}\ndata: ${data}\n\n`;
    if (controller) {
      controller.enqueue(encoder.encode(payload));
    } else {
      queue.push(payload);
    }
  };
  const close = () => controller?.close();
  return { readable: stream, send, close };
}