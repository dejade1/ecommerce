import React, { useState, useEffect } from 'react';
import { addBatch, getBatchesByProduct, Batch } from '../../lib/batch-service';

interface Props {
  productId: number;
  productName: string;
}

function generarPrefijoLote(nombre: string): string {
  const palabras = nombre.match(/\b\w+/g) || [];
  return palabras.map(p => p.substring(0, 3)).join('');
}

const BatchManager: React.FC<Props> = ({ productId, productName }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [quantity, setQuantity] = useState<number>(0);
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [batchCode, setBatchCode] = useState<string>('');

  useEffect(() => {
    async function fetchBatches() {
      const b = await getBatchesByProduct(productId);
      setBatches(b);
      asignarNuevoLote(b);
    }
    fetchBatches();
  }, [productId]);

  const asignarNuevoLote = (existingBatches: Batch[]) => {
    const prefijo = generarPrefijoLote(productName);
    const letrasUsadas = existingBatches
      .filter(b => b.batchCode.startsWith(prefijo))
      .map(b => b.batchCode.split('-')[1]);
    const abecedario = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let nuevaLetra = 'A';
    for (const letra of abecedario) {
      if (!letrasUsadas.includes(letra)) {
        nuevaLetra = letra;
        break;
      }
    }
    setBatchCode(`${prefijo}-${nuevaLetra}`);
  };

  const handleGuardar = async () => {
    if (quantity <= 0 || !expiryDate || !batchCode.trim()) {
      alert('Completa todos los campos para guardar el lote');
      return;
    }
    try {
      await addBatch({ productId, batchCode, quantity, expiryDate });
      const b = await getBatchesByProduct(productId);
      setBatches(b);
      setQuantity(0);
      setExpiryDate('');
      asignarNuevoLote(b);
      alert('Lote agregado correctamente');
    } catch (error) {
      alert('Error al guardar lote: ' + error);
    }
  };

  return (
    <div>
      <h3>Gestión de Lotes para {productName}</h3>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Código de Lote (generado)</label>
        <input
          type="text"
          value={batchCode}
          onChange={e => setBatchCode(e.target.value.toUpperCase())}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Cantidad</label>
        <input
          type="number"
          min={1}
          value={quantity}
          onChange={e => setQuantity(Number(e.target.value))}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label className="block font-semibold mb-1">Fecha de Caducidad</label>
        <input
          type="date"
          value={expiryDate}
          onChange={e => setExpiryDate(e.target.value)}
          className="border rounded px-3 py-2 w-full"
        />
      </div>
      <button
        onClick={handleGuardar}
        className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
      >
        Guardar Lote
      </button>

      <h4 className="mt-6 font-semibold">Lotes Registrados</h4>
      <ul className="mt-2">
        {batches.length === 0 && <li>No hay lotes registrados para este producto.</li>}
        {batches.map(batch => (
          <li key={batch.batchCode}>
            <strong>{batch.batchCode}</strong> - Cantidad: {batch.quantity} - Vence: {batch.expiryDate}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BatchManager;
