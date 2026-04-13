"use client";
import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import api from "@/lib/api";
import toast from "react-hot-toast";

interface SmartLensModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SmartLensModal({ isOpen, onClose }: SmartLensModalProps) {
  const { user: me, setUser } = useAuthStore();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [cameraOn, setCameraOn] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState("none");
  const [results, setResults] = useState<any[]>([]); 
  const [selectedItems, setSelectedItems] = useState<number[]>([]); 
  const [status, setStatus] = useState("Ready");
  const [isScanning, setIsScanning] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [pointsData, setPointsData] = useState({ total_points: 0, breakdown: [] as any[] });
  const [retryTimer, setRetryTimer] = useState(0);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (retryTimer > 0) interval = setInterval(() => setRetryTimer((prev) => prev - 1), 1000);
    return () => { stopCamera(); if (interval) clearInterval(interval); };
  }, [retryTimer]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const startCamera = async () => {
    try {
      stopCamera();
      
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: "environment",
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 }
          }, 
          audio: false 
        });
      } catch (e) {
        // Fallback for APK converters that don't support facingMode
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
      }
      
      streamRef.current = stream;
      setPreviewType("camera"); setCameraOn(true); setStatus("Camera ready");
    } catch (error) { setStatus("Camera access failed"); }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOn(false); setIsRecording(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current; const canvas = canvasRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if(ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg", 0.8));
        setPreviewType("captured"); setStatus("Image captured. Verify to see items.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    setRecordedChunks([]);
    const recorder = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp8" });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) setRecordedChunks((p) => [...p, e.data]); };
    recorder.start(); mediaRecorderRef.current = recorder;
    setIsRecording(true); setStatus("Recording disposal...");
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false); setStatus("Recording complete.");
    }
  };

  const toggleItemSelection = (index: number) => {
    if (results[index].processed) return; 
    setSelectedItems((prev) => prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]);
  };

  const dataURLtoFile = (dataUrl: string, filename: string) => {
    const arr = dataUrl.split(","); const mime = arr[0].match(/:(.*?);/)?.[1]; 
    const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: mime });
  };

  const verifyImage = async () => {
    if (!capturedImage) return setStatus("Capture a photo first!");
    if (retryTimer > 0) return setStatus(`API Cooling down: Wait ${retryTimer}s`);
    try {
      setIsScanning(true); setStatus("Analyzing...");
      const formData = new FormData();
      formData.append("file", dataURLtoFile(capturedImage, "garbage.jpg"));
      
      const res = await api.post("/users/detect", formData, { headers: { "Content-Type": "multipart/form-data" } });
      const newItems = (res.data.items || []).map((item:any) => ({ ...item, processed: false }));
      setResults((prev) => [...prev, ...newItems]);
      setStatus("Items added. Select to verify action or points.");
    } catch (e: any) { 
        if(e?.response?.status === 429) setRetryTimer(35);
        setStatus("Scan failed"); 
    } finally { setIsScanning(false); }
  };

  const verifyAction = async () => {
    if (recordedChunks.length === 0 || selectedItems.length === 0) return setStatus("Record a video and select items first!");
    try {
      setIsScanning(true);
      const formData = new FormData();
      if(capturedImage) formData.append("file", dataURLtoFile(capturedImage, "reference.jpg"));
      formData.append("video", new Blob(recordedChunks, { type: "video/webm" }), "action.webm");
      const targets = results.filter((_, idx) => selectedItems.includes(idx)).map(i => i.class || i.class_name);
      formData.append("targets", JSON.stringify(targets)); 

      const res = await api.post("/users/detect", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setStatus(res.data.items?.length > 0 ? "Action Verified!" : "Action not detected.");
    } catch (e) { setStatus("Verification error"); } finally { setIsScanning(false); }
  };

  const calculatePoints = async () => {
    if (selectedItems.length === 0) return setStatus("Select items first!");
    try {
      setStatus("Calculating...");
      const itemsToProcess = results.filter((_, idx) => selectedItems.includes(idx));
      const res = await api.post("/users/calculate_points", itemsToProcess);
      
      setResults(prev => prev.map((item, idx) => selectedItems.includes(idx) ? { ...item, processed: true } : item));
      
      setPointsData(prev => ({ 
        total_points: Number((prev.total_points + res.data.total_points).toFixed(2)), 
        breakdown: [...prev.breakdown, ...res.data.breakdown] 
      }));
      
      setSelectedItems([]); 
      setStatus(`Success! Added ${res.data.total_points} points.`);
    } catch (e) { 
      setStatus("Calculation failed"); 
    }
  };

  const saveResultToProfile = async () => {
    if (pointsData.total_points <= 0) return setStatus("No Aura Points to save! Add items to total first.");
    setClaiming(true);
    try {
      setStatus("Syncing Aura Points...");
      const { data } = await api.post("/users/claim-points", { amount: pointsData.total_points });
      
      if (me) setUser({ ...me, impact_score: data.new_score, can_claim_today: false });
      toast.success(`🎉 +${data.points_awarded} pts! Streak: ${data.streak} day${data.streak>1?"s":""}`, { duration: 4000 });
      
      handleClose();
    } catch (error: any) {
      setStatus("Save failed. Check backend connection.");
      const detail = error?.response?.data?.detail;
      const errorMessage = Array.isArray(detail) ? detail[0].msg : (typeof detail === "string" ? detail : "Failed to claim");
      toast.error(errorMessage);
    } finally {
      setClaiming(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null); 
    setPreviewType("none");
    setResults([]); 
    setSelectedItems([]); 
    setPointsData({ total_points: 0, breakdown: [] });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="relative w-full max-w-6xl bg-zinc-900 rounded-3xl border border-zinc-800 flex flex-col max-h-[95vh] overflow-hidden text-white">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h1 className="text-2xl font-bold">Smart Lens System</h1>
          <button onClick={handleClose} className="text-3xl hover:text-red-500 transition-colors">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="relative bg-black rounded-2xl h-[400px] overflow-hidden border border-zinc-700">
                {previewType === "camera" && (
                    <video ref={(el) => { videoRef.current = el; if (el && streamRef.current) el.srcObject = streamRef.current; }} 
                        autoPlay muted playsInline className="w-full h-full object-cover" />
                )}
                {previewType === "captured" && <img src={capturedImage!} className="w-full h-full object-cover" alt="Captured" />}
                {isRecording && <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full animate-pulse text-xs font-bold">RECORDING DISPOSAL</div>}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={startCamera} className="bg-zinc-800 hover:bg-white hover:text-black transition-all py-2 rounded-xl font-bold text-xs text-zinc-400">Open Camera</button>
                <button onClick={capturePhoto} className="bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all py-2 rounded-xl text-xs text-zinc-400">Capture</button>
                <button onClick={startRecording} disabled={isRecording || !cameraOn} className="bg-zinc-800 disabled:opacity-50 hover:bg-red-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Start Rec</button>
                <button onClick={stopRecording} disabled={!isRecording} className="bg-zinc-800 disabled:opacity-50 hover:bg-red-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Stop Rec</button>
                <button onClick={verifyImage} className="bg-zinc-800 hover:bg-blue-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Verify Image</button>
                <button onClick={verifyAction} className="bg-zinc-800 hover:bg-orange-600 hover:text-white transition-all py-2 rounded-xl text-xs font-bold text-zinc-400">Verify Action</button>
                <button onClick={stopCamera} className="bg-zinc-800 hover:bg-zinc-700 hover:text-white transition-all py-2 rounded-xl text-xs text-zinc-400">Off Camera</button>
                <button onClick={saveResultToProfile} disabled={claiming} className="bg-green-600 hover:bg-green-500 hover:text-white transition-all py-2 rounded-xl text-xs font-bold flex items-center justify-center">
                    {claiming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Profile"}
                </button>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-zinc-700 flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Verification Panel</h2>
              <div className="bg-zinc-900 p-4 rounded-xl mb-4 border border-zinc-700">
                <p className="text-xs text-zinc-500 uppercase font-bold">System Status</p>
                <p className="text-sm text-blue-400">{status} {isScanning && <Loader2 className="h-3 w-3 inline animate-spin" />}</p>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto min-h-[200px] pr-2">
                {results.map((item, idx) => (
                  <div key={idx} onClick={() => toggleItemSelection(idx)}
                    className={`border-2 rounded-xl p-4 flex justify-between items-center transition-all ${
                      item.processed ? "opacity-40 bg-zinc-800 border-transparent cursor-not-allowed" : 
                      selectedItems.includes(idx) ? "bg-blue-600/20 border-blue-500 cursor-pointer" : "bg-zinc-900 border-zinc-700 cursor-pointer"
                    }`}>
                    <div>
                      <p className="font-bold text-lg">{item.class || item.class_name}</p>
                      <p className="text-xs text-zinc-500">{item.processed ? " POINTS ADDED" : selectedItems.includes(idx) ? " SELECTED" : "Click to select"}</p>
                    </div>
                    <div className={`${item.processed ? 'bg-zinc-700' : 'bg-blue-600'} h-10 w-10 rounded-full flex items-center justify-center font-bold`}>{item.count}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-zinc-700 pt-6">
                <button onClick={calculatePoints} className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-4 rounded-2xl shadow-xl mb-4">Add Selected to Total</button>
                <div className="bg-zinc-900 rounded-2xl p-4 border border-green-600/30">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-bold text-emerald-400">Total Profile Points {"->"} </h3>
                    <span className="text-2xl font-black">{pointsData.total_points}</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                    {pointsData.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between text-xs text-zinc-400 border-b border-zinc-800 pb-1">
                        <span>{item.item} (x{item.count})</span>
                        <span className={`${item.total > 0 ? 'text-green-500' : 'text-red-500'} font-bold`}>{item.total > 0 ? `+${item.total}` : 'Rejected'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}