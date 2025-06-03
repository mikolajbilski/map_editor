from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

class AuthenticationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        # Create test user
        cls.test_user = User.objects.create_user(
            username='authuser', 
            email='auth@example.com', 
            password='authpassword'
        )
    
    def test_signup_view(self):
        """Test the signup view"""
        response = self.client.get(reverse('signup'))
        self.assertEqual(response.status_code, 200)
        
        # Test creating a new user
        data = {
            'username': 'newuser',
            'password1': 'complex-password123',
            'password2': 'complex-password123',
        }
        response = self.client.post(reverse('signup'), data)
        
        # Should redirect to login page on successful signup
        self.assertRedirects(response, reverse('login'))
        
        # Verify the user was created
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_login_view(self):
        """Test the login view"""
        response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)
        
        # Test login with valid credentials
        data = {
            'username': 'authuser',
            'password': 'authpassword',
        }
        response = self.client.post(reverse('login'), data)
        
        # Should redirect to home page on successful login
        self.assertRedirects(response, reverse('home'))
        
        # Verify the user is logged in
        self.assertTrue(response.wsgi_request.user.is_authenticated)
    
    def test_login_with_invalid_credentials(self):
        """Test login with invalid credentials"""
        data = {
            'username': 'authuser',
            'password': 'wrong-password',
        }
        response = self.client.post(reverse('login'), data)
        
        # Should stay on the login page
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Please enter a correct username and password')
        
        # Verify the user is not logged in
        self.assertFalse(response.wsgi_request.user.is_authenticated)
    
    def test_logout(self):
        """Test logout functionality"""
        # Log in first
        self.client.login(username='authuser', password='authpassword')
        
        # Check we're logged in
        response = self.client.get(reverse('home'))
        self.assertTrue(response.wsgi_request.user.is_authenticated)
        
        # Log out
        response = self.client.post(reverse('logout'))
        
        # Should redirect to home page after logout
        self.assertRedirects(response, reverse('home'))
        
        # Verify we're logged out
        response = self.client.get(reverse('home'))
        self.assertFalse(response.wsgi_request.user.is_authenticated)
    
    def test_api_token_generation(self):
        """Test API token generation"""
        # Log in
        self.client.login(username='authuser', password='authpassword')
        
        # Get the token generation page
        response = self.client.get(reverse('api_token'))
        self.assertEqual(response.status_code, 200)
        
        # Generate a token
        data = {
            'password': 'authpassword',
        }
        response = self.client.post(reverse('api_token'), data)
        
        # The view redirects to the success_url after form submission
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, reverse('api_token'))
        
        # Follow the redirect and check that the token is displayed
        response = self.client.get(response.url)
        self.assertEqual(response.status_code, 200)
        
        # Verify the token was created
        token = Token.objects.get(user=self.test_user)
        self.assertContains(response, token.key)
