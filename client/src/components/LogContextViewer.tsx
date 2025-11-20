import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";

type Props = {
  context: string | null;
};

export function LogContextViewer({ context }: Props) {
  if (!context) return null;

  let formatted = context;
  try {
    formatted = JSON.stringify(JSON.parse(context), null, 2);
  } catch {
    // keep raw
  }

  return (
    <div className="mt-2 rounded-lg bg-slate-900 border border-slate-800">
      <SyntaxHighlighter language="json" style={atomDark} customStyle={{ margin: 0 }}>
        {formatted}
      </SyntaxHighlighter>
    </div>
  );
}
