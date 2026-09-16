const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Cargar .env según entorno
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../.env.production') });
} else {
    dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const backupDB = () => {
    const date = new Date();
    const timestamp = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}_${String(date.getHours()).padStart(2,'0')}${String(date.getMinutes()).padStart(2,'0')}`;
    
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('📁 Carpeta de backups creada');
    }
    
    const fileName = `backup_${timestamp}.sql`;
    const filePath = path.join(backupDir, fileName);
    
    const cmd = `mysqldump -u ${process.env.DB_USER} -p${process.env.DB_PASSWORD} --single-transaction --routines --triggers --skip-lock-tables ${process.env.DB_NAME} > ${filePath}`;
    
    console.log('========================================');
    console.log('   📦 CREANDO BACKUP');
    console.log('========================================\n');
    console.log(`📄 Archivo: ${fileName}`);
    console.log('⏳ Procesando...\n');
    
    exec(cmd, (error, stdout, stderr) => {
        if (error) {
            console.error('❌ Error en backup:', error.message);
            return;
        }
        if (stderr) {
            console.warn('⚠️  Advertencia:', stderr);
        }
        
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
        
        console.log(`✅ Backup completado exitosamente!`);
        console.log(`   📂 Ubicación: ${filePath}`);
        console.log(`   📊 Tamaño: ${sizeKB} KB (${sizeMB} MB)`);
        console.log(`   📅 Fecha: ${new Date().toLocaleString()}`);
        
        // Eliminar backups de más de 30 días
        const files = fs.readdirSync(backupDir);
        let deleted = 0;
        files.forEach(file => {
            const fileStats = fs.statSync(path.join(backupDir, file));
            const daysOld = (Date.now() - fileStats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (daysOld > 30) {
                fs.unlinkSync(path.join(backupDir, file));
                deleted++;
            }
        });
        
        if (deleted > 0) {
            console.log(`🗑️  ${deleted} backups antiguos eliminados`);
        }
        console.log('\n========================================');
    });
};

// Si se ejecuta directamente
if (require.main === module) {
    backupDB();
}

module.exports = backupDB;