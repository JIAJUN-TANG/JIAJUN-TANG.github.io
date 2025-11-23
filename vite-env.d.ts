/// <reference types="vite/client" />

// 声明图片文件类型，允许TypeScript识别图片导入
declare module '*.jpeg' {  
  const value: string;  
  export default value;  
}

declare module '*.jpg' {  
  const value: string;  
  export default value;  
}

declare module '*.png' {  
  const value: string;  
  export default value;  
}

declare module '*.gif' {  
  const value: string;  
  export default value;  
}

declare module '*.svg' {  
  const value: string;  
  export default value;  
}