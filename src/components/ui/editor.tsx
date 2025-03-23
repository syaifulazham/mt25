"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Link, 
  Image, 
  Heading1, 
  Heading2, 
  Heading3, 
  AlignLeft, 
  AlignCenter, 
  AlignRight 
} from "lucide-react";

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function Editor({ value, onChange, placeholder, className }: EditorProps) {
  const [text, setText] = useState(value);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);

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
    if (!textareaRef) return;

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
    
    // Focus back on textarea and set cursor position after operation
    setTimeout(() => {
      if (textareaRef) {
        textareaRef.focus();
        const newCursorPos = start + prefix.length + selectedText.length + suffix.length;
        textareaRef.setSelectionRange(newCursorPos, newCursorPos);
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
  
  const formatLink = () => {
    const selectedText = text.substring(selectionStart, selectionEnd);
    const linkText = selectedText || "Link text";
    insertMarkdown(`[${linkText}](`, ")");
  };
  
  const formatImage = () => {
    insertMarkdown("![Image description](", ")");
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
          onClick={formatImage}
        >
          <Image className="h-4 w-4" />
          <span className="sr-only">Image</span>
        </Button>
      </div>
      <Textarea
        ref={(ref) => setTextareaRef(ref)}
        value={text}
        onChange={handleTextChange}
        onSelect={handleSelect}
        placeholder={placeholder}
        className="min-h-[200px] font-mono text-sm"
        rows={10}
      />
      <div className="text-xs text-muted-foreground">
        Use Markdown for formatting. You can also use HTML for advanced formatting.
      </div>
    </div>
  );
}
