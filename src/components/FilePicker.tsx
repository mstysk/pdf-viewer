import { FilePicker as CapFilePicker } from '@capawesome/capacitor-file-picker';

interface FilePickerProps {
  onFilePicked: (data: ArrayBuffer) => void;
  onError: (message: string) => void;
}

export function FilePicker({ onFilePicked, onError }: FilePickerProps) {
  const handlePick = async () => {
    try {
      const result = await CapFilePicker.pickFiles({
        types: ['application/pdf'],
        limit: 1,
        readData: true,
      });

      const file = result.files[0];
      if (!file?.data) {
        onError('ファイルデータを取得できませんでした');
        return;
      }

      // base64 → ArrayBuffer に変換
      const binary = atob(file.data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      onFilePicked(bytes.buffer);
    } catch (err) {
      if (err instanceof Error && err.message !== 'pickFiles canceled') {
        onError(`ファイル選択に失敗しました: ${err.message}`);
      }
    }
  };

  return (
    <div className="file-picker">
      <div className="file-picker-content">
        <svg
          className="file-picker-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <h1>PDF Viewer</h1>
        <p>PDFファイルを選択してください</p>
        <button className="pick-button" onClick={handlePick}>
          PDFを開く
        </button>
      </div>
    </div>
  );
}
