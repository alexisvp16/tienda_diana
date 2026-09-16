// verify-env.js - Script de diagnóstico inicial para FASE 1
console.log('=== DIAGNÓSTICO DE ENTORNO TIENDADIANA ===');
console.log('Versión de Node.js:', process.version);
console.log('Plataforma:', process.platform);

const net = require('net');

// Verificar si el puerto 3306 de MySQL está abierto
const client = new net.Socket();
const port = 3306;
const host = '127.0.0.1';

console.log(`\nComprobando si el servicio MySQL está activo en ${host}:${port}...`);

client.setTimeout(3000);
client.connect(port, host, () => {
    console.log(`[OK] ¡Conexión exitosa al puerto ${port}! El servicio MySQL está activo y respondiendo.`);
    client.destroy();
    process.exit(0);
});

client.on('error', (err) => {
    console.log(`[AVISO] No se pudo conectar al puerto ${port}: ${err.message}`);
    console.log('Si usa XAMPP / Laragon, asegúrese de iniciar MySQL.');
    console.log('Si usa MySQL nativo, verifique que el servicio esté iniciado.');
    process.exit(1);
});

client.on('timeout', () => {
    console.log(`[TIMEOUT] Tiempo de espera agotado al conectar al puerto ${port}.`);
    client.destroy();
    process.exit(1);
});

