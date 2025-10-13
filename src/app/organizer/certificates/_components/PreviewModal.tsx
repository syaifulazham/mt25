import { useState, useRef } from 'react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { PdfBackgroundNote } from './pdf-note'

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  elements: any[];
  pdfUrl: string | null;
  mockupData: Record<string, string>;
  onUpdateMockupData: (newData: Record<string, string>) => void;
  contests: Array<{ id: number; name: string; code: string; displayName: string }>;
  paperSize?: { width: number; height: number; name?: string; };
  calibration?: { 
    scaleX: number;
    scaleY: number;
    offsetY: number;
    baselineRatio: number;
  };
}

export function PreviewModal({
  isOpen,
  onClose,
  elements,
  pdfUrl,
  mockupData,
  onUpdateMockupData,
  contests,
  paperSize = { width: 842, height: 595, name: 'A4 Landscape' }, // Default to A4 Landscape
  calibration = { scaleX: 0.98, scaleY: 0.98, offsetY: -20, baselineRatio: 0.35 } // Default calibration
}: PreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'mockup'>('preview')
  const [isDownloading, setIsDownloading] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)
  const certificatePreviewRef = useRef<HTMLDivElement>(null)

  if (!isOpen) return null

  // Function to replace dynamic placeholders with mockup data
  const replacePlaceholder = (placeholder: string): string => {
    const key = placeholder.replace(/{{|}}/g, '')
    return mockupData[key] || placeholder
  }

  // Handle input changes for mockup data
  const handleInputChange = (key: string, value: string) => {
    onUpdateMockupData({
      ...mockupData,
      [key]: value
    })
  }
  
  // Function to download the certificate as PDF with background (server-side generation)
  const downloadSamplePdf = async () => {
    if (!certificatePreviewRef.current) return
    
    try {
      setIsDownloading(true)
      
      // Use server-side generation to include the PDF background
      console.log('Using server-side PDF generation with background...')
      
      // Prepare the data to send to the API
      const requestData = {
        elements,
        pdfUrl,
        mockupData,
        paperSize,
        calibration
      }
      
      console.log('Sending request to generate-sample API:', requestData)
      
      // Call the server API to generate the PDF
      const response = await fetch('/api/certificates/generate-sample', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })
      
      // Check if the request was successful
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Server returned ${response.status}`)
      }
      
      // Get the PDF data from the response
      const data = await response.json()
      
      // The PDF is returned as a base64 encoded string
      const { pdf: base64Pdf, filename } = data
      
      // Convert base64 to blob
      const binaryPdf = atob(base64Pdf)
      const arrayBuffer = new ArrayBuffer(binaryPdf.length)
      const uint8Array = new Uint8Array(arrayBuffer)
      for (let i = 0; i < binaryPdf.length; i++) {
        uint8Array[i] = binaryPdf.charCodeAt(i)
      }
      const pdfBlob = new Blob([uint8Array], { type: 'application/pdf' })
      
      // Create a download link and trigger the download
      const downloadLink = document.createElement('a')
      downloadLink.href = URL.createObjectURL(pdfBlob)
      downloadLink.download = filename || `certificate-sample-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      
      console.log('Server-side PDF generation completed successfully')
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Handle the TypeScript error about unknown type
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert('Failed to generate PDF: ' + errorMessage)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className={`bg-white rounded-lg shadow-xl ${isMaximized ? 'w-[99vw] h-[99vh]' : 'w-[95vw] max-w-7xl h-[90vh]'} flex flex-col`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold">Certificate Preview</h2>
          <div className="flex items-center space-x-4">
            {/* Tabs */}
            <div className="border rounded-md flex">
              <button
                className={`px-4 py-2 text-sm ${
                  activeTab === 'preview'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
              <button
                className={`px-4 py-2 text-sm ${
                  activeTab === 'mockup'
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setActiveTab('mockup')}
              >
                Mockup Data
              </button>
            </div>
            
            {/* Maximize/Minimize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="text-gray-500 hover:text-gray-700"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMaximized ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4H4v5M9 15v5H4v-5M15 9h5V4h-5M15 15h5v5h-5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                )}
              </svg>
            </button>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'preview' ? (
            // Preview tab content
            <div className={`h-full ${isMaximized ? 'p-2' : 'p-4'} flex justify-center overflow-auto`}>
              <div ref={certificatePreviewRef} className="relative bg-white" 
                style={{
                  width: `${paperSize.width}px`, 
                  minHeight: `${paperSize.height}px`,
                  transform: isMaximized ? 'scale(1.2)' : 'none',
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease'
                }}>
                {/* PDF Background */}
                {pdfUrl && (
                  <iframe
                    src={`${pdfUrl}#pagemode=none&sidebar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: 'none', width: '100%' }}
                  />
                )}

                {/* Preview Elements */}
                {elements.map((element) => (
                  <div
                    key={element.id}
                    className="absolute"
                    style={{
                      left: `${element.position.x}px`,
                      top: `${element.position.y}px`,
                      zIndex: element.layer
                    }}
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
                          textAnchor: element.text_anchor || 'start',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {element.content}
                      </div>
                    )}

                    {element.type === 'dynamic_text' && (
                      <div
                        style={{
                          fontFamily: element.style?.font_family || 'Arial',
                          fontSize: `${parseFloat(element.style?.font_size) || 16}px`,
                          fontWeight: element.style?.font_weight || 'normal',
                          textAlign: element.style?.align || 'left',
                          position: 'relative',
                          transform: element.text_anchor === 'middle' ? 'translateX(-50%)' : 
                                    element.text_anchor === 'end' ? 'translateX(-100%)' : 'none',
                          textAnchor: element.text_anchor || 'start',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {element.prefix && (
                          <span style={{ color: element.style?.color || '#000000' }}>
                            {element.prefix}
                          </span>
                        )}
                        <span style={{ color: element.style?.color || '#000000' }}>
                          {replacePlaceholder(element.placeholder || '')}
                        </span>
                      </div>
                    )}

                    {element.type === 'image' && (
                      <div className="w-24 h-24 bg-gray-200 flex items-center justify-center border border-dashed border-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-6 w-6 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Mockup Data tab content
            <div className="p-6 bg-gray-50 h-full overflow-auto">
              <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">
                  Edit Mockup Data for Dynamic Fields
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={mockupData.recipient_name}
                      onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      value={mockupData.recipient_email}
                      onChange={(e) => handleInputChange('recipient_email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Award Title
                    </label>
                    <input
                      type="text"
                      value={mockupData.award_title}
                      onChange={(e) => handleInputChange('award_title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contingent Name
                    </label>
                    <input
                      type="text"
                      value={mockupData.contingent_name}
                      onChange={(e) => handleInputChange('contingent_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Team Name
                    </label>
                    <input
                      type="text"
                      value={mockupData.team_name}
                      onChange={(e) => handleInputChange('team_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      IC Number
                    </label>
                    <input
                      type="text"
                      value={mockupData.ic_number}
                      onChange={(e) => handleInputChange('ic_number', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contest Name
                    </label>
                    <select
                      value={mockupData.contest_name}
                      onChange={(e) => handleInputChange('contest_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {contests.length > 0 ? (
                        contests.map(contest => (
                          <option key={contest.id} value={contest.displayName}>
                            {contest.displayName}
                          </option>
                        ))
                      ) : (
                        <option value="Loading contests...">Loading contests...</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Issue Date
                    </label>
                    <input
                      type="text"
                      value={mockupData.issue_date}
                      onChange={(e) => handleInputChange('issue_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unique Code
                    </label>
                    <input
                      type="text"
                      value={mockupData.unique_code}
                      onChange={(e) => handleInputChange('unique_code', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t">
          <div className="flex justify-between items-start">
            <div className="max-w-2xl">
              {activeTab === 'preview' && (
                <div className="flex flex-col space-y-2">
                  <PdfBackgroundNote />
                  <button
                    onClick={downloadSamplePdf}
                    disabled={isDownloading}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isDownloading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>Download Sample PDF</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
