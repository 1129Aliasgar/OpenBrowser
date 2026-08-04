import type { MDXComponents } from 'mdx/types';
import { Callout } from '@/components/callout';
import { CopyButton } from '@/components/copy-button';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    Callout,
    pre: ({ children, ...props }: any) => {
      // Extract the raw text from the code element to pass to CopyButton
      const raw = children?.props?.children;
      return (
        <div className="relative group">
          <pre {...props}>{children}</pre>
          {raw && (
            <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <CopyButton value={raw} />
            </div>
          )}
        </div>
      );
    },
  };
}
