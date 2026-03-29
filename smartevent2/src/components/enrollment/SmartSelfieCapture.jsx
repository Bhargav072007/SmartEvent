import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Upload, RotateCcw, Loader2, AlertTriangle, UserCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

// States: idle | uploading | analyzing | verified | no_face | error
export default function SmartSelfieCapture({ onCapture, existingUrl, existingStatus }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(existingUrl || null);
  const [status, setStatus] = useState(existingStatus || 'idle'); // idle | uploading | analyzing | verified | no_face | error
  const [uploadedUrl, setUploadedUrl] = useState(existingUrl || null);
  const [reason, setReason] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setReason('');
      // Show local preview immediately
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(file);

      setStatus('uploading');

      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadedUrl(file_url);
      setPreview(file_url);
      setStatus('analyzing');

      // Use AI to detect if a face is visible
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this image and determine if there is a clearly visible human face in it.
        
        Rules:
        - A face is valid if: it is a frontal or near-frontal human face, clearly lit, not obscured by sunglasses or masks
        - A face is NOT valid if: it's a pet, cartoon, object, the image is blurry, face is too far away, face is mostly covered, or no person at all
        
        Respond with a JSON object only.`,
        file_urls: [file_url],
        response_json_schema: {
          type: 'object',
          properties: {
            face_detected: { type: 'boolean' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            reason: { type: 'string' }
          }
        }
      });

      if (result.face_detected && result.confidence !== 'low') {
        setStatus('verified');
        setReason(result.reason || 'Face is clear and ready for faster entry.');
        onCapture?.({ url: file_url, verified: true });
      } else {
        setStatus('no_face');
        setReason(result.reason || 'We could not confirm a clear face in this selfie.');
        onCapture?.({ url: file_url, verified: false, reason: result.reason });
      }
    } catch (error) {
      console.error('Face upload error:', error);
      setStatus('error');
      setReason('Upload failed. Try again with a clear selfie in bright light.');
    }
  };

  const reset = () => {
    setPreview(null);
    setStatus('idle');
    setUploadedUrl(null);
    setReason('');
    onCapture?.(null);
    // Reset file input
    if (fileRef.current) fileRef.current.value = '';
  };

  const statusConfig = {
    idle: null,
    uploading: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'Uploading…', spin: true },
    analyzing: { icon: Loader2, color: 'text-accent', bg: 'bg-accent/10', label: 'Detecting face…', spin: true },
    verified: { icon: UserCheck, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Face verified ✓', spin: false },
    no_face: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', label: 'Face not visible', spin: false },
    error: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error — try again', spin: false },
  };

  const conf = statusConfig[status];
  const isProcessing = status === 'uploading' || status === 'analyzing';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Photo circle */}
      <div className="relative">
        <div
          className={`w-44 h-44 rounded-full overflow-hidden border-4 shadow-lg transition-all duration-300 ${
            status === 'verified' ? 'border-green-400' :
            status === 'no_face' ? 'border-orange-400' :
            status === 'analyzing' || status === 'uploading' ? 'border-accent' :
            'border-border'
          } ${!preview ? 'border-dashed bg-muted cursor-pointer flex items-center justify-center' : ''}`}
          onClick={!preview ? () => fileRef.current?.click() : undefined}
        >
          {preview ? (
            <img src={preview} alt="Selfie" className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 p-4">
              <Camera className="w-10 h-10 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground text-center">Tap to upload selfie</span>
            </div>
          )}
        </div>

        {/* Status badge overlay */}
        <AnimatePresence>
          {conf && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`absolute -bottom-2 -right-2 w-12 h-12 rounded-full ${conf.bg} border-2 border-background flex items-center justify-center shadow-md`}
            >
              <conf.icon className={`w-6 h-6 ${conf.color} ${conf.spin ? 'animate-spin' : ''}`} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status label */}
      <AnimatePresence mode="wait">
        {conf && (
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`px-4 py-2 rounded-full text-sm font-medium ${conf.bg} ${conf.color}`}
          >
            {conf.label}
          </motion.div>
        )}
      </AnimatePresence>

      {status === 'no_face' && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-muted-foreground text-center max-w-52"
        >
          {reason || 'Make sure your face is well-lit, centered, and not covered. Try again with a clear selfie.'}
        </motion.p>
      )}

      {status === 'verified' && reason && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-green-600 text-center max-w-56"
        >
          {reason}
        </motion.p>
      )}

      {status === 'error' && reason && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-red-500 text-center max-w-56"
        >
          {reason}
        </motion.p>
      )}

      {!preview && status === 'idle' && (
        <p className="text-xs text-muted-foreground text-center max-w-56">
          Use a front-facing selfie with your face centered, no sunglasses or mask, and a clean background.
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />

      {/* Action buttons */}
      <div className="flex gap-2">
        {preview && !isProcessing ? (
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-1" /> Retake
          </Button>
        ) : !preview ? (
          <Button size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Upload Selfie
          </Button>
        ) : null}
        {isProcessing && (
          <Button size="sm" disabled>
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            {status === 'uploading' ? 'Uploading…' : 'Analyzing…'}
          </Button>
        )}
      </div>
    </div>
  );
}
