from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from routes.models import BackgroundImage, Route, RoutePoint
from django.core.files.uploadedfile import SimpleUploadedFile
import io
from PIL import Image

class ViewTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test users
        cls.user1 = User.objects.create_user(
            username='testuser1', 
            email='test1@example.com', 
            password='testpassword1'
        )
        cls.user2 = User.objects.create_user(
            username='testuser2', 
            email='test2@example.com', 
            password='testpassword2'
        )
        
        # Create a test background image
        image_file = cls._create_test_image()
        cls.background = BackgroundImage.objects.create(
            title='Test Background',
            image=image_file
        )
        
        # Create a route for user1
        cls.route1 = Route.objects.create(
            user=cls.user1,
            background=cls.background,
            name='User1 Route'
        )
        
        # Create a route for user2
        cls.route2 = Route.objects.create(
            user=cls.user2,
            background=cls.background,
            name='User2 Route'
        )
    
    @staticmethod
    def _create_test_image():
        # Create a test image file
        image = Image.new('RGB', (100, 100), color='red')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_file = SimpleUploadedFile(
            "test_image.jpg", 
            image_io.getvalue(), 
            content_type="image/jpeg"
        )
        return image_file

    def test_login_required_for_protected_views(self):
        """Test that login is required for protected views"""
        # Try to access protected views without login
        urls = [
            reverse('choose_background'),
            reverse('create_route', args=[self.background.id]),
            reverse('edit_route', args=[self.route1.id]),
        ]
        
        for url in urls:
            response = self.client.get(url)
            self.assertRedirects(
                response, 
                f"{reverse('login')}?next={url}",
                fetch_redirect_response=False
            )
    
    def test_user_can_view_own_route(self):
        """Test that a user can view their own route"""
        self.client.login(username='testuser1', password='testpassword1')
        
        response = self.client.get(reverse('edit_route', args=[self.route1.id]))
        
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'User1 Route')
        self.assertContains(response, 'Test Background')
    
    def test_user_cannot_view_others_route(self):
        """Test that a user cannot view another user's route"""
        self.client.login(username='testuser1', password='testpassword1')
        
        response = self.client.get(reverse('edit_route', args=[self.route2.id]))
        
        self.assertEqual(response.status_code, 404)
    
    def test_choose_background_view(self):
        """Test the choose background view"""
        self.client.login(username='testuser1', password='testpassword1')
        
        response = self.client.get(reverse('choose_background'))
        
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Test Background')
    
    def test_create_route(self):
        """Test creating a new route"""
        self.client.login(username='testuser1', password='testpassword1')
        
        response = self.client.get(reverse('create_route', args=[self.background.id]))
        
        # Should redirect to edit route page
        self.assertEqual(response.status_code, 302)
        
        # Find the newly created route
        new_route = Route.objects.filter(user=self.user1).exclude(id=self.route1.id).first()
        self.assertIsNotNone(new_route)
        self.assertEqual(new_route.background, self.background)
    
    def test_add_point_to_route(self):
        """Test adding a point to a route"""
        self.client.login(username='testuser1', password='testpassword1')
        
        # Add a point to the route
        response = self.client.post(
            reverse('edit_route', args=[self.route1.id]),
            {'x': '0.5', 'y': '0.5'}
        )
        
        # Should redirect back to edit route page
        self.assertEqual(response.status_code, 302)
        
        # Check if the point was added
        point = RoutePoint.objects.filter(route=self.route1).first()
        self.assertIsNotNone(point)
        self.assertEqual(point.x, 0.5)
        self.assertEqual(point.y, 0.5)
    
    def test_delete_route_point(self):
        """Test deleting a point from a route"""
        self.client.login(username='testuser1', password='testpassword1')
        
        # Add a point to delete
        point = RoutePoint.objects.create(
            route=self.route1,
            x=0.5,
            y=0.5,
            order=0
        )
        
        # Delete the point
        response = self.client.get(reverse('delete_route_point', args=[point.id]))
        
        # Should redirect back to edit route page
        self.assertEqual(response.status_code, 302)
        
        # Check if the point was deleted
        self.assertFalse(RoutePoint.objects.filter(id=point.id).exists())
    
    def test_user_cannot_delete_others_point(self):
        """Test that a user cannot delete another user's route point"""
        self.client.login(username='testuser1', password='testpassword1')
        
        # Create a point for user2's route
        point = RoutePoint.objects.create(
            route=self.route2,
            x=0.5,
            y=0.5,
            order=0
        )
        
        # Try to delete user2's point
        response = self.client.get(reverse('delete_route_point', args=[point.id]))
        
        # Should return 404
        self.assertEqual(response.status_code, 404)
        
        # Check that the point still exists
        self.assertTrue(RoutePoint.objects.filter(id=point.id).exists())
