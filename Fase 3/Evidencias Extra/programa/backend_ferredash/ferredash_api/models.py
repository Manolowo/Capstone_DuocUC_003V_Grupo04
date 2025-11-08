from django.db import models

class Rol(models.Model):
    rol_id = models.AutoField(primary_key=True)
    rol_nom = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.rol_nom or f"Rol {self.rol_id}"

    class Meta:
        db_table = 'rol'
        managed = False


class Sucursal(models.Model):
    suc_id = models.AutoField(primary_key=True)
    suc_nom = models.CharField(max_length=100, blank=True, null=True)
    suc_direc = models.CharField(max_length=150, blank=True, null=True)

    def __str__(self):
        return self.suc_nom or f"Sucursal {self.suc_id}"

    class Meta:
        db_table = 'sucursal'
        managed = False


class Usuario(models.Model):
    usu_id = models.AutoField(primary_key=True)
    usu_nom = models.CharField(max_length=100, blank=True, null=True)
    usu_mail = models.CharField(max_length=100, blank=True, null=True)
    usu_password = models.CharField(max_length=200, blank=True, null=True)
    rol = models.ForeignKey(Rol, models.DO_NOTHING, blank=True, null=True)
    suc = models.ForeignKey(Sucursal, models.DO_NOTHING, blank=True, null=True)

    def __str__(self):
        return self.usu_nom or f"Usuario {self.usu_id}"

    class Meta:
        db_table = 'usuario'
        managed = False


class Cliente(models.Model):
    cli_id = models.AutoField(primary_key=True)
    cli_nom = models.CharField(max_length=100, blank=True, null=True)
    cli_rut = models.CharField(max_length=20, blank=True, null=True)
    cli_telefono = models.CharField(max_length=20, blank=True, null=True)
    cli_mail = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.cli_nom or f"Cliente {self.cli_id}"

    class Meta:
        db_table = 'cliente'
        managed = False


class Condicion(models.Model):
    con_id = models.AutoField(primary_key=True)
    con_nom = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.con_nom or f"Condición {self.con_id}"

    class Meta:
        db_table = 'condicion'
        managed = False


class Estado(models.Model):
    est_id = models.AutoField(primary_key=True)
    est_nom = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.est_nom or f"Estado {self.est_id}"

    class Meta:
        db_table = 'estado'
        managed = False


class Caja(models.Model):
    caja_id = models.AutoField(primary_key=True)
    caja_nom = models.CharField(max_length=50, blank=True, null=True)
    suc = models.ForeignKey(Sucursal, models.DO_NOTHING, blank=True, null=True)

    def __str__(self):
        return self.caja_nom or f"Caja {self.caja_id}"

    class Meta:
        db_table = 'caja'
        managed = False


class Categoria(models.Model):
    cat_id = models.AutoField(primary_key=True)
    cat_nom = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.cat_nom or f"Categoría {self.cat_id}"

    class Meta:
        db_table = 'categoria'
        managed = False


class Producto(models.Model):
    prod_id = models.AutoField(primary_key=True)
    prod_codigobarra = models.CharField(max_length=50, blank=True, null=True)
    prod_nom = models.CharField(max_length=100, blank=True, null=True)
    prod_desc = models.CharField(max_length=255, blank=True, null=True)
    prod_prec_compra_unitario = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    prod_prec_venta_neto = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    prod_prec_venta_final = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    prod_afecto_iva = models.BooleanField(blank=True, null=True)
    prod_tipo_unidad = models.CharField(max_length=50, blank=True, null=True)
    prod_marca = models.CharField(max_length=50, blank=True, null=True)
    prod_talla = models.CharField(max_length=20, blank=True, null=True)
    prod_color = models.CharField(max_length=30, blank=True, null=True)
    cat = models.ForeignKey(Categoria, models.DO_NOTHING, blank=True, null=True)

    def __str__(self):
        return self.prod_nom or f"Producto {self.prod_id}"

    class Meta:
        db_table = 'producto'
        managed = False


class Inventario(models.Model):
    inv_id = models.AutoField(primary_key=True)
    suc = models.ForeignKey(Sucursal, models.DO_NOTHING, blank=True, null=True)
    prod = models.ForeignKey(Producto, models.DO_NOTHING, blank=True, null=True)
    inv_stock = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    inv_costeo_neto = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    inv_por_vender_neto = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    inv_utilidad_neta = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    inv_margen_pct = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Inventario #{self.inv_id}"

    class Meta:
        db_table = 'inventario'
        managed = False


class TipoPago(models.Model):
    tipopago_id = models.AutoField(primary_key=True)
    tipopago_nom = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return self.tipopago_nom or f"TipoPago {self.tipopago_id}"

    class Meta:
        db_table = 'tipo_pago'
        managed = False


class Boleta(models.Model):
    bol_id = models.AutoField(primary_key=True)
    doc_tipo = models.CharField(max_length=20, blank=True, null=True)
    bol_folio = models.IntegerField(blank=True, null=True)
    bol_fecha = models.DateTimeField(blank=True, null=True)
    cli = models.ForeignKey(Cliente, models.DO_NOTHING, blank=True, null=True)
    bol_total = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    bol_despacho = models.CharField(max_length=100, blank=True, null=True)
    con = models.ForeignKey(Condicion, models.DO_NOTHING, blank=True, null=True)
    est = models.ForeignKey(Estado, models.DO_NOTHING, blank=True, null=True)
    bol_fecha_venc = models.DateTimeField(blank=True, null=True)
    bol_pdf = models.CharField(max_length=200, blank=True, null=True)
    suc = models.ForeignKey(Sucursal, models.DO_NOTHING, blank=True, null=True)
    caja = models.ForeignKey(Caja, models.DO_NOTHING, blank=True, null=True)
    usu = models.ForeignKey(Usuario, models.DO_NOTHING, blank=True, null=True)

    def __str__(self):
        return f"Boleta #{self.bol_id}"

    class Meta:
        db_table = 'boleta'
        managed = False


class BoletaPago(models.Model):
    bolpago_id = models.AutoField(primary_key=True)
    bol = models.ForeignKey(Boleta, models.DO_NOTHING, blank=True, null=True)
    tipopago = models.ForeignKey(TipoPago, models.DO_NOTHING, blank=True, null=True)
    bolpago_monto = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Pago #{self.bolpago_id}"

    class Meta:
        db_table = 'boleta_pago'
        managed = False


class Venta(models.Model):
    ven_id = models.AutoField(primary_key=True)
    bol = models.ForeignKey(Boleta, models.DO_NOTHING, blank=True, null=True)
    prod = models.ForeignKey(Producto, models.DO_NOTHING, blank=True, null=True)
    ven_fecha = models.DateField(blank=True, null=True)
    ven_hora = models.TimeField(blank=True, null=True)
    ven_precio_unitario = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    ven_cantidad = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    ven_descuento = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)
    ven_subtotal = models.DecimalField(max_digits=12, decimal_places=2, blank=True, null=True)

    def __str__(self):
        return f"Venta #{self.ven_id}"

    class Meta:
        db_table = 'venta'
        managed = False
