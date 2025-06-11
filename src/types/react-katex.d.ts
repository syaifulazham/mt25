declare module 'react-katex' {
  import { FC, ReactNode } from 'react';
  
  interface MathProps {
    children?: ReactNode;
    math?: string;
    block?: boolean;
    errorColor?: string;
    renderError?: (error: Error) => ReactNode;
    settings?: Record<string, any>;
    as?: keyof JSX.IntrinsicElements | FC<any>;
  }
  
  export const InlineMath: FC<MathProps>;
  export const BlockMath: FC<MathProps>;
}
