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
                        yield f"data: {json.dumps(message)}\n\n"
                else:
                    yield ": keep-alive\n\n"

                sleep(1)  # Poll interval reduced to 1 second
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
