"use client";

import { UploadCloud, FileIcon, Check, X } from "lucide-react";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";

interface FileUploadDropzoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in MB
  previewUrl?: string;
  className?: string;
}

export function FileUploadDropzone({
  onFileSelect,
  accept = "image/*",
  maxSize = 2, // 2MB default
  previewUrl,
  className = "",
}: FileUploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(previewUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      if (accept && !file.type.match(accept.replace(/\*/g, ".*"))) {
        return `File type must be ${accept.replace("*", "")}`;
      }

      // Check file size
      if (maxSize && file.size > maxSize * 1024 * 1024) {
        return `File size must be less than ${maxSize}MB`;
      }

      return null;
    },
    [accept, maxSize]
  );

  const processFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setFile(file);
      setError(null);
      onFileSelect(file);

      // Create preview for image files
      if (file.type.match("image.*")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processFile(e.dataTransfer.files[0]);
      }
    },
    [processFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Note: preventDefault() is not needed for change events
      if (e.target.files && e.target.files[0]) {
        processFile(e.target.files[0]);
      }
    },
    [processFile]
  );

  const removeFile = useCallback(() => {
    setFile(null);
    setPreview(null);
    setError(null);
    // Create a new event with an empty FileList
    const event = {
      target: {
        files: undefined
      }
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleChange(event);
  }, [handleChange]);

  return (
    <div className={`relative ${className}`}>
      {preview ? (
        <div className="relative w-full h-full">
          <img 
            src={preview} 
            alt="Uploaded file preview" 
            className="w-full h-full object-cover rounded-md"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8 rounded-full"
            onClick={removeFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className={`
            flex flex-col items-center justify-center w-full h-full border-2 border-dashed 
            rounded-md p-4 transition-colors
            ${dragActive ? "border-primary bg-primary/10" : "border-gray-300 bg-background"}
            ${error ? "border-destructive bg-destructive/10" : ""}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {file ? (
            <div className="flex flex-col items-center justify-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
                {file.type.match("image.*") ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt="Preview" 
                    className="w-10 h-10 object-cover rounded-full" 
                  />
                ) : (
                  <FileIcon className="h-6 w-6 text-primary" />
                )}
              </div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex items-center mt-2">
                <Check className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-xs text-green-500">File uploaded</span>
              </div>
            </div>
          ) : (
            <>
              <UploadCloud className="h-10 w-10 text-gray-400 mb-2" />
              <p className="text-sm font-medium">Drop your file here, or</p>
              <div className="relative mt-2">
                <Button variant="outline" size="sm" asChild>
                  <label>
                    Browse
                    <input
                      type="file"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={handleChange}
                      accept={accept}
                    />
                  </label>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {accept.replace("*", "")} (max {maxSize}MB)
              </p>
            </>
          )}
          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      )}
    </div>
  );
}
