declare module 'cfonts' {
  interface CfontsOptions {
    font?: string;
    align?: 'left' | 'center' | 'right';
    colors?: string[] | false;
    backgroundColor?: string;
    letterSpacing?: number;
    lineHeight?: number;
    space?: boolean;
    maxLength?: string;
    gradient?: boolean | string[];
    independentGradient?: boolean;
    transitionGradient?: boolean;
    env?: 'node' | 'browser';
  }

  interface CfontsRenderResult {
    string: string;
    array: string[];
    lines: number;
    options: CfontsOptions;
  }

  interface Cfonts {
    render(text: string, options?: CfontsOptions): CfontsRenderResult;
    say(text: string, options?: CfontsOptions): CfontsRenderResult;
  }

  const cfonts: Cfonts;
  export default cfonts;
}
