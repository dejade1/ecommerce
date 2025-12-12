/**
 * Script para limpiar completamente IndexedDB
 * Ejecutar desde la consola del navegador: window.clearAllData()
 */

export async function clearAllData() {
  console.log('🧹 Limpiando todos los datos locales...');

  try {
    // 1. Borrar IndexedDB
    const dbNames = ['storeDB', 'InventoryDB'];

    for (const dbName of dbNames) {
      const deleteRequest = indexedDB.deleteDatabase(dbName);

      deleteRequest.onsuccess = () => {
        console.log(`✅ ${dbName} eliminada`);
      };

      deleteRequest.onerror = () => {
        console.log(`⚠️ ${dbName} no existe o ya fue eliminada`);
      };
    }

    // 2. Borrar LocalStorage
    localStorage.clear();
    console.log('✅ localStorage limpio');

    // 3. Borrar SessionStorage
    sessionStorage.clear();
    console.log('✅ sessionStorage limpio');

    console.log('✅✅✅ Todos los datos locales borrados');
    console.log('🔄 Recargando página en 2 segundos...');

    // 4. Recargar después de 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);

  } catch (error) {
    console.error('❌ Error limpiando datos:', error);
  }
}

// Hacer la función disponible globalmente
if (typeof window !== 'undefined') {
  (window as any).clearAllData = clearAllData;
}
