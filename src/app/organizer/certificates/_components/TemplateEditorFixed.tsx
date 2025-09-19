'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Session } from 'next-auth'
import { useRouter } from 'next/navigation'

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
  placeholder?: string
  style?: any
  layer: number
  isSelected?: boolean
}

export function TemplateEditor({ template, session, isNew = false }: TemplateEditorProps) {
  const router = useRouter()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(template?.basePdfPath || null)
  const [elements, setElements] = useState<Element[]>(template?.configuration?.elements || [])
  const [templateName, setTemplateName] = useState(template?.templateName || 'New Template')
  const [selectedElement, setSelectedElement] = useState<Element | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
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
    const newElement: Element = {
      id: newId,
      type,
      position: { x: 100, y: 100 },
      layer: elements.length + 1,
      ...(type === 'static_text' && { content: 'Sample Text' }),
      ...(type === 'dynamic_text' && { placeholder: '{{recipient_name}}' }),
      ...(type === 'static_text' || type === 'dynamic_text') && {
        style: {
          font_family: 'Arial',
          font_size: 16,
          color: '#000000',
          font_weight: 'normal',
          align: 'left'
        }
      }
    }
    
    setElements([...elements, newElement])
    setSelectedElement(newElement)
  }
  
  // Handle clicking on an element
  const handleElementClick = (element: Element, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedElement(element)
  }
  
  // Handle clicking on the canvas (deselect elements)
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
      
      const templateData = {
        templateName,
        basePdfPath: pdfUrl,
        configuration: {
          canvas: {
            width: 842, // A4 width in points
            height: 595, // A4 height in points
            scale: 1.0
          },
          background: {
            pdf_path: pdfUrl,
            page: 1
          },
          elements
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
  
  return (
    <div className="space-y-6">
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
      
      {/* Template Name */}
      <div>
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
          <div className="bg-gray-100 p-3 border-b flex justify-between items-center">
            <h3 className="font-medium">Template Designer</h3>
            <div className="space-x-2">
              <button
                type="button"
                onClick={() => handleAddElement('static_text')}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200"
              >
                Add Text
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('dynamic_text')}
                className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200"
              >
                Add Dynamic Field
              </button>
              <button
                type="button"
                onClick={() => handleAddElement('image')}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200"
              >
                Add Image
              </button>
            </div>
          </div>
          
          <div className="flex">
            {/* Canvas Area with PDF Background */}
            <div className="flex-1 overflow-auto border-r" style={{ height: '700px' }}>
              <div className="p-4 min-h-full flex justify-center">
                <div className="relative mb-20" style={{ width: '794px', minHeight: '1123px' }}>
                  {/* PDF Frame */}
                  <div className="mb-4 border border-gray-300 shadow-sm">
                    <iframe
                      src={pdfUrl.startsWith('/') ? `/uploads/templates/${pdfUrl.split('/').pop()}` : pdfUrl}
                      className="w-full"
                      style={{ height: '1123px' }}
                      title="PDF Template"
                    />
                  </div>
                  
                  {/* Canvas for Elements */}
                  <div 
                    ref={canvasRef}
                    className="absolute top-0 left-0 right-0 bottom-0"
                    onClick={handleCanvasClick}
                    style={{ height: '1123px' }}
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
                              fontSize: `${element.style?.font_size || 16}px`,
                              fontWeight: element.style?.font_weight || 'normal',
                              color: element.style?.color || '#000000',
                              textAlign: element.style?.align || 'left'
                            }}
                          >
                            {element.content}
                          </div>
                        )}
                        
                        {element.type === 'dynamic_text' && (
                          <div 
                            className="text-blue-600"
                            style={{
                              fontFamily: element.style?.font_family || 'Arial',
                              fontSize: `${element.style?.font_size || 16}px`,
                              fontWeight: element.style?.font_weight || 'normal',
                              color: element.style?.color || '#000000',
                              textAlign: element.style?.align || 'left'
                            }}
                          >
                            {element.placeholder}
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
            
            {/* Properties Panel */}
            <div className="w-80 bg-gray-50 p-4 overflow-y-auto" style={{ maxHeight: '700px' }}>
              <h3 className="font-medium mb-4">Properties</h3>
              
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
                  
                  {/* Placeholder (for dynamic text) */}
                  {selectedElement.type === 'dynamic_text' && (
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
                        <option value="{{issue_date}}">Issue Date</option>
                        <option value="{{unique_code}}">Unique Code</option>
                      </select>
                    </div>
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
                          x: parseInt(e.target.value) || 0 
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
                          y: parseInt(e.target.value) || 0 
                        })}
                        className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  
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
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={selectedElement.style?.font_size || 16}
                          onChange={(e) => updateElementProperty('style.font_size', parseInt(e.target.value) || 16)}
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          min={8}
                          max={72}
                        />
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
    </div>
  )
}
