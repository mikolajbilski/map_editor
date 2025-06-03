from django.shortcuts import render
from django.http import StreamingHttpResponse
import time

def sse_view(request):
    def event_stream():
        while True:
            yield f": keep-alive\n\n"
            time.sleep(15)
    
    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response

def custom_404(request, exception):
    return render(request, '404.html', status=404)
