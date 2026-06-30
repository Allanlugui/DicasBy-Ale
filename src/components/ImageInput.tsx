import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Link as LinkIcon, Upload, X, RotateCw, Check, AlertCircle, RefreshCw, Smartphone } from 'lucide-react';

interface ImageInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  accept?: string;
}

export function ImageInput({ value, onChange, label, placeholder, accept = "image/*,application/pdf" }: ImageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [loading, setLoading] = useState(false);
  
  // Custom camera overlay state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Clean hook for stream shutdown
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Starts the interactive in-app camera custom video stream
  const startCamera = async (deviceId?: string) => {
    setCameraError(null);
    setCapturedPhoto(null);
    setLoading(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      // Opt for optimal mobile rear cameras by default using ideal: environment
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: { ideal: 'environment' } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check for multiple camera devices (front, back, external)
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      if (!deviceId && videoDevices.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeTrackId = activeTrack?.getSettings()?.deviceId;
        if (activeTrackId) {
          setSelectedDevice(activeTrackId);
        } else {
          setSelectedDevice(videoDevices[0].deviceId);
        }
      } else if (deviceId) {
        setSelectedDevice(deviceId);
      }
    } catch (err: any) {
      console.error('[Camera] Standard getUserMedia failed:', err);
      // Give a friendly message. We have our native fallback ready!
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Permissão negada. Ative o acesso à câmera nas configurações do seu navegador para usar a câmera interna.');
      } else {
        setCameraError('Não foi possível inicializar a câmera de vídeo ao vivo. Use o botão "Câmera Nativa" para fotografar diretamente!');
      }
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }
    setCameraStream(null);
    setIsCameraOpen(false);
    setCapturedPhoto(null);
    setCameraError(null);
  };

  // Capture current frame to hidden canvas, compile base64
  const capturePhoto = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current || document.createElement('canvas');
      const width = video.videoWidth || 800;
      const height = video.videoHeight || 600;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw video frame onto canvas
        ctx.drawImage(video, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(dataUrl);
      }
    } catch (err) {
      console.error('[Camera] Frame capture failed:', err);
      setCameraError('Ocorreu um erro ao capturar a foto. Tente novamente.');
    }
  };

  // Apply photo and notify parent state
  const confirmCapturedPhoto = () => {
    if (capturedPhoto) {
      onChange(capturedPhoto);
      stopCamera();
    }
  };

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const devId = e.target.value;
    setSelectedDevice(devId);
    startCamera(devId);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (event) => {
          onChange(event.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        const dataUrl = await compressImage(file);
        onChange(dataUrl);
      }
    } catch (err) {
      console.error('[ImageInput] Processing error:', err);
      alert('Erro ao processar arquivo.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (nativeCameraRef.current) nativeCameraRef.current.value = '';
    }
  };

  // Helper compression pipeline to maintain responsive UI storage limits
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject('No canvas context');
          ctx.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  return (
    <div className="w-full">
      {label && <label className="block text-sm font-medium text-stone-700 mb-1">{label}</label>}
      
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 w-full">
          {/* Gallery Upload Input & Trigger */}
          <input
            type="file"
            accept={accept}
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="cursor-pointer w-full bg-stone-100 text-stone-700 px-3.5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-stone-200 transition disabled:opacity-50 text-sm flex-grow sm:flex-initial"
            title="Escolher arquivo do dispositivo"
          >
            <Upload className="w-4 h-4 text-stone-500" />
            <span>Arquivo / Galeria</span>
          </button>

          {/* Direct Camera Triggers */}
          <button
            type="button"
            onClick={() => {
              setIsCameraOpen(true);
              startCamera();
            }}
            disabled={loading}
            className="cursor-pointer w-full bg-rose-600 text-white px-3.5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-rose-700 transition disabled:opacity-50 text-sm flex-grow sm:flex-initial"
            title="Tirar foto usando a câmera"
          >
            <Camera className="w-4 h-4" />
            <span>Tirar Foto</span>
          </button>
        </div>
      </div>

      {/* Hidden Native Camera Input Fallback (Works miracles on mobile Safari and Chrome) */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        ref={nativeCameraRef}
        onChange={handleFileChange}
      />

      {value && value.startsWith('data:image') && (
         <div className="mt-2 text-xs text-emerald-600 font-semibold flex items-center gap-1">
           <Check className="w-3.5 h-3.5" />
           <span>Foto anexada com sucesso.</span>
         </div>
      )}

      {/* PREMIUM IN-APP VIDEO STREAM CAMERA MODAL OVERLAY */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-stone-950/90 backdrop-blur-md flex flex-col justify-between p-4 z-50 animate-fade-in text-white select-none">
          <canvas ref={canvasRef} className="hidden" />

          {/* Modal Header */}
          <div className="flex justify-between items-center max-w-2xl w-full mx-auto pb-4 border-b border-white/15">
            <div className="flex items-center gap-2">
              <div className="bg-rose-500/20 text-rose-300 p-2 rounded-xl">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-display text-stone-100">Câmera de Evidências</h3>
                <span className="text-[10px] text-stone-400">Posicione o produto ou documento no quadro central</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={stopCamera}
              className="cursor-pointer bg-white/10 hover:bg-white/20 p-2 rounded-full transition text-stone-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Live Stream / Captured Frames Viewport Layer */}
          <div className="flex-grow flex items-center justify-center my-4 overflow-hidden max-w-2xl w-full mx-auto relative rounded-3xl border border-white/10 bg-black shadow-2xl">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-950/80 z-20">
                <RefreshCw className="w-8 h-8 text-rose-500 animate-spin" />
                <span className="text-xs text-stone-400 font-semibold">Carregando lente da câmera...</span>
              </div>
            )}

            {/* Custom Interactive Framing Box overlay */}
            <div className="absolute inset-8 border border-white/20 rounded-2xl pointer-events-none z-10 flex flex-col justify-between p-4">
              <div className="flex justify-between">
                <div className="w-4 h-4 border-t-2 border-l-2 border-rose-500"></div>
                <div className="w-4 h-4 border-t-2 border-r-2 border-rose-500"></div>
              </div>
              <div className="flex justify-between">
                <div className="w-4 h-4 border-b-2 border-l-2 border-rose-500"></div>
                <div className="w-4 h-4 border-b-2 border-r-2 border-rose-500"></div>
              </div>
            </div>

            {/* Visual target crosshair */}
            <div className="absolute w-8 h-8 rounded-full border border-dashed border-white/30 pointer-events-none z-10 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
            </div>

            {!capturedPhoto ? (
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover max-h-[60vh] rounded-3xl"
              />
            ) : (
              <img 
                src={capturedPhoto || undefined} 
                alt="Foto Capturada" 
                className="w-full h-full object-cover max-h-[60vh] rounded-3xl animate-scale-in"
              />
            )}
          </div>

          {/* Bottom Bar: Multi-device toggles, triggers, & native system camera call */}
          <div className="max-w-2xl w-full mx-auto space-y-4">
            
            {/* Camera error / Warnings with manual native launcher trigger */}
            {cameraError && (
              <div className="bg-amber-950/40 border border-amber-500/20 rounded-2xl p-4 text-center space-y-3">
                <div className="flex items-center gap-2 justify-center text-amber-400 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cameraError}</span>
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    nativeCameraRef.current?.click();
                  }}
                  className="cursor-pointer bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs font-black py-2.5 px-4 rounded-xl inline-flex items-center gap-2 transition"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Usar Câmera Nativa do Celular</span>
                </button>
              </div>
            )}

            {/* Device Switcher Selection when custom stream is running */}
            {!capturedPhoto && !cameraError && devices.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Câmera ativa:</span>
                <select 
                  value={selectedDevice} 
                  onChange={handleDeviceChange}
                  className="bg-stone-900 border border-stone-800 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:border-rose-500 font-medium"
                >
                  {devices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Lente ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main Action Controllers */}
            <div className="flex justify-between items-center py-2">
              
              {/* Reset/Back Options */}
              <div className="w-1/3 text-left">
                {capturedPhoto ? (
                  <button
                    type="button"
                    onClick={() => setCapturedPhoto(null)}
                    className="cursor-pointer bg-stone-900 hover:bg-stone-800 text-stone-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 border border-stone-800"
                  >
                    Tirar Outra
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="cursor-pointer text-stone-400 hover:text-white font-medium text-xs py-2 px-3"
                  >
                    Cancelar
                  </button>
                )}
              </div>

              {/* Shutter Button Zone */}
              <div className="w-1/3 flex justify-center">
                {!capturedPhoto ? (
                  <button
                    type="button"
                    onClick={capturePhoto}
                    disabled={loading || !!cameraError}
                    className="cursor-pointer w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition duration-150-out shadow-lg shadow-black/80"
                    title="Capturar Foto"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-600 hover:bg-rose-500 transition duration-150"></div>
                  </button>
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center bg-rose-600 rounded-full text-white shadow-lg animate-bounce">
                    <Check className="w-7 h-7" />
                  </div>
                )}
              </div>

              {/* Submit / Use Photo Options or Quick Native Camera trigger */}
              <div className="w-1/3 text-right">
                {capturedPhoto ? (
                  <button
                    type="button"
                    onClick={confirmCapturedPhoto}
                    className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs inline-flex items-center gap-1 shadow-md shadow-rose-950/50"
                  >
                    <Check className="w-4 h-4" /> Usar Foto
                  </button>
                ) : (
                  // Quick shortcut to launch native device picker camera mode instantly
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      nativeCameraRef.current?.click();
                    }}
                    className="cursor-pointer text-stone-400 hover:text-white font-bold text-xs flex items-center gap-1 justify-end ml-auto"
                    title="Evitar permissões e usar câmera nativa do telefone"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-rose-500" />
                    <span>Nativa</span>
                  </button>
                )}
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
