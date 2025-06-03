from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from routes.models import BackgroundImage, Route, RoutePoint
from django.core.files.uploadedfile import SimpleUploadedFile
import io
from PIL import Image

class IntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test users
        cls.user = User.objects.create_user(
            username='integrationuser', 
            email='integration@example.com', 
            password='integrationpassword'
        )
        
        # Create a test background image
        image_file = cls._create_test_image()
        cls.background = BackgroundImage.objects.create(
            title='Integration Test Background',
            image=image_file
        )
    
    @staticmethod
    def _create_test_image():
        # Create a test image file
        image = Image.new('RGB', (100, 100), color='red')
        image_io = io.BytesIO()
        image.save(image_io, format='JPEG')
        image_file = SimpleUploadedFile(
            "integration_test_image.jpg", 
            image_io.getvalue(), 
            content_type="image/jpeg"
        )
        return image_file
    
    def test_full_route_creation_workflow(self):
        """
        Test the complete workflow:
        1. Login
        2. Choose background
        3. Create route
        4. Add points
        5. Delete points
        """
        # Login
        self.client.login(username='integrationuser', password='integrationpassword')
        
        # 1. Visit home page
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Welcome, integrationuser')
        
        # 2. Visit background selection page
        response = self.client.get(reverse('choose_background'))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Integration Test Background')
        
        # 3. Create a new route
        response = self.client.get(reverse('create_route', args=[self.background.id]))
        self.assertEqual(response.status_code, 302)  # Redirect to edit page
        
        # Get the newly created route
        new_route = Route.objects.get(user=self.user, background=self.background)
        
        # 4. Visit edit route page
        response = self.client.get(reverse('edit_route', args=[new_route.id]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Integration Test Background')
        
        # 5. Add a point to the route
        response = self.client.post(
            reverse('edit_route', args=[new_route.id]),
            {'x': '0.3', 'y': '0.4'}
        )
        self.assertEqual(response.status_code, 302)  # Redirect back to edit page
        
        # 6. Verify the point was added
        points = RoutePoint.objects.filter(route=new_route)
        self.assertEqual(points.count(), 1)
        self.assertEqual(points[0].x, 0.3)
        self.assertEqual(points[0].y, 0.4)
        
        # 7. Add another point
        response = self.client.post(
            reverse('edit_route', args=[new_route.id]),
            {'x': '0.6', 'y': '0.7'}
        )
        self.assertEqual(response.status_code, 302)
        
        # 8. Verify both points exist
        points = RoutePoint.objects.filter(route=new_route).order_by('order')
        self.assertEqual(points.count(), 2)
        
        # 9. Delete the first point
        response = self.client.get(reverse('delete_route_point', args=[points[0].id]))
        self.assertEqual(response.status_code, 302)
        
        # 10. Verify only one point remains
        points = RoutePoint.objects.filter(route=new_route)
        self.assertEqual(points.count(), 1)
        self.assertEqual(points[0].x, 0.6)
        self.assertEqual(points[0].y, 0.7)
