from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token
from routes.models import BackgroundImage, Route, RoutePoint
from django.core.files.uploadedfile import SimpleUploadedFile
import io
from PIL import Image

class ApiTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test users
        cls.user1 = User.objects.create_user(
            username='apiuser1',
            email='api1@example.com',
            password='apipassword1'
        )
        cls.user2 = User.objects.create_user(
            username='apiuser2',
            email='api2@example.com',
            password='apipassword2'
        )
        
        # Create tokens for users
        cls.token1 = Token.objects.create(user=cls.user1)
        cls.token2 = Token.objects.create(user=cls.user2)
        
        # Create a test background image
        image_file = cls._create_test_image()
        cls.background = BackgroundImage.objects.create(
            title='API Test Background',
            image=image_file
        )
        
        # Create a route for user1
        cls.route1 = Route.objects.create(
            user=cls.user1,
            background=cls.background,
            name='API User1 Route'
        )
        
        # Create a route for user2
        cls.route2 = Route.objects.create(
            user=cls.user2,
            background=cls.background,
            name='API User2 Route'
        )
        
        # Create points for routes
        cls.point1 = RoutePoint.objects.create(
            route=cls.route1,
            x=0.1,
            y=0.1,
            order=0
        )
        
        cls.point2 = RoutePoint.objects.create(
            route=cls.route2,
            x=0.2,
            y=0.2,
            order=0
        )
    
    @staticmethod
    def _create_test_image():
        # Create a test image file
        image = Image.new('RGB', (100, 100), color='red')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_file = SimpleUploadedFile(
            "test_api_image.jpg", 
            image_io.getvalue(), 
            content_type="image/jpeg"
        )
        return image_file
    
    def setUp(self):
        # Set up API client
        self.client = APIClient()
    
    def test_authentication_required(self):
        """Test that authentication is required for API endpoints"""
        # Try to access without authentication
        response = self.client.get('/routes/api/routes/')
        self.assertEqual(response.status_code, 401)
        
        response = self.client.get('/routes/api/backgrounds/')
        self.assertEqual(response.status_code, 401)
    
    def test_list_routes(self):
        """Test listing routes via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.get('/routes/api/routes/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        # Should only return routes for user1
        self.assertEqual(len(data['results']), 1)
        self.assertEqual(data['results'][0]['name'], 'API User1 Route')
    
    def test_get_route_detail(self):
        """Test getting route details via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.get(f'/routes/api/routes/{self.route1.id}/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(data['name'], 'API User1 Route')
        # Check that points are included
        self.assertTrue('points' in data)
        self.assertEqual(len(data['points']), 1)
        self.assertEqual(data['points'][0]['x'], 0.1)
    
    def test_cannot_access_others_route(self):
        """Test that a user cannot access another user's route via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.get(f'/routes/api/routes/{self.route2.id}/')
        
        # Should return 404 (not found) since user1 can't see user2's routes
        self.assertEqual(response.status_code, 404)
    
    def test_create_route(self):
        """Test creating a new route via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        data = {
            'name': 'New API Route',
            'background': self.background.id
        }
        
        response = self.client.post('/routes/api/routes/', data, format='json')
        
        self.assertEqual(response.status_code, 201)
        
        # Get the ID of the new route
        new_route_id = response.json()['id']
        
        # Check that the route was created with correct data
        route = Route.objects.get(id=new_route_id)
        self.assertEqual(route.name, 'New API Route')
        self.assertEqual(route.user, self.user1)
        self.assertEqual(route.background, self.background)
    
    def test_list_route_points(self):
        """Test listing points for a route via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.get(f'/routes/api/routes/{self.route1.id}/points/')
        
        self.assertEqual(response.status_code, 200)
        data = response.json()
        
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['x'], 0.1)
        self.assertEqual(data[0]['y'], 0.1)
    
    def test_delete_point(self):
        """Test deleting a point via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.delete(
            f'/routes/api/routes/{self.route1.id}/points/{self.point1.id}/'
        )
        
        self.assertEqual(response.status_code, 204)
        
        # Verify the point was deleted
        self.assertFalse(RoutePoint.objects.filter(id=self.point1.id).exists())
    
    def test_cannot_delete_others_point(self):
        """Test that a user cannot delete another user's point via API"""
        # Authenticate as user1
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token1.key}')
        
        response = self.client.delete(
            f'/routes/api/routes/{self.route2.id}/points/{self.point2.id}/'
        )
        
        # Should return 404 (not found) since user1 can't see user2's routes/points
        self.assertEqual(response.status_code, 404)
        
        # Verify the point was not deleted
        self.assertTrue(RoutePoint.objects.filter(id=self.point2.id).exists())
