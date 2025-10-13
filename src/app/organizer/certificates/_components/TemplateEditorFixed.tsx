'use client'

import React, { useState, useRef, useEffect } from 'react'
import { PreviewModal } from './PreviewModal'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import { DebugPanel } from './DebugPanel'
import PaperSizeSelector, { PAPER_SIZES, PaperSize } from './PaperSizeSelector'
import CalibrationControls, { CalibrationSettings } from './CalibrationControls'
import CollapsibleSection from './CollapsibleSection'

// Define TextAnchor type for better type safety
type TextAnchor = 'start' | 'middle' | 'end';

interface TemplateEditorProps {
  template?: any // Template data from database
  session: Session
  isNew?: boolean
}

interface Element {
  id: string
  type: 'static_text' | 'dynamic_text' | 'image'
  position: { x: number, y: number }
  content?: string
  prefix?: string  // Added prefix field for dynamic text
  placeholder?: string
  style?: any
  text_anchor?: TextAnchor  // Controls text alignment relative to position
  layer: number
  isSelected?: boolean
}
// Component for the certificate template editor

// Debug function to inspect element properties when rendering
function debugElementProps(element: Element, location: string): string | undefined {
  console.log(`Rendering element ${element.id} at ${location} with text_anchor: "${element.text_anchor}" (${typeof element.text_anchor})`)
  return element.text_anchor
}export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {
  // Function to fix text anchor properties in the elements
  const fixElementProperties = () => {
    const updatedElements = elements.map(element => {
      const updatedElement = {...element};
      
      // Fix text elements
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Update text_anchor based on style.align
        if (element.style?.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
    
    // Update state with fixed elements
    setElements(updatedElements);
    console.log('Fixed elements with proper text_anchor and prefix values');
    setSuccess('Text properties fixed!');
  };

  // Function to fix text anchor properties in the elements
  const ensureElementProperties = (elements: Element[]): Element[] => {
    return elements.map(element => {
      // Deep clone the element
      const updatedElement = JSON.parse(JSON.stringify(element));
      
      // For text elements, ensure properties are properly set
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Set text_anchor based on style.align
        if (element.style?.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
  };
  // IMMEDIATE DEBUG: Log template configuration as received from server
  console.log("TEMPLATE RAW DATA FROM SERVER:", JSON.stringify(template?.configuration?.elements?.map((el: Element) => ({
    id: el.id,
    type: el.type,
    text_anchor: el.text_anchor,
    style: el.style,
    prefix: el.prefix
  })), null, 2));

  // IMMEDIATE DEBUG: Log template configuration as received from server
  console.log('TEMPLATE RAW DATA:', template?.configuration?.elements?.map((el: Element) => ({
    id: el.id,
    type: el.type,
    text_anchor: el.text_anchor,
    style: el.style
  })));
  
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(template?.basePdfPath || null)
  
  // Initialize paper size from template or default to A4 Landscape
  const initialPaperSize = (): PaperSize => {
    if (template?.configuration?.canvas) {
      const { width, height, paperSize } = template.configuration.canvas;
      
      // If paperSize is specified, use that
      if (paperSize && PAPER_SIZES[paperSize]) {
        return PAPER_SIZES[paperSize];
      }
      
      // Otherwise try to determine from width/height
      for (const [key, size] of Object.entries(PAPER_SIZES)) {
        if (size.width === width && size.height === height) {
          return size;
        }
      }
    }
    
    // Default to A4 Landscape if no match
    return PAPER_SIZES['A4-Landscape'];
  };
  
  const [paperSize, setPaperSize] = useState<PaperSize>(initialPaperSize())
  
  // Initialize calibration settings from template or use defaults
  const initialCalibration = (): CalibrationSettings => {
    if (template?.configuration?.calibration) {
      return {
        scaleX: template.configuration.calibration.scaleX || 1,
        scaleY: template.configuration.calibration.scaleY || 1,
        offsetY: template.configuration.calibration.offsetY || 0,
        baselineRatio: template.configuration.calibration.baselineRatio || 0.35
      };
    }
    return {
      scaleX: 1,
      scaleY: 1,
      offsetY: 0,
      baselineRatio: 0.35
    };
  };
  
  const [calibration, setCalibration] = useState<CalibrationSettings>(initialCalibration())
  
  // Process elements when loading to ensure all required properties exist
  const processLoadedElements = (loadedElements: Element[] = []): Element[] => {
    console.log('Processing loaded elements:', JSON.stringify(loadedElements, null, 2));
    
    return loadedElements.map(element => {
      // Make a deep copy to ensure we don't modify the original reference
      const processedElement = JSON.parse(JSON.stringify(element));
      
      console.log(`Element ${element.id} original properties from template:`, {
        type: element.type,
        text_anchor: element.text_anchor,
        'style.align': element.style?.align,
        prefix: element.prefix
      });
      
      // Ensure text elements have all necessary properties
      if (element.type === 'static_text' || element.type === 'dynamic_text') {
        // IMPORTANT: Only set defaults if properties are actually missing/undefined
        // DO NOT overwrite existing text_anchor values
        if (processedElement.text_anchor === undefined) {
          processedElement.text_anchor = 'start';
          console.log(`Added missing text_anchor for element ${element.id}`);
        } else {
          console.log(`Preserving existing text_anchor: ${processedElement.text_anchor}`);
        }
        
        // Initialize style object if not present
        if (!processedElement.style) {
          processedElement.style = {
            font_family: 'Arial',
            font_size: 16,
            color: '#000000',
            font_weight: 'normal',
            align: 'left'
          };
          console.log(`Added missing style for element ${element.id}`);
        } else if (!processedElement.style.align) {
          // Ensure style.align exists
          processedElement.style.align = 'left';
          console.log(`Added missing style.align for element ${element.id}`);
        }
        
        // For dynamic text, ensure prefix is defined
        if (element.type === 'dynamic_text' && processedElement.prefix === undefined) {
          processedElement.prefix = '';
          console.log(`Added missing prefix for dynamic text element ${element.id}`);
        } else if (element.type === 'dynamic_text') {
          console.log(`Preserving existing prefix: "${processedElement.prefix}"`);
        }
      }
      
      console.log(`Element ${element.id} PROCESSED properties:`, {
        type: processedElement.type,
        text_anchor: processedElement.text_anchor,
        'style.align': processedElement.style?.align,
        prefix: processedElement.prefix
      });
      
      return processedElement;
    });
  };
  
  // Initialize elements state with processed elements from template
  const [elements, setElements] = useState<Element[]>(
    processLoadedElements(template?.configuration?.elements || [])
  );
  
  const [templateName, setTemplateName] = useState(template?.templateName || 'New Template')
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  // Target audience configuration states
  const [targetType, setTargetType] = useState<'GENERAL' | 'EVENT_PARTICIPANT' | 'EVENT_WINNER'>(template?.targetType || 'GENERAL')
  const [eventId, setEventId] = useState<number | null>(template?.eventId || null)
  const [winnerRangeStart, setWinnerRangeStart] = useState<number | null>(template?.winnerRangeStart || 1)
  const [winnerRangeEnd, setWinnerRangeEnd] = useState<number | null>(template?.winnerRangeEnd || 3)
  const [events, setEvents] = useState<{id: number, name: string}[]>([])
  
  // Set up state for showing preview modal
  const [showPreview, setShowPreview] = useState(false)
  // Debug mode toggle
  const [debugMode, setDebugMode] = useState(true)
  // Full page mode toggle
  const [isFullPage, setIsFullPage] = useState(false)
  const [mockupData, setMockupData] = useState<Record<string, string>>({
    recipient_name: 'John Doe',
    recipient_email: 'john.doe@example.com',
    award_title: 'Certificate of Achievement',
    contest_name: 'Loading contests...',
    contingent_name: 'ABC School',
    team_name: 'Team Innovators',
    ic_number: '990101-10-1234',
    issue_date: new Date().toLocaleDateString(),
    unique_code: 'CERT-' + Math.random().toString(36).substring(2, 10).toUpperCase()
  })
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(true)
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true)
  const [contests, setContests] = useState<{id: number, name: string, code: string, displayName: string}[]>([])
  
  // Fetch contests for the preview mockup data
  const fetchContests = async () => {
    try {
      const response = await fetch('/api/certificates/contests')
      if (!response.ok) {
        throw new Error('Failed to fetch contests')
      }
      const data = await response.json()
      setContests(data.contests)
      
      // Set a default contest name if contests are available
      if (data.contests && data.contests.length > 0) {
        setMockupData(prev => ({
          ...prev,
          contest_name: data.contests[0].displayName
        }))
      }
    } catch (error) {
      console.error('Error fetching contests:', error)
    }
  }

  // Fetch events for target audience selection
  const fetchEvents = async () => {
    try {
      console.log('Fetching events for certificates...')
      const response = await fetch('/api/certificates/events')
      console.log('Events API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Failed to fetch events, status:', response.status, 'response:', errorText)
        throw new Error(`Failed to fetch events: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Events API response:', data)
      
      if (data && data.events && Array.isArray(data.events)) {
        console.log(`Setting ${data.events.length} events`)
        setEvents(data.events)
      } else {
        console.error('Unexpected events data format:', data)
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  // Fetch data when component mounts
  useEffect(() => {
    fetchContests()
    fetchEvents()
  }, [])
  
  // Handle PDF file selection
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed')
      return
    }
    
    // Create FormData for upload
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch('/api/certificates/upload-pdf', {
        method: 'POST',
        body: formData
      })
      
      if (!response.ok) {
        throw new Error('Failed to upload PDF file')
      }
      
      const { filePath } = await response.json()
      setPdfUrl(filePath)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while uploading the PDF')
      console.error('PDF upload error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Handle adding a new element
  const handleAddElement = (type: 'static_text' | 'dynamic_text' | 'image') => {
    const newId = `element_${Date.now()}`
    
    // Create base element properties
    let newElement: Element = {
      id: newId,
      type,
      position: { x: 100, y: 100 },
      layer: elements.length + 1,
      text_anchor: 'start', // Default text anchor is 'start' (left-aligned)
    }
    
    // Add type-specific properties
    if (type === 'static_text') {
      newElement.content = 'Sample Text'
      newElement.style = {
        font_family: 'Arial',
        font_size: 16,
        color: '#000000',
        font_weight: 'normal',
        align: 'left'
      }
    } else if (type === 'dynamic_text') {
      // Choose from expanded set of placeholders
      const placeholders = ['recipient_name', 'contingent_name', 'team_name', 'contest_name', 'award_title', 'ic_number'];
      const randomIndex = Math.floor(Math.random() * placeholders.length);
      newElement.placeholder = `{{${placeholders[randomIndex]}}}`
      newElement.prefix = '' // Initialize empty prefix for dynamic text
      newElement.style = {
        font_family: 'Arial',
        font_size: 16,
        color: '#000000',
        font_weight: 'normal',
        align: 'left'
      }
    }
    
    // Log element creation for debugging
    console.log('Created new element with properties:', {
      id: newElement.id,
      type: newElement.type,
      prefix: newElement.prefix,
      text_anchor: newElement.text_anchor,
      'style.align': newElement.style?.align
    })
    
    setElements([...elements, newElement])
    setSelectedElement(newElement)
  }
  
  // Handle clicking on an element
  const handleElementClick = (element: Element, e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('Selected element with properties:', {
      id: element.id,
      type: element.type,
      text_anchor: element.text_anchor,
      'style.align': element.style?.align,
      prefix: element.prefix
    })
    setSelectedElement(element)
  }
  
  // Handle clicking on the canvas (deselect elements)
  // Function to fix text anchor properties in the elements
  const fixTextAnchorProperties = () => {
    const updatedElements = elements.map(element => {
      const updatedElement = {...element};
      
      // Ensure text_anchor is set based on style.align
      if (element.type === 'dynamic_text' || element.type === 'static_text') {
        // Update text_anchor based on style.align
        if (element.style?.align === 'center') {
          updatedElement.text_anchor = 'middle';
        } else if (element.style?.align === 'right') {
          updatedElement.text_anchor = 'end';
        } else {
          updatedElement.text_anchor = 'start';
        }
        
        // Ensure prefix exists for dynamic text
        if (element.type === 'dynamic_text' && updatedElement.prefix === undefined) {
          updatedElement.prefix = '';
        }
      }
      
      return updatedElement;
    });
    
    // Update state with fixed elements
    setElements(updatedElements);
    
    // Set success message
    setSuccess('Text anchor properties fixed! Try selecting an element now.');
    
    // Print debug info
    console.log('Fixed elements:', updatedElements);
  };
  const handleCanvasClick = () => {
    setSelectedElement(null)
  }
  
  // Handle element drag start
  const handleDragStart = (e: React.MouseEvent, element: Element) => {
    e.stopPropagation()
    setIsDragging(true)
    setDragStartPosition({ x: e.clientX, y: e.clientY })
    setSelectedElement(element)
  }
  
  // Handle element drag
  const handleDrag = (e: MouseEvent) => {
    if (!isDragging || !selectedElement) return
    
    const dx = e.clientX - dragStartPosition.x
    const dy = e.clientY - dragStartPosition.y
    
    setDragStartPosition({ x: e.clientX, y: e.clientY })
    
    // Update element position
    setElements(prevElements => prevElements.map(el => {
      if (el.id === selectedElement.id) {
        return {
          ...el,
          position: {
            x: el.position.x + dx,
            y: el.position.y + dy
          }
        }
      }
      return el
    }))
  }
  
  // Handle element drag end
  const handleDragEnd = () => {
    setIsDragging(false)
  }
  
  // Update element properties
  const updateElementProperty = (property: string, value: any) => {
    if (!selectedElement) return
    
    // For font size updates, ensure we're using a valid numeric value
    if (property === 'style.font_size') {
      // Ensure font size is a valid number
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 8) {
        value = 16; // Default to 16px if invalid
      }
    }
    
    // Update the selected element immediately for better visual feedback
    if (property.startsWith('style.')) {
      const styleProp = property.split('.')[1]
      setSelectedElement({
        ...selectedElement,
        style: {
          ...selectedElement.style,
          [styleProp]: value
        }
      });
    } else {
      setSelectedElement({
        ...selectedElement,
        [property]: value
      });
    }
    
    // Update all elements in state
    setElements(prevElements => prevElements.map(el => {
      if (el.id === selectedElement.id) {
        if (property.startsWith('style.')) {
          const styleProp = property.split('.')[1]
          return {
            ...el,
            style: {
              ...el.style,
              [styleProp]: value
            }
          }
        }
        return { ...el, [property]: value }
      }
      return el
    }))
  }
  
  // Delete selected element
  const deleteSelectedElement = () => {
    if (!selectedElement) return
    
    setElements(prevElements => prevElements.filter(el => el.id !== selectedElement.id))
    setSelectedElement(null)
  }
  
  // Center element horizontally on the page
  const centerElementHorizontally = () => {
    if (!selectedElement || !canvasRef.current) return
    
    // Canvas dimensions from selected paper size
    const canvasWidth = paperSize.width; // Use the selected paper size width
    
    // Estimate element width based on content and type
    let elementWidth = 100; // Default width estimate
    
    if (selectedElement.type === 'static_text' || selectedElement.type === 'dynamic_text') {
      // For text elements, estimate width based on content length and font size
      let content = '';
      
      if (selectedElement.type === 'static_text') {
        content = selectedElement.content || '';
      } else {
        // For dynamic text, include both prefix and placeholder
        const prefix = selectedElement.prefix || '';
        const placeholder = selectedElement.placeholder || '';
        content = prefix + placeholder;
      }
      
      const fontSize = parseFloat(selectedElement.style?.font_size) || 16;
      // Rough estimate: each character is approximately 0.6 times the font size in width
      elementWidth = Math.max(content.length * fontSize * 0.6, 50);
    } else if (selectedElement.type === 'image') {
      // For images, use a standard width
      elementWidth = 96; // Default image width
    }
    
    // Calculate centered X position
    // Half the canvas width minus half the element width
    const centerX = (canvasWidth / 2) - (elementWidth / 2);
    
    // Update element position
    updateElementProperty('position', {
      ...selectedElement.position,
      x: centerX
    });
    
    // Show confirmation toast
    setSuccess('Element centered horizontally');
    setTimeout(() => setSuccess(null), 1500);
  }
  
  // Center element vertically on the page
  const centerElementVertically = () => {
    if (!selectedElement || !canvasRef.current) return
    
    // Canvas dimensions from selected paper size
    const canvasHeight = paperSize.height; // Use the selected paper size height
    
    // Estimate element height based on type
    let elementHeight = 24; // Default height estimate
    
    if (selectedElement.type === 'static_text' || selectedElement.type === 'dynamic_text') {
      // For text elements, estimate height based on font size
      const fontSize = parseFloat(selectedElement.style?.font_size) || 16;
      elementHeight = fontSize * 1.2; // Line height is typically 1.2 times font size
    } else if (selectedElement.type === 'image') {
      // For images, use a standard height
      elementHeight = 96; // Default image height
    }
    
    // Calculate centered Y position
    // Half the canvas height minus half the element height
    const centerY = (canvasHeight / 2) - (elementHeight / 2);
    
    // Update element position
    updateElementProperty('position', {
      ...selectedElement.position,
      y: centerY
    });
    
    // Show confirmation toast
    setSuccess('Element centered vertically');
    setTimeout(() => setSuccess(null), 1500);
  }
  
  // Center element both horizontally and vertically on the page
  const centerElementBoth = () => {
    if (!selectedElement || !canvasRef.current) return
    
    // Canvas dimensions from selected paper size
    const canvasWidth = paperSize.width; // Use the selected paper size width
    const canvasHeight = paperSize.height; // Use the selected paper size height
    
    // Estimate element dimensions based on content and type
    let elementWidth = 100; // Default width estimate
    let elementHeight = 24; // Default height estimate
    
    if (selectedElement.type === 'static_text' || selectedElement.type === 'dynamic_text') {
      // For text elements, estimate dimensions based on content and font size
      let content = '';
      
      if (selectedElement.type === 'static_text') {
        content = selectedElement.content || '';
      } else {
        // For dynamic text, include both prefix and placeholder
        const prefix = selectedElement.prefix || '';
        const placeholder = selectedElement.placeholder || '';
        content = prefix + placeholder;
      }
      
      const fontSize = parseFloat(selectedElement.style?.font_size) || 16;
      // Rough estimate: each character is approximately 0.6 times the font size in width
      elementWidth = Math.max(content.length * fontSize * 0.6, 50);
      elementHeight = fontSize * 1.2; // Line height is typically 1.2 times font size
    } else if (selectedElement.type === 'image') {
      // For images, use standard dimensions
      elementWidth = 96; // Default image width
      elementHeight = 96; // Default image height
    }
    
    // Calculate centered positions
    const centerX = (canvasWidth / 2) - (elementWidth / 2);
    const centerY = (canvasHeight / 2) - (elementHeight / 2);
    
    // Update element position in one operation to avoid flicker
    updateElementProperty('position', {
      x: centerX,
      y: centerY
    });
    
    // Show confirmation toast
    setSuccess('Element centered on page');
    setTimeout(() => setSuccess(null), 1500);
  }
  
  // Handle save template
  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true)
      setError(null)
      setSuccess(null)
      
      if (!templateName) {
        setError('Template name is required')
        return
      }
      
      if (!pdfUrl) {
        setError('Please upload a PDF template')
        return
      }
      
      // Validation for target audience fields
      if (targetType === 'EVENT_PARTICIPANT' || targetType === 'EVENT_WINNER') {
        if (!eventId) {
          setError('Please select an event for this certificate template')
          return
        }
      }
      
      // Validation for winner range
      if (targetType === 'EVENT_WINNER') {
        if (!winnerRangeStart || winnerRangeStart < 1) {
          setError('Winner range start must be at least 1')
          return
        }
        if (!winnerRangeEnd || winnerRangeEnd < winnerRangeStart) {
          setError('Winner range end must be greater than or equal to range start')
          return
        }
      }
      
      // Ensure all elements have the required properties
      const processedElements = elements.map(element => {
        // Deep clone to avoid modifying the original
        const processedElement = JSON.parse(JSON.stringify(element));
        
        // Make sure text elements have text_anchor and style.align properties
        if (element.type === 'static_text' || element.type === 'dynamic_text') {
          // Ensure text_anchor exists
          if (!processedElement.text_anchor) {
            processedElement.text_anchor = 'start'; // Default to left alignment
          }
          
          // Ensure style exists
          if (!processedElement.style) {
            processedElement.style = {};
          }
          
          // Ensure style.align exists
          if (!processedElement.style.align) {
            processedElement.style.align = 'left';
          }
          
          // Ensure prefix is defined for dynamic text
          if (processedElement.type === 'dynamic_text' && processedElement.prefix === undefined) {
            processedElement.prefix = '';
          }
        }
        
        return processedElement;
      });
      
      // Log elements for debugging
      console.log('Saving elements with prefix, text_anchor, and style.align:', 
        processedElements.map(el => ({
          id: el.id,
          type: el.type,
          prefix: el.prefix,
          text_anchor: el.text_anchor,
          'style.align': el.style?.align
        }))
      );
      
      const templateData = {
        templateName,
        basePdfPath: pdfUrl,
        // Add target audience fields
        targetType,
        eventId: targetType === 'GENERAL' ? null : eventId,
        winnerRangeStart: targetType === 'EVENT_WINNER' ? winnerRangeStart : null,
        winnerRangeEnd: targetType === 'EVENT_WINNER' ? winnerRangeEnd : null,
        configuration: {
          canvas: {
            width: paperSize.width,
            height: paperSize.height,
            scale: 1.0,
            paperSize: Object.keys(PAPER_SIZES).find(key => 
              PAPER_SIZES[key].width === paperSize.width && 
              PAPER_SIZES[key].height === paperSize.height
            ) || 'A4-Landscape',
            orientation: paperSize.orientation
          },
          calibration: {
            scaleX: calibration.scaleX,
            scaleY: calibration.scaleY,
            offsetY: calibration.offsetY,
            baselineRatio: calibration.baselineRatio
          },
          background: {
            pdf_path: pdfUrl,
            page: 1
          },
          elements: processedElements // Use the processed elements
        }
      }
      
      // Determine if creating new or updating
      const url = isNew 
        ? '/api/certificates/templates' 
        : `/api/certificates/templates/${template.id}`
      
      const method = isNew ? 'POST' : 'PUT'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templateData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to ${isNew ? 'create' : 'update'} template`)
      }
      
      const result = await response.json()
      
      setSuccess(`Template ${isNew ? 'created' : 'updated'} successfully`)
      
      // Redirect after successful save (for new templates)
      if (isNew) {
        setTimeout(() => {
          router.push(`/organizer/certificates/templates/${result.template.id}/edit`)
        }, 1500)
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Template save error:', err)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Set up event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', handleDragEnd)
    }
    
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleDragEnd)
    }
  }, [isDragging, dragStartPosition])
  
  // Effect to handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Toggle fullscreen mode with F11 or Ctrl+Shift+F
      if (e.key === 'F11' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f')) {
        e.preventDefault();
        setIsFullPage(!isFullPage);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [isFullPage])
  
  return (
    <div className={`space-y-6 ${isFullPage ? 'fixed inset-0 bg-gray-50 z-50 overflow-auto' : ''}`}>
      {isFullPage && (
        <div className="bg-white p-4 shadow-md flex justify-between items-center sticky top-0 z-10">
          <h1 className="text-xl font-semibold text-gray-800">Certificate Template Designer</h1>
          <button 
            onClick={() => setIsFullPage(false)}
            className="w-10 h-10 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center tooltip-container"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="tooltip">Exit Fullscreen Mode</span>
          </button>
        </div>
      )}
      <div className={`${isFullPage ? 'px-4 py-2' : ''}`}>
      {/* Tooltip Styles */}
      <style jsx global>{
        `
        .tooltip-container {
          position: relative;
        }
        .tooltip {
          position: absolute;
          bottom: -28px;
          left: 50%;
          transform: translateX(-50%);
          background-color: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s, visibility 0.2s;
          z-index: 50;
        }
        .tooltip-container:hover .tooltip {
          opacity: 1;
          visibility: visible;
        }
        `}
      </style>
      {/* Error message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Success message */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
      
      {showKeyboardHelp && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-blue-700">Keyboard Shortcuts Available</p>
                <button
                  onClick={() => setShowKeyboardHelp(false)}
                  className="text-blue-500 hover:text-blue-700 ml-2"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-blue-600 mt-1">Press <span className="font-mono font-bold">F11</span> or <span className="font-mono font-bold">Ctrl+Shift+F</span> to toggle fullscreen mode for better editing experience.</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Template Configuration Section */}
      {isFullPage ? (
        <div className="fixed top-4 left-4 z-50 bg-white rounded-lg shadow border border-gray-200 max-w-md">
          <div className="flex justify-between items-center p-3 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Template Configuration</h2>
            <button 
              onClick={() => setIsFullPage(false)}
              className="p-1 rounded-full hover:bg-gray-100 text-gray-500 tooltip-container"
              title="Exit Fullscreen"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="tooltip">Exit Fullscreen</span>
            </button>
          </div>
          <div className="p-4 max-h-[80vh] overflow-auto">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter template name"
                disabled={isLoading}
                required
              />
            </div>
            
            <div className="space-y-4">
              <CollapsibleSection title="Certificate Size">
                <PaperSizeSelector 
                  currentSize={{ width: paperSize.width, height: paperSize.height }} 
                  onSizeChange={(newSize) => {
                    setPaperSize(newSize);
                    setSuccess(`Paper size changed to ${newSize.name} (${newSize.width}×${newSize.height})`);
                    setTimeout(() => setSuccess(null), 1500);
                  }} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Choose the appropriate size for your certificate. This affects canvas dimensions and element positioning.
                </p>
              </CollapsibleSection>
              
              <CollapsibleSection title="PDF Calibration Settings">
                <CalibrationControls
                  calibration={calibration}
                  onCalibrationChange={(newCalibration) => {
                    setCalibration(newCalibration);
                    setSuccess('Calibration settings updated');
                    setTimeout(() => setSuccess(null), 1500);
                  }}
                />
              </CollapsibleSection>
              
              <CollapsibleSection title="Target Audience">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type</label>
                    <div className="flex flex-col space-y-2">
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="targetType"
                          value="GENERAL" 
                          checked={targetType === 'GENERAL'}
                          onChange={() => setTargetType('GENERAL')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">General Participants</span>
                      </label>
                      
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="targetType"
                          value="EVENT_PARTICIPANT" 
                          checked={targetType === 'EVENT_PARTICIPANT'}
                          onChange={() => setTargetType('EVENT_PARTICIPANT')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Event Participants</span>
                      </label>
                      
                      <label className="inline-flex items-center">
                        <input 
                          type="radio" 
                          name="targetType"
                          value="EVENT_WINNER" 
                          checked={targetType === 'EVENT_WINNER'}
                          onChange={() => setTargetType('EVENT_WINNER')}
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="ml-2">Event Winners</span>
                      </label>
                    </div>
                  </div>
                  
                  {(targetType === 'EVENT_PARTICIPANT' || targetType === 'EVENT_WINNER') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Select Event</label>
                      <select
                        value={eventId || ''}
                        onChange={(e) => setEventId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled={isLoading}
                      >
                        <option value="">-- Select an Event --</option>
                        {events.map(event => (
                          <option key={event.id} value={event.id}>{event.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  
                  {targetType === 'EVENT_WINNER' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Winner Range Start</label>
                        <input
                          type="number"
                          min="1"
                          value={winnerRangeStart || ''}
                          onChange={(e) => setWinnerRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 1 for 1st place"
                          disabled={isLoading}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Winner Range End</label>
                        <input
                          type="number"
                          min="1"
                          value={winnerRangeEnd || ''}
                          onChange={(e) => setWinnerRangeEnd(e.target.value ? parseInt(e.target.value) : null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., 3 for 3rd place"
                          disabled={isLoading}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-1">Certificate will be available for:</h4>
                    <p className="text-sm text-blue-700">
                      {targetType === 'GENERAL' && 'All participants in the system'}
                      {targetType === 'EVENT_PARTICIPANT' && eventId && `Participants of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
                      {targetType === 'EVENT_PARTICIPANT' && !eventId && 'Participants of selected event (please select an event)'}
                      {targetType === 'EVENT_WINNER' && eventId && winnerRangeStart && winnerRangeEnd && 
                        `Winners (ranks ${winnerRangeStart}-${winnerRangeEnd}) of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
                      {targetType === 'EVENT_WINNER' && (!eventId || !winnerRangeStart || !winnerRangeEnd) && 
                        'Event winners (please complete all fields)'}
                    </p>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-5 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4">Template Configuration</h2>
        
          {/* Template Name */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter template name"
              disabled={isLoading}
              required
            />
          </div>
          
          {/* Paper Size Selector - Collapsible */}
          <div className="mb-4">
            <CollapsibleSection title="Certificate Size">
              <PaperSizeSelector 
                currentSize={{ width: paperSize.width, height: paperSize.height }} 
                onSizeChange={(newSize) => {
                  setPaperSize(newSize);
                  setSuccess(`Paper size changed to ${newSize.name} (${newSize.width}×${newSize.height})`);
                  setTimeout(() => setSuccess(null), 1500);
                }} 
              />
              <p className="text-xs text-gray-500 mt-1">
                Choose the appropriate size for your certificate. This affects canvas dimensions and element positioning.
              </p>
            </CollapsibleSection>
          </div>
          
          {/* PDF Calibration Settings - Collapsible */}
          <div className="mb-4">
            <CollapsibleSection title="PDF Calibration Settings">
              <CalibrationControls
                calibration={calibration}
                onCalibrationChange={(newCalibration) => {
                  setCalibration(newCalibration);
                  setSuccess('Calibration settings updated');
                  setTimeout(() => setSuccess(null), 1500);
                }}
              />
            </CollapsibleSection>
          </div>
        
          {/* Target Audience Configuration - Collapsible */}
          <div className="mb-4">
            <CollapsibleSection title="Target Audience">
              <div className="space-y-3">
                {/* Target Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Certificate Type
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="targetType"
                        value="GENERAL" 
                        checked={targetType === 'GENERAL'}
                        onChange={() => setTargetType('GENERAL')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">General Participants</span>
                    </label>
                
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="targetType"
                        value="EVENT_PARTICIPANT" 
                        checked={targetType === 'EVENT_PARTICIPANT'}
                        onChange={() => setTargetType('EVENT_PARTICIPANT')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Event Participants</span>
                    </label>
                    
                    <label className="inline-flex items-center">
                      <input 
                        type="radio" 
                        name="targetType"
                        value="EVENT_WINNER" 
                        checked={targetType === 'EVENT_WINNER'}
                        onChange={() => setTargetType('EVENT_WINNER')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Event Winners</span>
                    </label>
                  </div>
                </div>
                
                {/* Event Selection (for EVENT_PARTICIPANT and EVENT_WINNER) */}
                {(targetType === 'EVENT_PARTICIPANT' || targetType === 'EVENT_WINNER') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Event
                    </label>
                    <select
                      value={eventId || ''}
                      onChange={(e) => setEventId(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      disabled={isLoading}
                    >
                      <option value="">-- Select an Event --</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {/* Winner Range (only for EVENT_WINNER) */}
                {targetType === 'EVENT_WINNER' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Winner Range Start
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={winnerRangeStart || ''}
                        onChange={(e) => setWinnerRangeStart(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 1 for 1st place"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Winner Range End
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={winnerRangeEnd || ''}
                        onChange={(e) => setWinnerRangeEnd(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 3 for 3rd place"
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}
            
                {/* Target Audience Summary */}
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-md">
                  <h4 className="text-sm font-medium text-blue-800 mb-1">Certificate will be available for:</h4>
                  <p className="text-sm text-blue-700">
                    {targetType === 'GENERAL' && 'All participants in the system'}
                    {targetType === 'EVENT_PARTICIPANT' && eventId && `Participants of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
                    {targetType === 'EVENT_PARTICIPANT' && !eventId && 'Participants of selected event (please select an event)'}
                    {targetType === 'EVENT_WINNER' && eventId && winnerRangeStart && winnerRangeEnd && 
                      `Winners (ranks ${winnerRangeStart}-${winnerRangeEnd}) of ${events.find(e => e.id === eventId)?.name || 'selected event'}`}
                    {targetType === 'EVENT_WINNER' && (!eventId || !winnerRangeStart || !winnerRangeEnd) && 
                      'Event winners (please complete all fields)'}
                  </p>
                </div>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      )}
      
      
      {/* PDF Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isNew ? 'Upload PDF Template' : 'Replace PDF Template (Optional)'}
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
          <div className="space-y-1 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <div className="flex text-sm text-gray-600">
              <label
                htmlFor="file-upload"
                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
              >
                <span>{isNew ? 'Upload a PDF file' : 'Replace PDF'}</span>
                <input
                  id="file-upload"
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,application/pdf"
                  onChange={handlePdfUpload}
                  disabled={isLoading}
                />
              </label>
              <p className="pl-1">or drag and drop</p>
            </div>
            <p className="text-xs text-gray-500">PDF up to 10MB</p>
          </div>
        </div>
      </div>
      
      {/* PDF Preview & Editor */}
      {pdfUrl && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-100 p-2 border-b flex justify-between items-center">
            <h3 className="font-medium px-1">Template Designer</h3>
            <div className="flex space-x-2 items-center">
{/* Preview button */}
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="mr-2 w-9 h-9 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center justify-center tooltip-container"
                title="Preview Certificate"
                disabled={elements.length === 0 || !pdfUrl}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="tooltip">Preview Certificate</span>
              </button>
              
              {/* Debug toggle button */}
              <button
                type="button"
                onClick={() => setDebugMode(!debugMode)}
                className={`mr-2 w-9 h-9 ${debugMode ? 'bg-yellow-500' : 'bg-gray-500'} text-white rounded hover:bg-yellow-600 flex items-center justify-center tooltip-container`}
                title="Toggle Debug Mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="tooltip">Debug Mode {debugMode ? 'ON' : 'OFF'}</span>
              </button>
              
              {/* Fullscreen toggle button */}
              <button
                type="button"
                onClick={() => setIsFullPage(!isFullPage)}
                className={`mr-2 w-9 h-9 ${isFullPage ? 'bg-indigo-600' : 'bg-blue-500'} text-white rounded hover:bg-indigo-700 flex items-center justify-center tooltip-container`}
                title="Toggle Full Page Mode"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isFullPage ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4H4v5M9 15v5H4v-5M15 9h5V4h-5M15 15h5v5h-5" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  )}
                </svg>
                <span className="tooltip">{isFullPage ? 'Exit Fullscreen Editor (F11 or Ctrl+Shift+F)' : 'Enter Fullscreen Editor Mode (F11 or Ctrl+Shift+F)'}</span>
              </button>
{/* Element buttons */}
              <div className="flex items-center border border-gray-200 rounded-md bg-white divide-x divide-gray-200">
                <button
                  type="button"
                  onClick={() => handleAddElement('static_text')}
                  className="p-2 text-blue-700 hover:bg-blue-50 flex items-center justify-center tooltip-container"
                  title="Add Text"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v18m3-6h7m-10 0h3" />
                  </svg>
                  <span className="tooltip">Add Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('dynamic_text')}
                  className="p-2 text-green-700 hover:bg-green-50 flex items-center justify-center tooltip-container"
                  title="Add Dynamic Field"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <span className="tooltip">Add Dynamic Field</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddElement('image')}
                  className="p-2 text-purple-700 hover:bg-purple-50 flex items-center justify-center tooltip-container"
                  title="Add Image"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="tooltip">Add Image</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex">
            {/* Canvas Area with PDF Background */}
            <div className="flex-1 overflow-auto border-r" style={{ height: isFullPage ? '85vh' : '700px', width: isFullPage ? '100%' : 'auto' }}>
              <div className="p-4 min-h-full flex justify-center" style={{ width: isFullPage ? '100%' : 'auto' }}>
                <div className="relative mb-20" style={{ width: `${paperSize.width}px`, minHeight: `${paperSize.height}px` }}>
                  {/* Paper size indicator */}
                  <div className="absolute top-2 right-2 bg-white bg-opacity-80 px-2 py-1 text-xs text-gray-600 rounded shadow-sm">
                    {paperSize.name}: {paperSize.width} × {paperSize.height} pts
                  </div>
                  {/* PDF Frame */}
                  <div className="mb-4 border border-gray-300 shadow-sm w-full">
                    <iframe
                      src={`${pdfUrl.startsWith('/') ? `/uploads/templates/${pdfUrl.split('/').pop()}` : pdfUrl}#pagemode=none&sidebar=0&navpanes=0&scrollbar=0`}
                      className="w-full"
                      style={{ height: `${paperSize.height}px`, width: '100%' }}
                      title="PDF Template"
                    />
                  </div>
                  
                  {/* Canvas for Elements */}
                  <div 
                    ref={canvasRef}
                    className="absolute top-0 left-0 right-0 bottom-0"
                    onClick={handleCanvasClick}
                    style={{ height: `${paperSize.height}px` }}
                  >
                    {elements.map(element => (
                      <div
                        key={element.id}
                        className={`absolute cursor-move ${selectedElement?.id === element.id ? 'ring-2 ring-blue-500' : ''}`}
                        style={{
                          left: `${element.position.x}px`,
                          top: `${element.position.y}px`,
                          zIndex: element.layer
                        }}
                        onClick={(e) => handleElementClick(element, e)}
                        onMouseDown={(e) => handleDragStart(e, element)}
                      >
                        {element.type === 'static_text' && (
                          <div 
                            style={{
                              fontFamily: element.style?.font_family || 'Arial',
                              fontSize: `${parseFloat(element.style?.font_size) || 16}px`,
                              fontWeight: element.style?.font_weight || 'normal',
                              color: element.style?.color || '#000000',
                              textAlign: element.style?.align || 'left',
                              position: 'relative',
                              transform: element.text_anchor === 'middle' ? 'translateX(-50%)' : 
                                        element.text_anchor === 'end' ? 'translateX(-100%)' : 'none',
                              // Remove textAnchor from inline styles as it's causing type errors
                              // We're already handling alignment with the transform property
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {element.content}
                          </div>
                        )}
                        
                        {element.type === 'dynamic_text' && (
                          <div 
                            className="dynamic-field"
                            style={{
                              fontFamily: element.style?.font_family || 'Arial',
                              fontSize: `${parseFloat(element.style?.font_size) || 16}px`,
                              fontWeight: element.style?.font_weight || 'normal',
                              textAlign: element.style?.align || 'left',
                              position: 'relative',
                              transform: element.text_anchor === 'middle' ? 'translateX(-50%)' : 
                                        element.text_anchor === 'end' ? 'translateX(-100%)' : 'none',
                              // Remove textAnchor from inline styles as it's causing type errors
                              // We're already handling alignment with the transform property
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {element.prefix && (
                              <span style={{ color: element.style?.color || '#000000' }}>
                                {element.prefix}
                              </span>
                            )}
                            <span className="text-blue-600">
                              {element.placeholder}
                            </span>
                          </div>
                        )}
                        
                        {element.type === 'image' && (
                          <div className="w-24 h-24 bg-gray-200 flex items-center justify-center border border-dashed border-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Show Properties Button (only in fullscreen when panel is hidden) */}
            {isFullPage && !showPropertiesPanel && (
              <div className="fixed top-20 right-4 z-10">
                <button
                  onClick={() => setShowPropertiesPanel(true)}
                  className="bg-white p-2 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 tooltip-container"
                  title="Show Properties Panel"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <span className="tooltip">Show Properties Panel</span>
                </button>
              </div>
            )}
            
            {/* Properties Panel */}
            {(!isFullPage || (isFullPage && showPropertiesPanel)) && (
              <div className={`${isFullPage ? 'fixed top-20 right-4 z-10 shadow-lg rounded-lg border border-gray-200' : ''} w-80 bg-gray-50 p-4 overflow-y-auto`} 
                style={{ maxHeight: isFullPage ? '80vh' : '700px' }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Properties</h3>
                  {isFullPage && (
                    <button
                      onClick={() => setShowPropertiesPanel(false)}
                      className="text-gray-500 hover:text-gray-700 tooltip-container"
                      title="Hide Properties Panel"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="tooltip">Hide Properties</span>
                    </button>
                  )}
                </div>
              
              {selectedElement ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Element Type
                    </label>
                    <div className="text-sm font-mono bg-gray-100 p-2 rounded">
                      {selectedElement.type}
                    </div>
                  </div>
                  
                  {/* Text Content (for static text) */}
                  {selectedElement.type === 'static_text' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Text Content
                      </label>
                      <textarea
                        value={selectedElement.content}
                        onChange={(e) => updateElementProperty('content', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                    </div>
                  )}
                  
                  {/* Dynamic Text Properties */}
                  {selectedElement.type === 'dynamic_text' && (
                    <>
                      {/* Prefix Text */}
                      <div className="mb-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Prefix Text
                        </label>
                        <input
                          type="text"
                          value={selectedElement.prefix || ''}
                          onChange={(e) => updateElementProperty('prefix', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="Add prefix text (e.g., 'Name: ')"
                        />
                      </div>

                      {/* Placeholder */}
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Placeholder
                        </label>
                        <select
                          value={selectedElement.placeholder}
                          onChange={(e) => updateElementProperty('placeholder', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="{{recipient_name}}">Recipient Name</option>
                          <option value="{{recipient_email}}">Recipient Email</option>
                          <option value="{{award_title}}">Award Title</option>
                          <option value="{{contest_name}}">Contest Name</option>
                          <option value="{{contingent_name}}">Contingent Name</option>
                          <option value="{{team_name}}">Team Name</option>
                          <option value="{{ic_number}}">IC Number</option>
                          <option value="{{issue_date}}">Issue Date</option>
                          <option value="{{unique_code}}">Unique Code</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  {/* Position */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        X Position
                      </label>
                      <input
                        type="number"
                        value={selectedElement.position.x}
                        onChange={(e) => updateElementProperty('position', { 
                          ...selectedElement.position, 
                          x: parseFloat(e.target.value) || 0 
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Y Position
                      </label>
                      <input
                        type="number"
                        value={selectedElement.position.y}
                        onChange={(e) => updateElementProperty('position', { 
                          ...selectedElement.position, 
                          y: parseFloat(e.target.value) || 0 
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>

                  {/* Alignment Buttons */}
                  <div className="mt-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Alignment
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-md bg-white divide-x divide-gray-200">
                      <button
                        type="button"
                        onClick={() => centerElementHorizontally()}
                        className="p-2 text-blue-700 hover:bg-blue-50 flex-1 flex items-center justify-center tooltip-container"
                        title="Center Horizontally"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18" />
                        </svg>
                        <span className="tooltip">Center Horizontally</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => centerElementVertically()}
                        className="p-2 text-blue-700 hover:bg-blue-50 flex-1 flex items-center justify-center tooltip-container"
                        title="Center Vertically"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18" />
                        </svg>
                        <span className="tooltip">Center Vertically</span>
                      </button>
                      <button
                        type="button"
                        onClick={centerElementBoth}
                        className="p-2 text-indigo-700 hover:bg-indigo-50 flex-1 flex items-center justify-center tooltip-container"
                        title="Center Both"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v18" />
                        </svg>
                        <span className="tooltip">Center Both</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Text Anchor Controls */}
                  {(selectedElement.type === 'static_text' || selectedElement.type === 'dynamic_text') && (
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Text Anchor
                      </label>
                      <div className="flex items-center border border-gray-200 rounded-md bg-white divide-x divide-gray-200">
                        <button
                          type="button"
                          onClick={() => updateElementProperty('text_anchor', 'start')}
                          className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Left alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "start" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}
                          title="Align Left"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                          </svg>
                          <span className="tooltip">Left</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProperty('text_anchor', 'middle')}
                          className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Center alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "middle" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}
                          title="Align Center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M6 12h12M4 18h16" />
                          </svg>
                          <span className="tooltip">Center</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElementProperty('text_anchor', 'end')}
                          className={`p-2 flex-1 flex items-center justify-center tooltip-container ${(() => { console.log("Right alignment button, selectedElement.text_anchor:", selectedElement?.text_anchor); return selectedElement.text_anchor === "end" ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"; })()}`}
                          title="Align Right"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M4 18h16" />
                          </svg>
                          <span className="tooltip">Right</span>
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Text Style Options */}
                  {(selectedElement.type === 'static_text' || selectedElement.type === 'dynamic_text') && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Font Family
                        </label>
                        <select
                          value={selectedElement.style?.font_family || 'Arial'}
                          onChange={(e) => updateElementProperty('style.font_family', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="Arial">Arial</option>
                          <option value="Helvetica">Helvetica</option>
                          <option value="Times New Roman">Times New Roman</option>
                          <option value="Georgia">Georgia</option>
                          <option value="Verdana">Verdana</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Font Size: {selectedElement.style?.font_size || 16}px
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="range"
                            value={selectedElement.style?.font_size || 16}
                            onChange={(e) => updateElementProperty('style.font_size', parseFloat(e.target.value) || 16)}
                            className="w-full"
                            min={8}
                            max={72}
                            step={0.5}
                          />
                          <input
                            type="number"
                            value={selectedElement.style?.font_size || 16}
                            onChange={(e) => updateElementProperty('style.font_size', parseFloat(e.target.value) || 16)}
                            className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm"
                            min={8}
                            max={72}
                            step={0.5}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Font Weight
                        </label>
                        <select
                          value={selectedElement.style?.font_weight || 'normal'}
                          onChange={(e) => updateElementProperty('style.font_weight', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="normal">Normal</option>
                          <option value="bold">Bold</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Text Color
                        </label>
                        <input
                          type="color"
                          value={selectedElement.style?.color || '#000000'}
                          onChange={(e) => updateElementProperty('style.color', e.target.value)}
                          className="w-full h-8 px-2 py-1 border border-gray-300 rounded-md"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Text Alignment
                        </label>
                        <select
                          value={selectedElement.style?.align || 'left'}
                          onChange={(e) => updateElementProperty('style.align', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="left">Left</option>
                          <option value="center">Center</option>
                          <option value="right">Right</option>
                        </select>
                      </div>
                    </>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Layer
                    </label>
                    <input
                      type="number"
                      value={selectedElement.layer}
                      onChange={(e) => updateElementProperty('layer', parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      min={1}
                    />
                  </div>
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={deleteSelectedElement}
                      className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-md hover:bg-red-100 text-sm"
                    >
                      Delete Element
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500 py-8 text-center">
                  <p>Select an element to edit its properties</p>
                  <p className="mt-2 text-xs">or add a new element using the buttons above</p>
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md bg-white text-gray-700 hover:bg-gray-50"
          disabled={isLoading}
        >
          Cancel
        </button>
        
        <button
          type="button"
          onClick={handleSaveTemplate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            `${isNew ? 'Create' : 'Update'} Template`
          )}
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          isOpen={showPreview}
          elements={elements}
          pdfUrl={pdfUrl}
          onClose={() => setShowPreview(false)}
          mockupData={mockupData}
          onUpdateMockupData={setMockupData}
          contests={contests}
          paperSize={paperSize}
          calibration={calibration}
        />
      )}
      
      {/* Debug Panel */}
      {debugMode && (
        <DebugPanel 
          elements={elements}
          selectedElementId={selectedElement?.id || null}
        />
      )}
      </div>
    </div>
  )
}
