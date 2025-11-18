'use client';

interface ToastProps {
  message: string;
  type?: 'success' | 'error';
}

export default function Toast({ message, type = 'success' }: ToastProps) {
  return (
    <div
      className={`toast ${
        type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'
      } border rounded-xl shadow-lg`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{type === 'success' ? '✅' : '❌'}</span>
        <span className="font-medium">{message}</span>
      </div>
    </div>
  );
}

