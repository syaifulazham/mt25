"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image as ImageIcon,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Code,
  Quote,
  X,
  Upload,
  FileImage
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { uploadFile, getUploadedImages } from "@/lib/upload-service";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

interface ImageGalleryProps {
  onSelect: (imageUrl: string) => void;
}

function ImageGallery({ onSelect }: ImageGalleryProps) {
  const [images, setImages] = useState<Array<{
    id: string;
    url: string;
    filename: string;
    createdAt: string;
    fileSize: number;
    dimensions?: { width: number; height: number };
  }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        setIsLoading(true);
        const response = await getUploadedImages();
        setImages(response.images);
        setError(null);
      } catch (err) {
        setError("Failed to load images. Please try again.");
        console.error("Error fetching images:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchImages();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
        <p>No images found. Upload some images to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 p-4 max-h-[400px] overflow-y-auto">
      {images.map((image) => (
        <div 
          key={image.id} 
          className="relative group cursor-pointer border rounded-md overflow-hidden"
          onClick={() => onSelect(image.url)}
        >
          <img 
            src={image.url} 
            alt={image.filename} 
            className="w-full aspect-square object-cover transition-transform group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm">Select</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RichEditor({ value, onChange, placeholder, className, minHeight = "200px" }: RichEditorProps) {
  const [text, setText] = useState(value);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("Image");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only update local state when the parent value changes and is different from current text
  useEffect(() => {
    if (value !== text) {
      setText(value);
    }
  }, [value]);

  // Handle text change without causing infinite loop
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    setText(newText);
    onChange(newText);
  };

  // Track selection position
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setSelectionStart(target.selectionStart);
    setSelectionEnd(target.selectionEnd);
  };

  // Insert markdown at cursor position or around selected text
  const insertMarkdown = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;

    const start = selectionStart;
    const end = selectionEnd;
    const selectedText = text.substring(start, end);
    const newText = 
      text.substring(0, start) + 
      prefix + 
      selectedText + 
      suffix + 
      text.substring(end);
    
    setText(newText);
    onChange(newText);
    
    // Focus back on textarea and set cursor position after operation
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Format buttons handlers
  const formatBold = () => insertMarkdown("**", "**");
  const formatItalic = () => insertMarkdown("*", "*");
  const formatUnderline = () => insertMarkdown("<u>", "</u>");
  const formatH1 = () => insertMarkdown("# ");
  const formatH2 = () => insertMarkdown("## ");
  const formatH3 = () => insertMarkdown("### ");
  const formatList = () => insertMarkdown("- ");
  const formatOrderedList = () => insertMarkdown("1. ");
  const formatCode = () => insertMarkdown("`", "`");
  const formatCodeBlock = () => insertMarkdown("```\n", "\n```");
  const formatQuote = () => insertMarkdown("> ");
  const formatAlignLeft = () => insertMarkdown("<div style=\"text-align: left\">", "</div>");
  const formatAlignCenter = () => insertMarkdown("<div style=\"text-align: center\">", "</div>");
  const formatAlignRight = () => insertMarkdown("<div style=\"text-align: right\">", "</div>");
  
  const formatLink = () => {
    const selectedText = text.substring(selectionStart, selectionEnd);
    const linkText = selectedText || "Link text";
    insertMarkdown(`[${linkText}](`, ")");
  };
  
  const openImageDialog = () => {
    setImageUrl("");
    setImageAlt("Image");
    setIsImageDialogOpen(true);
  };

  const insertImage = () => {
    if (imageUrl) {
      insertMarkdown(`![${imageAlt}](${imageUrl})`);
      setIsImageDialogOpen(false);
    } else {
      toast.error("Please enter an image URL or upload an image");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);
      
      // Simulate progress (in a real app, you'd use an upload progress event)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const imageUrl = await uploadFile(file, "content");
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Set the uploaded image URL
      setImageUrl(imageUrl);
      setImageAlt(file.name.split('.')[0]);
      
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleGalleryImageSelect = (url: string) => {
    setImageUrl(url);
    setActiveTab("url");
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1 p-1 border rounded-md bg-muted/50">
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatBold}
        >
          <Bold className="h-4 w-4" />
          <span className="sr-only">Bold</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatItalic}
        >
          <Italic className="h-4 w-4" />
          <span className="sr-only">Italic</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatUnderline}
        >
          <Underline className="h-4 w-4" />
          <span className="sr-only">Underline</span>
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatH1}
        >
          <Heading1 className="h-4 w-4" />
          <span className="sr-only">Heading 1</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatH2}
        >
          <Heading2 className="h-4 w-4" />
          <span className="sr-only">Heading 2</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatH3}
        >
          <Heading3 className="h-4 w-4" />
          <span className="sr-only">Heading 3</span>
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatList}
        >
          <List className="h-4 w-4" />
          <span className="sr-only">Bullet List</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatOrderedList}
        >
          <ListOrdered className="h-4 w-4" />
          <span className="sr-only">Numbered List</span>
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatCode}
        >
          <Code className="h-4 w-4" />
          <span className="sr-only">Inline Code</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatQuote}
        >
          <Quote className="h-4 w-4" />
          <span className="sr-only">Quote</span>
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatAlignLeft}
        >
          <AlignLeft className="h-4 w-4" />
          <span className="sr-only">Align Left</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatAlignCenter}
        >
          <AlignCenter className="h-4 w-4" />
          <span className="sr-only">Align Center</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatAlignRight}
        >
          <AlignRight className="h-4 w-4" />
          <span className="sr-only">Align Right</span>
        </Button>
        <div className="w-px h-8 bg-border mx-1" />
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={formatLink}
        >
          <Link className="h-4 w-4" />
          <span className="sr-only">Link</span>
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="sm" 
          className="h-8 w-8 p-0" 
          onClick={openImageDialog}
        >
          <ImageIcon className="h-4 w-4" />
          <span className="sr-only">Image</span>
        </Button>
      </div>
      
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleTextChange}
        onSelect={handleSelect}
        placeholder={placeholder}
        className={cn(`min-h-[${minHeight}] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono`, className)}
        rows={10}
      />
      
      <div className="text-xs text-muted-foreground">
        Use Markdown for formatting. You can also use HTML for advanced formatting.
      </div>

      {/* Image Dialog */}
      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Insert Image</DialogTitle>
            <DialogDescription>
              Upload a new image or select one from your gallery.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upload">Upload</TabsTrigger>
              <TabsTrigger value="gallery">Gallery</TabsTrigger>
              <TabsTrigger value="url">URL</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="py-4">
              <div className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="image-upload">Upload Image</Label>
                  <Input 
                    ref={fileInputRef}
                    id="image-upload" 
                    type="file" 
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
                
                {isUploading && (
                  <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}
                
                {imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm mb-2">Preview:</p>
                    <div className="border rounded-md p-2 max-w-full overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={imageAlt} 
                        className="max-h-[200px] max-w-full object-contain mx-auto"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="gallery" className="py-4">
              <ImageGallery onSelect={handleGalleryImageSelect} />
            </TabsContent>
            
            <TabsContent value="url" className="py-4">
              <div className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="image-url">Image URL</Label>
                  <Input 
                    id="image-url" 
                    value={imageUrl} 
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="image-alt">Alt Text</Label>
                  <Input 
                    id="image-alt" 
                    value={imageAlt} 
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Image description"
                  />
                </div>
                
                {imageUrl && (
                  <div className="mt-4">
                    <p className="text-sm mb-2">Preview:</p>
                    <div className="border rounded-md p-2 max-w-full overflow-hidden">
                      <img 
                        src={imageUrl} 
                        alt={imageAlt} 
                        className="max-h-[200px] max-w-full object-contain mx-auto"
                        onError={() => toast.error("Failed to load image. Please check the URL.")}
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={insertImage} disabled={!imageUrl}>
              Insert Image
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
