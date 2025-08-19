import React, { useState } from 'react';
import { Settings, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { initializeGoogleSheets, isGoogleSheetsConfigured, getGoogleSheetsUrl, testGoogleSheetsConnection } from '../utils/googleSheets';

export function GoogleSheetsConfig() {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [configStatus, setConfigStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [message, setMessage] = useState('');

  const handleInitializeSheets = async () => {
    setIsConfiguring(true);
    setConfigStatus('idle');
    setMessage('');

    try {
      const success = await initializeGoogleSheets();
      if (success) {
        setConfigStatus('success');
        setMessage('Google Sheets configurado correctamente');
      } else {
        setConfigStatus('error');
        setMessage('Error al configurar Google Sheets. Verifica las credenciales.');
      }
    } catch (error) {
      setConfigStatus('error');
      setMessage('Error de conexión con Google Sheets');
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testGoogleSheetsConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: `Error al probar conexión: ${error}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigured = isGoogleSheetsConfigured();
  const sheetsUrl = getGoogleSheetsUrl();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-3 mb-4">
        <Settings className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Configuración Google Sheets</h3>
      </div>

      <div className="space-y-4">
        {/* Estado de configuración */}
        <div className="flex items-center space-x-2">
          {isConfigured ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 font-medium">Google Sheets configurado</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              <span className="text-yellow-700 font-medium">Google Sheets no configurado</span>
            </>
          )}
        </div>

        {/* Información de configuración */}
        <div className="bg-gray-50 rounded-md p-4">
          <h4 className="font-medium text-gray-900 mb-2">Variables de entorno requeridas:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div><code>REACT_APP_GOOGLE_SHEETS_ID</code> - ID de la hoja de cálculo</div>
            <div><code>REACT_APP_GOOGLE_API_KEY</code> - Clave de API de Google</div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex space-x-3">
          <button
            onClick={handleTestConnection}
            disabled={!isConfigured || isTesting}
            className="btn-secondary flex items-center space-x-2 disabled:opacity-50"
          >
            {isTesting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Probando...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Probar Conexión</span>
              </>
            )}
          </button>

          <button
            onClick={handleInitializeSheets}
            disabled={!isConfigured || isConfiguring}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50"
          >
            {isConfiguring ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Configurando...</span>
              </>
            ) : (
              <>
                <Settings className="w-4 h-4" />
                <span>Inicializar Hoja</span>
              </>
            )}
          </button>

          {sheetsUrl && (
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex items-center space-x-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Ver Hoja</span>
            </a>
          )}
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`p-3 rounded-md ${
            configStatus === 'success' ? 'bg-green-50 text-green-700' :
            configStatus === 'error' ? 'bg-red-50 text-red-700' :
            'bg-blue-50 text-blue-700'
          }`}>
            {message}
          </div>
        )}

        {/* Resultado de prueba de conexión */}
        {testResult && (
          <div className={`p-3 rounded-md ${
            testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            <div className="font-medium">{testResult.message}</div>
            {testResult.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Ver detalles</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {JSON.stringify(testResult.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* Instrucciones */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="font-medium text-blue-900 mb-2">Instrucciones de configuración:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
            <li>Crear una hoja de cálculo en Google Sheets</li>
            <li>Habilitar la API de Google Sheets</li>
            <li>Crear una clave de API en Google Cloud Console</li>
            <li>Configurar las variables de entorno en Heroku</li>
            <li>Hacer clic en "Inicializar Hoja" para crear la estructura</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
