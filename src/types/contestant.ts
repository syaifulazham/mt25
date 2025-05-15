export interface Contestant {
  id: number;
  name: string;
  ic: string;
  email?: string;
  phoneNumber?: string;
  gender: string;
  age: number;
  edu_level: string;
  class_name?: string;
  class_grade?: string;
  hashcode: string;
  contingentId: number;
  status: string;
  is_ppki: boolean;
  updatedBy?: string;
  createdAt?: string;
  updatedAt?: string;
  contingent?: {
    name: string;
    school?: {
      name: string;
    };
    higherInstitution?: {
      name: string;
    };
  };
}
