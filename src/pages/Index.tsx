
import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Upload, Download, Loader } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ImageFormat {
  name: string;
  width: number;
  height: number;
  ratio: number;
}

const instagramFormats: Record<string, ImageFormat> = {
  'square': { name: '정방형', width: 1080, height: 1080, ratio: 1/1 },
  'portrait': { name: '세로형', width: 1080, height: 1350, ratio: 4/5 },
  'landscape': { name: '가로형', width: 1080, height: 566, ratio: 1.91/1 },
  'story_reels': { name: '스토리/릴스', width: 1080, height: 1920, ratio: 9/16 }
};

const Index = () => {
  const [selectedFormat, setSelectedFormat] = useState<string>('square');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [fileError, setFileError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string>('optimized_image');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize canvas with placeholder
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 300;
        canvas.height = 150;
        ctx.fillStyle = '#e2e8f0'; // bg-slate-200
        ctx.fillRect(0, 0, 300, 150);
        ctx.fillStyle = '#94a3b8'; // text-slate-400
        ctx.textAlign = 'center';
        ctx.font = '14px sans-serif';
        ctx.fillText('이미지를 선택하면 여기에 미리보기가 표시됩니다.', 150, 75);
      }
    }
  }, []);

  useEffect(() => {
    if (originalImage) {
      updatePreview();
    }
  }, [selectedFormat, originalImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setFileError('');
    setStatusMessage('');

    if (files && files.length > 0) {
      const file = files[0];
      
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setFileError('지원하지 않는 파일 형식입니다. JPEG, PNG, WEBP 파일을 선택해주세요.');
        setOriginalImage(null);
        resetCanvas();
        return;
      }

      setUploadedFileName(file.name.split('.').slice(0, -1).join('.'));
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          const img = new window.Image();  // Use window.Image instead of Image
          img.onload = () => {
            setOriginalImage(img);
          };
          img.onerror = () => {
            setFileError('이미지 파일을 불러오는 데 실패했습니다.');
            setOriginalImage(null);
          };
          img.src = result;
        }
      };
      reader.readAsDataURL(file);
    } else {
      setOriginalImage(null);
      resetCanvas();
    }
  };

  const resetCanvas = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 300;
        canvas.height = 150;
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(0, 0, 300, 150);
        ctx.fillStyle = '#94a3b8';
        ctx.textAlign = 'center';
        ctx.font = '14px sans-serif';
        ctx.fillText('이미지를 선택하면 여기에 미리보기가 표시됩니다.', 150, 75);
      }
    }
  };

  const updatePreview = () => {
    if (!originalImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const format = instagramFormats[selectedFormat];
    const targetWidth = format.width;
    const targetHeight = format.height;
    const targetAspectRatio = targetWidth / targetHeight;

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ow = originalImage.width;
    const oh = originalImage.height;
    const oar = ow / oh;

    let sx = 0, sy = 0, sWidth = ow, sHeight = oh;

    if (oar > targetAspectRatio) {
      // Original is wider than target (need to crop sides)
      sHeight = oh;
      sWidth = oh * targetAspectRatio;
      sx = (ow - sWidth) / 2;
    } else if (oar < targetAspectRatio) {
      // Original is taller than target (need to crop top/bottom)
      sWidth = ow;
      sHeight = ow / targetAspectRatio;
      sy = (oh - sHeight) / 2;
    }

    ctx.clearRect(0, 0, targetWidth, targetHeight);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(originalImage, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
    setStatusMessage('미리보기가 업데이트되었습니다. 다운로드 버튼을 누르세요.');
  };

  const dataURLtoBlob = (dataURL: string): Blob => {
    const arr = dataURL.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
      console.error("Invalid dataURL format");
      return new Blob();
    }
    
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
  };

  const handleOptimizeAndDownload = async () => {
    if (!originalImage || !canvasRef.current) {
      setStatusMessage('먼저 이미지를 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setStatusMessage('이미지를 최적화하는 중입니다... 잠시만 기다려주세요.');

    // Ensure preview is up-to-date
    updatePreview();

    // Use a short timeout to allow the UI to update
    await new Promise(resolve => setTimeout(resolve, 50));

    const canvas = canvasRef.current;
    const format = instagramFormats[selectedFormat];
    const targetMinBytes = 0.8 * 1024 * 1024; // 0.8MB
    const targetMaxBytes = 1.5 * 1024 * 1024; // 1.5MB
    let quality = 0.92; // Start with high quality
    let optimizedBlob: Blob | null = null;
    let finalQuality = quality;

    // Iteratively adjust quality to find optimal file size
    for (let q = quality; q >= 0.4; q -= 0.05) {
      const dataUrl = canvas.toDataURL('image/jpeg', q);
      const blob = dataURLtoBlob(dataUrl);

      if (blob.size <= targetMaxBytes) {
        optimizedBlob = blob;
        finalQuality = q;
        if (blob.size >= targetMinBytes) {
          break;
        }
      }

      if (q <= 0.4 && !optimizedBlob) {
        optimizedBlob = blob;
        finalQuality = q;
      }
    }

    // Fallback if no suitable blob found
    if (!optimizedBlob) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
      optimizedBlob = dataURLtoBlob(dataUrl);
      finalQuality = 0.4;
    }

    const url = URL.createObjectURL(optimizedBlob);
    const link = document.createElement('a');
    link.href = url;
    const formatName = format.name.toLowerCase().replace(/\s+/g, '_');
    link.download = `${uploadedFileName}_insta_${formatName}_${format.width}x${format.height}.jpg`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsLoading(false);
    const fileSizeMB = optimizedBlob.size / (1024 * 1024);
    setStatusMessage(`다운로드 완료! 파일 크기: ${fileSizeMB.toFixed(2)}MB (품질: ${finalQuality.toFixed(2)})`);
  };

  const handleUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex items-center justify-center py-6 px-4">
      <div className="container max-w-xl bg-white shadow-xl rounded-lg p-6 md:p-8">
        <header className="text-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-sky-600 flex justify-center items-center gap-2">
            <ImageIcon className="h-8 w-8" />
            인스타그램 이미지 최적화 도구
          </h1>
          <p className="text-sm text-slate-600 mt-2">이미지를 선택하고 원하는 형식으로 변환하세요.</p>
        </header>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">1. 이미지 파일 선택:</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg, image/png, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button 
              onClick={handleUploadClick}
              className="w-full flex items-center justify-center gap-2 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-slate-300"
              variant="outline"
            >
              <Upload className="h-4 w-4" />
              이미지 업로드
            </Button>
            {fileError && <p className="text-red-500 text-xs mt-1">{fileError}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">2. 인스타그램 게시물 형식:</label>
            <Select
              value={selectedFormat}
              onValueChange={setSelectedFormat}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="형식 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="square">정방형 (1:1) - 1080x1080px</SelectItem>
                <SelectItem value="portrait">세로형 (4:5) - 1080x1350px</SelectItem>
                <SelectItem value="landscape">가로형 (1.91:1) - 1080x566px</SelectItem>
                <SelectItem value="story_reels">스토리/릴스 (9:16) - 1080x1920px</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-1">3. 미리보기:</h3>
            <div className="relative">
              <canvas 
                ref={canvasRef} 
                className="bg-slate-200 border border-slate-300 rounded-md max-w-full h-auto mx-auto"
                style={{ maxHeight: '400px' }}
              ></canvas>
            </div>
          </div>
          
          <Button
            onClick={handleOptimizeAndDownload}
            className="w-full bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center gap-2"
            disabled={!originalImage || isLoading}
          >
            {isLoading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            최적화 및 다운로드
          </Button>

          {statusMessage && (
            <div className="text-center text-sm text-slate-600 mt-4">
              {statusMessage}
            </div>
          )}
        </div>

        <footer className="text-center mt-8 text-xs text-slate-500">
          <p>&copy; 2025 이미지 최적화 도구. 모든 권리 보유.</p>
          <p className="mt-1">참고: 이미지는 브라우저 내에서만 처리되며, 서버로 전송되지 않습니다.</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
