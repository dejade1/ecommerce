import React from 'react';
import { triggerDailySalesSummary, triggerExpiryAlerts } from '../../lib/email-service';

const EmailTasks: React.FC = () => {
  const enviarResumen = async () => {
    try {
      await triggerDailySalesSummary();
      alert('Resumen diario enviado correctamente.');
    } catch {
      alert('Error enviando resumen diario.');
    }
  };

  const enviarAlertas = async () => {
    try {
      await triggerExpiryAlerts();
      alert('Alertas de caducidad enviadas correctamente.');
    } catch {
      alert('Error enviando alertas de caducidad.');
    }
  };

  return (
    <div className="mt-8">
      <h3 className="font-semibold mb-4">Procesos de Email</h3>
      <button
        onClick={enviarResumen}
        className="bg-green-500 text-white px-4 py-2 rounded mr-4 hover:bg-green-600"
      >
        Enviar Resumen Diario
      </button>
      <button
        onClick={enviarAlertas}
        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
      >
        Enviar Alertas de Caducidad
      </button>
    </div>
  );
};

export default EmailTasks;
