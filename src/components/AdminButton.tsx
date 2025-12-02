import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { AdminLogin } from './AdminLogin';

export function AdminButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed top-4 left-4 z-50 flex items-center space-x-2 bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
      >
        <Settings className="w-5 h-5" />
        <span>Administración</span>
      </button>

      {isModalOpen && <AdminLogin onClose={() => setIsModalOpen(false)} />}
    </>
  );
}