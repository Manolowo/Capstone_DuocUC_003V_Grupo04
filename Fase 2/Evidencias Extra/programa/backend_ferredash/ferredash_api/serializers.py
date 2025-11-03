# ferredash_api/serializers.py

from rest_framework import serializers
from . import models
from django.contrib.auth.hashers import check_password


class BoletaPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.BoletaPago
        fields = "__all__"


class CajaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Caja
        fields = "__all__"


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Categoria
        fields = "__all__"


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Cliente
        fields = "__all__"


class CondicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Condicion
        fields = "__all__"


class EstadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Estado
        fields = "__all__"


class InventarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Inventario
        fields = "__all__"


class ProductoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Producto
        fields = "__all__"


class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Rol
        fields = "__all__"


class SucursalSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Sucursal
        fields = "__all__"


class TipoPagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.TipoPago
        fields = "__all__"


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Usuario
        fields = "__all__"


class VentaSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Venta
        fields = "__all__"


# ✅ Serializer personalizado para login
class CustomLoginSerializer(serializers.Serializer):
    usu_mail = serializers.EmailField()
    usu_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = models.Usuario.objects.get(usu_mail=data["usu_mail"])
        except models.Usuario.DoesNotExist:
            raise serializers.ValidationError("Correo no registrado.")

        if not check_password(data["usu_password"], user.usu_password):
            raise serializers.ValidationError("Contraseña incorrecta.")

        return {
            "id": user.id,
            "usu_nom": user.usu_nom,
            "usu_mail": user.usu_mail,
            "rol": user.rol.rol_nom if user.rol else None,
            "suc": user.suc.suc_nom if user.suc else None,
        }
