import React, { useRef, useState } from 'react';
import { Upload, FileImage, Loader2 } from 'lucide-react';
import { Button } from './Button';

interface MapUploaderProps {
  onUpload: (file: File) => void;
}

export const MapUploader: React.FC<MapUploaderProps> = ({ onUpload }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.match('image/jpeg') && !file.type.match('image/png') && !file.type.match('image/webp')) {
      alert("Only JPEG, PNG, or WEBP maps are supported by the archives.");
      return;
    }

    setIsProcessing(true);
    // Simulate a brief processing delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    onUpload(file);
    setIsProcessing(false);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`
        relative overflow-hidden rounded-lg border-2 border-dashed transition-all duration-300
        flex flex-col items-center justify-center p-12 text-center group
        ${isDragging 
          ? 'border-emerald-500 bg-emerald-900/10' 
          : 'border-stone-700 bg-stone-900/50 hover:border-stone-500 hover:bg-stone-900'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/jpeg,image/png,image/webp"
      />
      
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>

      {isProcessing ? (
        <div className="flex flex-col items-center animate-pulse">
          <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
          <h3 className="text-xl font-display text-emerald-100">Unrolling Scroll...</h3>
        </div>
      ) : (
        <>
          <div className={`
            w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mb-6
            group-hover:scale-110 group-hover:bg-stone-700 transition-all duration-300
          `}>
            <Upload className="w-8 h-8 text-stone-400 group-hover:text-emerald-400" />
          </div>
          
          <h3 className="text-xl font-display font-bold text-stone-200 mb-2">
            Upload Battle Map
          </h3>
          <p className="text-stone-500 max-w-sm mb-6">
            Drag and drop your map file here, or click to browse the archives.
            Supports JPEG, PNG.
          </p>
          
          <Button 
            onClick={() => fileInputRef.current?.click()}
            icon={<FileImage />}
          >
            Select File
          </Button>
        </>
      )}
    </div>
  );
};