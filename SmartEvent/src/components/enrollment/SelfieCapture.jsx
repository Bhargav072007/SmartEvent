import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle2, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function SelfieCapture({ onCapture, existingUrl }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setPreview(file_url);
    onCapture?.(file_url);
    setUploading(false);
  };

  const reset = () => {
    setPreview(null);
    onCapture?.(null);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {preview ? (
        <div className="relative">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-accent/30 shadow-lg">
            <img src={preview} alt="Selfie" className="w-full h-full object-cover" />
          </div>
          {!uploading && (
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <div
          className="w-48 h-48 rounded-full border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-accent/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Camera className="w-10 h-10 text-muted-foreground/50" />
          <span className="text-xs text-muted-foreground">Tap to upload selfie</span>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFile} />

      <div className="flex gap-2">
        {preview ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Retake
          </Button>
        ) : (
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Upload Selfie
          </Button>
        )}
      </div>
    </div>
  );
}