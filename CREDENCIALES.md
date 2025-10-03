# 🔐 Credenciales de Acceso - Sistema de Reservas Tribus

## 🌐 URL de Acceso
**Producción:** https://tribus-reservas-app-2024-d989e6f9d084.herokuapp.com/

---

## 👥 Usuarios de Prueba

### Administradores

| Usuario      | Contraseña     | Rol   | Departamento              |
|--------------|----------------|-------|---------------------------|
| `admin`      | `admin123`     | Admin | IT                        |
| `Hneira`     | `hneira123`    | Admin | Gerencia                  |
| `Dcoronado`  | `dcoronado123` | Admin | Talento Humano            |

### Líderes

| Usuario      | Contraseña     | Rol   | Departamento              |
|--------------|----------------|-------|---------------------------|
| `Dneira`     | `dneira123`    | Lider | Tesorería                 |
| `prueba`     | `prueba123`    | Lider | Comercial                 |

### Usuarios Regulares

| Usuario      | Contraseña     | Rol   | Departamento              |
|--------------|----------------|-------|---------------------------|
| `usuario`    | `usuario123`   | User  | General                   |

---

## 🔧 Resetear Contraseñas

Si necesitas resetear las contraseñas de los usuarios, ejecuta:

```bash
node reset-passwords.js
```

Este script reseteará las contraseñas de los usuarios principales a sus valores por defecto.

---

## 📝 Notas

- Las contraseñas están hasheadas con bcrypt (10 rounds)
- Todos los usuarios activos tienen `isActive: true`
- El usuario `admin` tiene permisos completos sobre el sistema
- Los usuarios con rol `lider` pueden crear reservas de hasta 3 horas
- Los usuarios con rol `admin` pueden crear reservas de hasta 8 horas

---

## 🔄 Última Actualización
**Fecha:** 3 de Octubre de 2025
**Contraseñas reseteadas:** 6 usuarios principales
