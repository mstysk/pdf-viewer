import { useState } from 'react';
import { FilePicker } from './components/FilePicker';
import { PdfViewer } from './components/PdfViewer';
import './App.css';

function App() {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  return (
    <div className="app">
      {errorMessage && (
        <div className="global-error" onClick={() => setErrorMessage(null)}>
          {errorMessage}
        </div>
      )}
      {pdfData ? (
        <PdfViewer pdfData={pdfData} onClose={() => setPdfData(null)} />
      ) : (
        <FilePicker onFilePicked={setPdfData} onError={setErrorMessage} />
      )}
    </div>
  );
}

export default App;
