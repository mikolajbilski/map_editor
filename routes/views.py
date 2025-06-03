from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import BackgroundImage, Route, RoutePoint
from .forms import RoutePointForm
from django.http import HttpResponse, JsonResponse
import json
from .models import GameBoard, GamePath

from django_project.sse_engine import push_notification


def home(request):
    """
    Home page view that displays main navigation options.
    """
    return render(request, "home.html")


@login_required
def choose_background(request):
    backgrounds = BackgroundImage.objects.all()
    return render(request, "routes/choose_background.html", {"backgrounds": backgrounds})

@login_required
def create_route(request, bg_id):
    background = get_object_or_404(BackgroundImage, id=bg_id)
    route = Route.objects.create(user=request.user, background=background)
    return redirect("edit_route", route_id=route.id)

@login_required
def edit_route(request, route_id):
    route = get_object_or_404(Route, id=route_id, user=request.user)
    form = RoutePointForm(request.POST or None)
    if request.method == "POST":
        if "name" in request.POST:
            route.name = request.POST.get("name", "").strip()
            route.save()
        elif form.is_valid():
            point = form.save(commit=False)
            point.route = route
            point.order = route.points.count()
            point.save()
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return HttpResponse(status=201)
        return redirect("edit_route", route_id=route.id)
    return render(request, "routes/edit_route.html", {"route": route, "form": form})

@login_required
def delete_route_point(request, point_id):
    point = get_object_or_404(RoutePoint, id=point_id, route__user=request.user)
    route_id = point.route.id
    point.delete()
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        return HttpResponse(status=200)
    return redirect("edit_route", route_id=route_id)

@login_required
def clear_route_points(request, route_id):
    route = get_object_or_404(Route, id=route_id, user=request.user)
    route.points.all().delete()
    return redirect("edit_route", route_id=route_id)

@login_required
def user_routes(request):
    """
    View to list all routes for the currently logged-in user.
    """
    routes = Route.objects.filter(user=request.user)
    return render(request, "routes/user_routes.html", {"routes": routes})

@login_required
def connect_dots_list(request):
    boards = GameBoard.objects.filter(user=request.user).order_by('-updated')
    return render(request, 'connect_dots/board_list.html', {'boards': boards})

@login_required
def connect_dots_create(request):
    if request.method == 'POST':
        try:
            # Debug print to see what data we're receiving
            print("Received request for connect_dots_create")
            
            # Make sure we can parse the request body
            data = json.loads(request.body)
            print("Received data:", data)
            
            board = GameBoard(
                user=request.user,
                title=data.get('title', 'Untitled Board'),
                rows=data.get('rows', 5),
                cols=data.get('cols', 5),
                dots=data.get('dots', [])
            )
            board.save()
            print(f"Created board with ID: {board.id}")
            return JsonResponse({'success': True, 'id': board.id})
        except Exception as e:
            print(f"Error saving board: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    return render(request, 'connect_dots/board_editor.html')

@login_required
def connect_dots_edit(request, board_id):
    board = get_object_or_404(GameBoard, id=board_id, user=request.user)
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            print("Updating board with data:", data)  # Debug print
            
            board.title = data.get('title', board.title)
            board.rows = data.get('rows', board.rows)
            board.cols = data.get('cols', board.cols)
            board.dots = data.get('dots', board.dots)
            board.save()
            # Notification is now handled by post_save signal
            return JsonResponse({'success': True})
        except Exception as e:
            print(f"Error updating board: {str(e)}")  # Debug print
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    return render(request, 'connect_dots/board_editor.html', {'board': board})

@login_required
def connect_dots_delete(request, board_id):
    if request.method == 'POST':
        board = get_object_or_404(GameBoard, id=board_id, user=request.user)
        board.delete()
        return JsonResponse({'success': True})
    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=400)

@login_required
def board_list(request):
    """
    View to list all available boards from all users.
    """
    boards = GameBoard.objects.all().order_by('-updated')
    return render(request, 'connect_dots/board_list_play.html', {'boards': boards})

@login_required
def draw_path(request, board_id):
    """
    View to display a board and allow drawing paths on it.
    """
    board = get_object_or_404(GameBoard, id=board_id)
    
    # Check if the user already has paths for this board
    user_path = GamePath.objects.filter(user=request.user, board=board).first()
    
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            paths_data = data.get('paths_data', {})
            
            if user_path:
                # Update existing paths
                user_path.paths_data = paths_data
                user_path.save()
            else:
                # Create new paths
                user_path = GamePath.objects.create(
                    user=request.user,
                    board=board,
                    paths_data=paths_data
                )
            
            return JsonResponse({'success': True})
        except Exception as e:
            print(f"Error saving paths: {str(e)}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
    
    # For GET requests, render the template with board and paths data
    context = {
        'board': board,
        'paths': user_path.paths_data if user_path else {}
    }
    
    return render(request, 'connect_dots/draw_path.html', context)