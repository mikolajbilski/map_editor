from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse, HttpResponseForbidden
from django.contrib.auth.decorators import login_required
from time import sleep
import json


from .sse_engine import (
    ClientQueue,
    register_client,
    unregister_client,
    push_notification
)

def sse_notifications_view(request):
    if not request.user.is_authenticated:
        return HttpResponseForbidden("Authentication required for SSE.")

    client = ClientQueue()
    register_client(client)

    def event_stream():
        try:
            while True:
                messages = client.pop_all()

                if messages:
                    for message in messages:
                        event_type = message.get("type", "message")
                        if event_type == "board_created":
                            yield f"event: newBoard\ndata: {json.dumps(message)}\n\n"
                        elif event_type == "board_updated":
                            yield f"event: boardUpdated\ndata: {json.dumps(message)}\n\n"
                        elif event_type == "paths_created":
                            yield f"event: newPaths\ndata: {json.dumps(message)}\n\n"
                        elif event_type == "paths_updated":
                            yield f"event: pathsUpdated\ndata: {json.dumps(message)}\n\n"
                        else:
                            yield f"event: message\ndata: {json.dumps(message)}\n\n"
                else:
                    yield f"event: heartbeat\ndata: {json.dumps({'type': 'heartbeat', 'msg': 'still alive'})}\n\n"

                sleep(1)
        except Exception as e:
            import sys
            print(f"SSE event_stream interrupted: {e}", file=sys.stderr)
        finally:
            unregister_client(client)

    return StreamingHttpResponse(
        event_stream(),
        content_type='text/event-stream'
    )


def custom_404(request, exception):
    return render(request, '404.html', status=404)
