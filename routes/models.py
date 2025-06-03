from django.db import models
from django.conf import settings
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django_project.sse_engine import push_notification

# Create your models here.
class BackgroundImage(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to="backgrounds/")
    
    def __str__(self):
        return self.title
    
    def save(self, *args, **kwargs):
        # Make sure Pillow processes the image properly
        super().save(*args, **kwargs)

class Route(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    background = models.ForeignKey(BackgroundImage, on_delete=models.CASCADE)
    name = models.CharField(max_length=200, blank=True, null=True, default="Unnamed Route")
    created = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.name or 'Route'} by {self.user}"

class RoutePoint(models.Model):
    route = models.ForeignKey(Route, related_name="points", on_delete=models.CASCADE)
    x = models.FloatField()
    y = models.FloatField()
    order = models.IntegerField(default=0)
    def __str__(self):
        return f"({self.x}, {self.y})"

class GameBoard(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_boards')
    title = models.CharField(max_length=100)
    rows = models.IntegerField()
    cols = models.IntegerField()
    dots = models.JSONField(default=list)  # Make sure we're using JSONField
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.rows}x{self.cols})"

@receiver(post_save, sender=GameBoard)
def gameboard_post_save(sender, instance, created, **kwargs):
    if created:
        push_notification({
            "type": "board_created",
            "user": instance.user.username,
            "board_id": instance.id,
            "title": instance.title
        })
    else:
        push_notification({
            "type": "board_updated",
            "user": instance.user.username,
            "board_id": instance.id,
            "title": instance.title
        })

class GamePath(models.Model):
    """
    Stores paths drawn by a user on a specific game board.
    Each path connects dots of the same color.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='game_paths')
    board = models.ForeignKey(GameBoard, on_delete=models.CASCADE, related_name='paths')
    # Store different paths for each color pair
    paths_data = models.JSONField(default=dict)  # Format: {'#color': [{row: x, col: y}, ...], ...}
    created = models.DateTimeField(auto_now_add=True)
    updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Ensure each user has only one set of paths per board
        unique_together = ('user', 'board')
        
    def __str__(self):
        return f"Paths by {self.user.username} on {self.board.title}"
    
# Add this signal for GamePath
@receiver(post_save, sender=GamePath)
def gamepath_post_save(sender, instance, created, **kwargs):
    if created:
        push_notification({
            "type": "paths_created",
            "user": instance.user.username,
            "board_id": instance.board.id,
            "paths_data": instance.paths_data
        })
    else:
        push_notification({
            "type": "paths_updated",
            "user": instance.user.username,
            "board_id": instance.board.id,
            "paths_data": instance.paths_data
        })