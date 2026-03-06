import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import fromHighlighter from "@shikijs/rehype/core";
import { createHighlighterCoreSync } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import type { PluggableList } from "unified";
import type { Components } from "react-markdown";
import { resolveImageUrl } from "@/lib/upload-image";

import langPython from "shiki/dist/langs/python.mjs";
import langJavascript from "shiki/dist/langs/javascript.mjs";
import langTypescript from "shiki/dist/langs/typescript.mjs";
import langJava from "shiki/dist/langs/java.mjs";
import langCpp from "shiki/dist/langs/cpp.mjs";
import langC from "shiki/dist/langs/c.mjs";
import langGo from "shiki/dist/langs/go.mjs";
import langRust from "shiki/dist/langs/rust.mjs";
import langSql from "shiki/dist/langs/sql.mjs";
import langBash from "shiki/dist/langs/bash.mjs";
import langJson from "shiki/dist/langs/json.mjs";
import langHtml from "shiki/dist/langs/html.mjs";
import langCss from "shiki/dist/langs/css.mjs";

import themeGithubLight from "shiki/dist/themes/github-light.mjs";
import themeGithubDark from "shiki/dist/themes/github-dark.mjs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const highlighter = createHighlighterCoreSync({
  themes: [themeGithubLight, themeGithubDark],
  langs: [
    langPython,
    langJavascript,
    langTypescript,
    langJava,
    langCpp,
    langC,
    langGo,
    langRust,
    langSql,
    langBash,
    langJson,
    langHtml,
    langCss,
  ],
  engine: createJavaScriptRegexEngine(),
});

const shikiTransformer = fromHighlighter(highlighter as never, {
  themes: { light: "github-light", dark: "github-dark" },
  defaultColor: false,
});

const rehypeShikiPlugin = () => shikiTransformer;
const rehypePlugins: PluggableList = [rehypeShikiPlugin as never];

const components: Components = {
  img: ({ src, alt, ...props }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? resolveImageUrl(src) : undefined} alt={alt ?? "image"} {...props} />
  ),
  code: ({ className, children, ...props }) => {
    // If className contains "language-", it's a code block handled by Shiki (inside <pre>)
    if (className && /language-/.test(className)) {
      return <code className={className} {...props}>{children}</code>;
    }
    // Inline code — apply font-mono directly
    return <code className="font-mono" {...props}>{children}</code>;
  },
};

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={rehypePlugins} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
