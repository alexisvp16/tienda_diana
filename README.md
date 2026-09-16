# TIENDADIANA - Sistema de Gestión de Boutique y POS (Ecommerce-Ready)

Sistema integral de punto de venta (POS) y gestión de inventario para boutique de ropa de dama, desarrollado con arquitectura desacoplada para operar en tienda física y conectarse en el futuro con un e-commerce.

---

## 🏛 Arquitectura del Sistema

```
                 ┌─────────────────────────┐
                 │   TIENDADIANA BACKEND   │
                 │   Node.js / Express     │
                 │   REST API + JWT + RBAC │
                 └────────────┬────────────┘
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      ┌──────▼──────┐                   ┌──────▼──────┐
      │ POS TIENDA  │                   │  E-COMMERCE │
      │ React+Vite  │                   │   (Futuro)  │
      └──────┬──────┘                   └──────┬──────┘
             │                                 │
             └────────────────┬────────────────┘
                              │
                       ┌──────▼──────┐
                       │ MySQL 8.x   │
                       │tienda_diana │
                       └─────────────┘
```

---

## 📂 Estructura del Proyecto

```text
TIENDADIANA/
├── backend/                  # API REST Express + MySQL
│   ├── src/
│   │   ├── config/           # Pool MySQL (db.js) e inicializador (init-db.js)
│   │   ├── controllers/      # Lógica de negocio (Auth, Productos, Kardex, Caja, Ventas)
│   │   ├── middlewares/      # JWT y Autorización de roles (Admin / Cajero)
│   │   ├── routes/           # Endpoints de la API (/api/...)
│   │   ├── app.js            # Configuración Express y CORS
│   │   └── server.js         # Servidor HTTP y verificación de DB
│   ├── .env.example          # Plantilla de variables de entorno
│   ├── .env                  # Configuración activa
│   └── package.json
│
├── frontend/                 # Interfaz React (Vite + Tailwind CSS)
│   ├── src/
│   │   ├── components/       # Navbar con monitor de caja en vivo
│   │   ├── context/          # AuthContext (Sesión y roles)
│   │   ├── pages/            # POS, Inventario/Variantes, Caja/Arqueo, Ventas/Tickets
│   │   ├── services/         # Cliente API con inyección de JWT
│   │   ├── App.jsx           # Navegación y estado global
│   │   └── main.jsx
│   ├── vite.config.js        # Configuración con Proxy hacia el Backend
│   └── package.json
│
├── database/                 # Scripts SQL puros
│   ├── schema.sql            # Definición de 10 tablas relacionales
│   └── seeds.sql             # Datos iniciales (Categorías, Usuarios, Prendas y Caja)
│
└── verify-env.js             # Script rápido de diagnóstico de entorno
```

---

## 🚀 Guía de Ejecución Paso a Paso

### FASE 1: Verificación de Entorno
1. Compruebe que tiene Node.js (v18 o superior) instalado:
   ```bash
   node -v
   npm -v
   ```
2. Asegúrese de que su servidor **MySQL** esté encendido (en XAMPP, Laragon o como Servicio de Windows en el puerto `3306`).
3. Revise el archivo `backend/.env` para asegurar que el usuario y contraseña coincidan con su MySQL local:
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=tienda_diana_db
   ```

---

### FASE 2: Base de Datos y Semillas
1. Ingrese a la carpeta `backend` e instale las dependencias:
   ```bash
   cd backend
   npm install
   ```
2. Ejecute el inicializador automatizado de base de datos:
   ```bash
   npm run db:init
   ```
   *Este comando se conectará a MySQL, creará `tienda_diana_db`, ejecutará `schema.sql`, sembrará los datos de `seeds.sql` con contraseñas seguras (`bcrypt`) y mostrará el reporte de tablas verificadas.*

---

### FASE 3: Servidor Backend
1. Inicie el servidor backend en modo desarrollo:
   ```bash
   npm start
   ```
2. Verifique la salud de la API abriendo en su navegador:
   ```text
   http://localhost:5000/api/health
   ```
   *Deberá ver `{ "success": true, "database": { "status": "connected" } }`.*

---

### FASE 4: Cliente Frontend React (POS)
1. En una nueva terminal, ingrese a la carpeta `frontend` e instale las dependencias:
   ```bash
   cd frontend
   npm install
   ```
2. Inicie el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
3. Abra su navegador en:
   ```text
   http://localhost:5173
   ```

---

---

### FASE 5: Pruebas del Flujo Completo de Negocio
1. **Inicio de Sesión**:
   - Administradora: `admin@tiendadiana.com` / `Admin123*`
   - Cajera: `cajero@tiendadiana.com` / `Cajero123*`
2. **Apertura de Caja**: Ingrese al módulo *Caja & Arqueo*, seleccione su estación de caja física y abra el turno con `S/ 50.00` de fondo inicial.
3. **Venta en POS**: Vaya a *POS / Venta*, seleccione el **Color** y luego la **Talla Disponible** (ej. Vestido Sofía Color Negro - Talla M), añádalo al carrito y presione *Cobrar y Emitir Ticket*.
4. **Verificación de Descuento de Stock y Kardex**:
   - En *Inventario & Kardex*, observe cómo el stock de la variante se redujo automáticamente.
   - Presione el botón de *Kardex* para auditar la línea generada con el número correlativo del ticket.
5. **Arqueo y Cierre de Caja**:
   - En *Caja & Arqueo*, compruebe que el monto esperado refleja exactamente: `Monto Inicial (S/ 50.00) + Venta Cobrada`.
   - Realice un retiro manual (ej. `S/ 10.00` para flete) y observe el recálculo en vivo.
   - Efectúe el arqueo contando el dinero físico y cierre el turno.
6. **Ajustes y Personalización**:
   - En *Ajustes*, cambie el logotipo, elija entre los 3 temas visuales (*Rosa Boutique*, *Esmeralda Velvet*, *Noir & Bronze*), agregue nuevas estaciones de caja o cree personal con roles (*Admin*, *Cajera*, *Supervisor*).

---

## 📦 Puesta en Producción (2 Alternativas)

### Opción A: Despliegue con Docker Compose (Recomendado)
El proyecto incluye un entorno multicontenedor listo con MySQL 8, Backend Express y Frontend SPA servido con Nginx:
```bash
# Iniciar todos los servicios en segundo plano
docker compose up -d --build

# Ver estado de los contenedores
docker compose ps
```
* Frontend Web: `http://localhost` (Puerto 80)
* API Backend: `http://localhost:5000/api`
* MySQL: `localhost:3306`

### Opción B: Despliegue Nativo con PM2 y Nginx
1. **Backend**:
   ```bash
   cd backend
   npm ci --only=production
   # Iniciar con PM2 usando el cluster configurado
   pm2 start ../ecosystem.config.js --env production
   pm2 save
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm ci
   npm run build
   # La carpeta frontend/dist contiene los estáticos listos para servir con Nginx, Apache o Caddy.
   ```


