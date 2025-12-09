'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface Template {
  id: number
  templateName: string
  targetType: string
}

interface ColumnMapping {
  recipientName: string
  recipientEmail: string
  contingentName: string
  icNumber: string
  teamName: string
  awardTitle: string
  additionalInfo: string
}

export default function BulkGenerateNonParticipantPage() {
  const router = useRouter()
  
  // State
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileData, setFileData] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    recipientName: '',
    recipientEmail: '',
    contingentName: '',
    icNumber: '',
    teamName: '',
    awardTitle: '',
    additionalInfo: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [processedCount, setProcessedCount] = useState(0)
  
  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates()
  }, [])
  
  const fetchTemplates = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/certificates/templates?status=ACTIVE&targetType=NON_CONTEST_PARTICIPANT&pageSize=1000')
      if (!response.ok) throw new Error('Failed to fetch templates')
      
      const data = await response.json()
      setTemplates(data.templates || [])
    } catch (err) {
      setError('Failed to load templates')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (!uploadedFile) return
    
    setFile(uploadedFile)
    setError(null)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
        
        if (jsonData.length === 0) {
          setError('File is empty')
          return
        }
        
        // First row is headers
        const headers = jsonData[0] as string[]
        setColumns(headers)
        
        // Rest are data rows
        const rows = jsonData.slice(1).map((row: any) => {
          const obj: any = {}
          headers.forEach((header, index) => {
            obj[header] = row[index] || ''
          })
          return obj
        })
        
        setFileData(rows)
        setSuccess(`File loaded: ${rows.length} records found`)
      } catch (err) {
        setError('Failed to parse file. Please ensure it\'s a valid Excel or CSV file.')
        console.error(err)
      }
    }
    
    if (uploadedFile.name.endsWith('.csv')) {
      reader.readAsText(uploadedFile)
    } else {
      reader.readAsBinaryString(uploadedFile)
    }
  }
  
  const handleSubmit = async () => {
    // Validation
    if (!selectedTemplateId) {
      setError('Please select a template')
      return
    }
    
    if (!file || fileData.length === 0) {
      setError('Please upload a file with data')
      return
    }
    
    if (!columnMapping.recipientName) {
      setError('Please map the Recipient Name column')
      return
    }
    
    setIsProcessing(true)
    setError(null)
    setSuccess(null)
    setProcessedCount(0)
    
    try {
      // Prepare data with mapped columns
      const certificates = fileData.map(row => ({
        recipientName: row[columnMapping.recipientName] || '',
        recipientEmail: columnMapping.recipientEmail ? row[columnMapping.recipientEmail] || null : null,
        contingentName: columnMapping.contingentName ? row[columnMapping.contingentName] || null : null,
        icNumber: columnMapping.icNumber ? row[columnMapping.icNumber] || null : null,
        teamName: columnMapping.teamName ? row[columnMapping.teamName] || null : null,
        awardTitle: columnMapping.awardTitle ? row[columnMapping.awardTitle] || null : null,
        additionalInfo: columnMapping.additionalInfo ? row[columnMapping.additionalInfo] || null : null,
      })).filter(cert => cert.recipientName.trim() !== '')
      
      if (certificates.length === 0) {
        setError('No valid records found. Please check your column mapping.')
        setIsProcessing(false)
        return
      }
      
      // Send to API
      const response = await fetch('/api/certificates/bulk-generate-nonparticipant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          certificates
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to process certificates')
      }
      
      const result = await response.json()
      setProcessedCount(result.created || 0)
      setSuccess(`Successfully created ${result.created} certificate records!`)
      
      // Reset form
      setFile(null)
      setFileData([])
      setColumns([])
      setColumnMapping({
        recipientName: '',
        recipientEmail: '',
        contingentName: '',
        icNumber: '',
        teamName: '',
        awardTitle: '',
        additionalInfo: ''
      })
      
      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process certificates')
      console.error(err)
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <Link href="/organizer/certificates">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Certificates
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900">Bulk Generate Non-Participant Certificates</h1>
        <p className="text-gray-600 mt-2">
          Upload a CSV or Excel file to create multiple certificate records at once
        </p>
      </div>
      
      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Success Alert */}
      {success && (
        <Alert className="mb-6 border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-6">
        {/* Step 1: Select Template */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">1</span>
              Select Certificate Template
            </CardTitle>
            <CardDescription>
              Choose a non-contest participant template for the certificates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No non-contest participant templates found. Please create one first.
              </div>
            ) : (
              <Select 
                value={selectedTemplateId?.toString()} 
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.templateName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>
        
        {/* Step 2: Upload File */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">2</span>
              Upload File
            </CardTitle>
            <CardDescription>
              Upload a CSV or Excel (.xlsx, .xls) file containing recipient data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-sm text-gray-600 mb-2">
                  {file ? (
                    <span className="text-blue-600 font-medium">{file.name}</span>
                  ) : (
                    <>Click to upload or drag and drop</>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  CSV, XLSX, or XLS (MAX. 10MB)
                </div>
                <input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
              </label>
              
              {fileData.length > 0 && (
                <div className="mt-4 text-sm text-green-600 font-medium">
                  ✓ {fileData.length} records loaded
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Step 3: Map Columns */}
        {columns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">3</span>
                Map Columns
              </CardTitle>
              <CardDescription>
                Map your file columns to certificate fields. Only Recipient Name is required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Recipient Name (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Name <span className="text-red-500">*</span>
                </label>
                <Select 
                  value={columnMapping.recipientName || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, recipientName: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Recipient Email (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email (Optional)
                </label>
                <Select 
                  value={columnMapping.recipientEmail || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, recipientEmail: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Contingent Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contingent/Organization Name (Optional)
                </label>
                <Select 
                  value={columnMapping.contingentName || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, contingentName: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* IC Number (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IC Number (Optional)
                </label>
                <Select 
                  value={columnMapping.icNumber || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, icNumber: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Team Name (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Team Name (Optional)
                </label>
                <Select 
                  value={columnMapping.teamName || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, teamName: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Award Title (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Award Title (Optional)
                </label>
                <Select 
                  value={columnMapping.awardTitle || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, awardTitle: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Additional Info (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Information (Optional)
                </label>
                <Select 
                  value={columnMapping.additionalInfo || '_none_'} 
                  onValueChange={(value) => setColumnMapping({...columnMapping, additionalInfo: value === '_none_' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">-- None --</SelectItem>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              </div>
              
              {/* Preview */}
              {fileData.length > 0 && columnMapping.recipientName && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Preview (First 3 Records)</h4>
                  <div className="space-y-2">
                    {fileData.slice(0, 3).map((row, index) => (
                      <div key={index} className="p-3 bg-white rounded border border-gray-200 text-sm">
                        <div className="font-medium text-gray-900">
                          {row[columnMapping.recipientName]}
                        </div>
                        {columnMapping.recipientEmail && row[columnMapping.recipientEmail] && (
                          <div className="text-gray-600">Email: {row[columnMapping.recipientEmail]}</div>
                        )}
                        {columnMapping.contingentName && row[columnMapping.contingentName] && (
                          <div className="text-gray-600">Contingent: {row[columnMapping.contingentName]}</div>
                        )}
                        {columnMapping.icNumber && row[columnMapping.icNumber] && (
                          <div className="text-gray-600">IC: {row[columnMapping.icNumber]}</div>
                        )}
                        {columnMapping.teamName && row[columnMapping.teamName] && (
                          <div className="text-gray-600">Team: {row[columnMapping.teamName]}</div>
                        )}
                        {columnMapping.awardTitle && row[columnMapping.awardTitle] && (
                          <div className="text-gray-600">Award: {row[columnMapping.awardTitle]}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        
        {/* Submit Button */}
        {columns.length > 0 && (
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => router.push('/organizer/certificates')}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!selectedTemplateId || !columnMapping.recipientName || isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create {fileData.length} Certificate{fileData.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
