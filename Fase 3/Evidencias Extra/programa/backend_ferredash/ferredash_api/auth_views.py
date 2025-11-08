from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from drf_spectacular.utils import extend_schema
from django.utils.timezone import now
from django.contrib.auth.models import User

class LoginUsuarioView(APIView):
    permission_classes = []

    @extend_schema(request=None, responses=None)
    def post(self, request):
        username_or_email = request.data.get("username")
        password = request.data.get("password")

        if not username_or_email or not password:
            return Response({"detail": "Debe proporcionar usuario y contraseña."}, status=status.HTTP_400_BAD_REQUEST)

        # Buscar usuario por username o email
        try:
            user = User.objects.get(username__iexact=username_or_email)
        except User.DoesNotExist:
            try:
                user = User.objects.get(email__iexact=username_or_email)
            except User.DoesNotExist:
                return Response({"detail": "Usuario no encontrado."}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({"detail": "Contraseña incorrecta."}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            "user": {
                "id": user.id,
                "name": user.get_full_name() or user.username,
                "email": user.email,
                "role": "admin" if user.is_staff else "usuario",
            },
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "time": now(),
        }, status=status.HTTP_200_OK)
