from django.contrib.auth.forms import UserCreationForm
from django.urls import reverse_lazy
from django.views import generic
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render, redirect
from django.contrib.auth import authenticate
from django.contrib import messages
from rest_framework.authtoken.models import Token
from .forms import GenerateTokenForm


class SignUpView(generic.CreateView):
    form_class = UserCreationForm
    success_url = reverse_lazy("login")
    template_name = "registration/signup.html"


class GenerateTokenView(LoginRequiredMixin, generic.FormView):
    template_name = "accounts/generate_token.html"
    form_class = GenerateTokenForm
    success_url = reverse_lazy("api_token")
    
    def form_valid(self, form):
        # Verify the password
        user = authenticate(
            username=self.request.user.username,
            password=form.cleaned_data["password"]
        )
        
        if user is not None:
            # Generate or get existing token
            token, created = Token.objects.get_or_create(user=user)
            
            # Pass token to the template context
            self.request.session['token'] = token.key
            
            if created:
                messages.success(self.request, "API token generated successfully.")
            else:
                messages.info(self.request, "Using your existing API token.")
                
            return super().form_valid(form)
        else:
            messages.error(self.request, "Invalid password.")
            return self.form_invalid(form)
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Check if token is in session
        if 'token' in self.request.session:
            context['token'] = self.request.session['token']
            # Remove token from session after displaying it once
            # del self.request.session['token']
            
        return context
