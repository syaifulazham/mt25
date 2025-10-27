// Certificate Management Interface Types

// Template Query Parameters
export interface TemplateQueryParams {
  search?: string | null;
  status?: string | null;
  targetType?: string | null;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

// Template Create Parameters
export interface TemplateCreateParams {
  templateName: string;
  basePdfPath?: string;
  configuration: TemplateConfiguration;
  status?: string;
  createdBy: number;
}

// Template Update Parameters
export interface TemplateUpdateParams {
  templateName?: string;
  basePdfPath?: string;
  configuration?: TemplateConfiguration;
  status?: string;
  updatedBy: number;
}

// Template Canvas Configuration
export interface TemplateConfiguration {
  canvas: {
    width: number;
    height: number;
    scale?: number;
  };
  background?: {
    pdf_path?: string;
    page?: number;
  };
  elements: TemplateElement[];
}

// Template Element Types
export type TemplateElement = 
  | StaticTextElement
  | DynamicTextElement
  | ImageElement
  | ShapeElement;

// Base Element Interface
interface BaseElement {
  id: string;
  type: string;
  position: { x: number; y: number };
  layer: number;
  rotation?: number;
}

// Static Text Element
export interface StaticTextElement extends BaseElement {
  type: 'static_text';
  content: string;
  style: TextStyle;
}

// Dynamic Text Element
export interface DynamicTextElement extends BaseElement {
  type: 'dynamic_text';
  placeholder: string;
  fieldName: string;
  defaultValue?: string;
  style: TextStyle;
}

// Image Element
export interface ImageElement extends BaseElement {
  type: 'image';
  source: string | null;
  width: number;
  height: number;
  placeholder?: string;
  fieldName?: string;
}

// Shape Element
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType: 'rectangle' | 'circle' | 'line';
  width: number;
  height: number;
  style: ShapeStyle;
}

// Style Interfaces
export interface TextStyle {
  font_family: string;
  font_size: number;
  font_weight?: string;
  color: string;
  align?: 'left' | 'center' | 'right';
  max_width?: number;
  line_height?: number;
}

export interface ShapeStyle {
  fill_color?: string;
  stroke_color?: string;
  stroke_width?: number;
}

// Certificate Creation Parameters
export interface CertificateCreateParams {
  templateId: number;
  recipientName: string;
  recipientEmail?: string;
  recipientType: 'PARTICIPANT' | 'CONTESTANT' | 'JUDGE' | 'ORGANIZER';
  contestName?: string;
  awardTitle?: string;
  uniqueCode: string;
  filePath?: string;
  status?: string;
  issuedAt?: Date;
  createdBy: number;
}

// Certificate Query Parameters
export interface CertificateQueryParams {
  search?: string | null;
  templateId?: number;
  recipientType?: string | null;
  status?: string | null;
  targetType?: string | null;
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}
