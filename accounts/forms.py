from django import forms
from django.utils.translation import gettext_lazy as _

class GenerateTokenForm(forms.Form):
    """
    Form for generating an API token for the user.
    """
    password = forms.CharField(
        label=_("Password"),
        strip=False,
        widget=forms.PasswordInput(attrs={"autocomplete": "current-password"}),
    )
