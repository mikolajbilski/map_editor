from django.test import TestCase
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from routes.models import BackgroundImage, Route, RoutePoint
from PIL import Image
import io

class ModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create a test user
        cls.user = User.objects.create_user(
            username='testuser', 
            email='test@example.com', 
            password='testpassword'
        )
        
        # Create a test image
        image_file = cls._create_test_image()
        cls.background = BackgroundImage.objects.create(
            title='Test Background',
            image=image_file
        )
        
        # Create a route
        cls.route = Route.objects.create(
            user=cls.user,
            background=cls.background,
            name='Test Route'
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
    
    def test_background_image_creation(self):
        """Test that a background image can be created with expected attributes"""
        self.assertEqual(self.background.title, 'Test Background')
        self.assertTrue(self.background.image)
        self.assertEqual(str(self.background), 'Test Background')
    
    def test_route_creation(self):
        """Test that a route can be created with expected attributes and relationships"""
        self.assertEqual(self.route.name, 'Test Route')
        self.assertEqual(self.route.user, self.user)
        self.assertEqual(self.route.background, self.background)
        self.assertEqual(str(self.route), 'Test Route by testuser')
    
    def test_route_point_creation(self):
        """Test that route points can be created and related to a route"""
        point = RoutePoint.objects.create(
            route=self.route,
            x=0.5,
            y=0.5,
            order=0
        )
        
        self.assertEqual(point.x, 0.5)
        self.assertEqual(point.y, 0.5)
        self.assertEqual(point.order, 0)
        self.assertEqual(point.route, self.route)
        self.assertEqual(str(point), '(0.5, 0.5)')
    
    def test_route_and_points_relationship(self):
        """Test the relationship between a route and its points"""
        # Create some points for the route
        RoutePoint.objects.create(route=self.route, x=0.1, y=0.1, order=0)
        RoutePoint.objects.create(route=self.route, x=0.2, y=0.2, order=1)
        RoutePoint.objects.create(route=self.route, x=0.3, y=0.3, order=2)
        
        # Get points from the route
        points = self.route.points.all()
        
        self.assertEqual(points.count(), 3)
        self.assertEqual(points[0].x, 0.1)
        self.assertEqual(points[1].x, 0.2)
        self.assertEqual(points[2].x, 0.3)
